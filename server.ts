import express from 'express';
import path from 'path';
import multer from 'multer';
import sqlite3 from 'sqlite3';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import fs from 'fs';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { google } from 'googleapis';
import { v2 as cloudinary } from 'cloudinary';
import { GoogleGenAI, Type } from '@google/genai';

// Initialize Gemini AI Client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Initialize Firebase Admin
let firebaseApp: any;
let firestore: any;
let firebaseConfig: any;

try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    if (!getApps().length) {
      const adminConfig: any = {
        projectId: firebaseConfig.projectId,
      };
      
      try {
        adminConfig.credential = applicationDefault();
      } catch (e) {
        console.warn('Could not initialize applicationDefault credentials, continuing without them:', e);
      }
      
      firebaseApp = initializeApp(adminConfig);
    } else {
      firebaseApp = getApps()[0];
    }

    if (firebaseConfig.firestoreDatabaseId) {
      firestore = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    } else {
      firestore = getFirestore(firebaseApp);
    }
  } else {
    console.error('firebase-applet-config.json not found');
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Ensure uploads directory exists
const uploadsDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Initialize SQLite Database
const db = new sqlite3.Database('/tmp/database.sqlite');

db.serialize(() => {
  // Media table for BLOB storage and local path
  db.run(`
    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      data BLOB,
      mimeType TEXT NOT NULL,
      filename TEXT NOT NULL,
      localPath TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Posts table
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      content TEXT,
      authorName TEXT,
      authorPhoto TEXT,
      authorUid TEXT,
      createdAt TEXT,
      mediaId TEXT,
      mediaType TEXT,
      likes TEXT DEFAULT '[]',
      comments TEXT DEFAULT '[]',
      upvotes TEXT DEFAULT '[]',
      downvotes TEXT DEFAULT '[]',
      FOREIGN KEY(mediaId) REFERENCES media(id)
    )
  `);

  // Stories table
  db.run(`
    CREATE TABLE IF NOT EXISTS stories (
      id TEXT PRIMARY KEY,
      authorName TEXT,
      authorPhoto TEXT,
      authorUid TEXT,
      createdAt TEXT,
      mediaId TEXT,
      mediaType TEXT,
      musicTitle TEXT,
      musicArtist TEXT,
      musicPreviewUrl TEXT,
      FOREIGN KEY(mediaId) REFERENCES media(id)
    )
  `);
});

// Helper to check if columns exist and add them if not
function addColumnIfMissing(tableName: string, columnName: string, columnType: string) {
  db.all(`PRAGMA table_info(${tableName})`, (err, columns: any[]) => {
    if (!columns?.find(c => c.name === columnName)) {
      db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`);
    }
  });
}

// Ensure columns exist (for existing databases)
addColumnIfMissing('stories', 'musicTitle', 'TEXT');
addColumnIfMissing('stories', 'musicArtist', 'TEXT');
addColumnIfMissing('stories', 'musicPreviewUrl', 'TEXT');

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.APP_URL}/auth/google/callback`
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // --- Google Calendar OAuth Routes ---
  app.get('/api/auth/google/url', (req, res) => {
    const { uid } = req.query;
    if (!uid) return res.status(400).json({ error: 'Missing UID' });

    const scopes = ['https://www.googleapis.com/auth/calendar.events'];
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      state: uid as string
    });

    res.json({ url });
  });

  app.get('/auth/google/callback', async (req, res) => {
    const { code, state: uid } = req.query;
    if (!code || !uid) return res.status(400).send('Missing code or state');

    try {
      const { tokens } = await oauth2Client.getToken(code as string);
      const dbInstance = firestore;
      if (!dbInstance) throw new Error('Firestore not initialized');

      const userRef = dbInstance.collection('users').doc(uid as string);
      await userRef.set({ googleCalendarTokens: tokens }, { merge: true });

      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS', tokens: ${JSON.stringify(tokens)} }, '*');
                window.close();
              } else {
                window.location.href = '/agenda';
              }
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Error getting tokens:', error);
      res.status(500).send('Authentication failed');
    }
  });

  app.post('/api/calendar/sync', async (req, res) => {
    const { uid, event } = req.body;
    if (!uid || !event) return res.status(400).json({ error: 'Missing UID or event' });

    try {
      const dbInstance = firestore;
      if (!dbInstance) throw new Error('Firestore not initialized');

      const userDoc = await dbInstance.collection('users').doc(uid).get();
      const userData = userDoc.data();
      const tokens = userData?.googleCalendarTokens;

      if (!tokens) return res.status(401).json({ error: 'No Google tokens found' });

      const auth = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      );

      auth.on('tokens', async (newTokens) => {
        const updatedTokens = { ...tokens, ...newTokens };
        await dbInstance.collection('users').doc(uid).set({ googleCalendarTokens: updatedTokens }, { merge: true });
      });

      auth.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth });

      const calendarEvent = {
        summary: event.title,
        description: event.description,
        start: {
          dateTime: new Date(event.date).toISOString(),
          timeZone: 'Asia/Jakarta',
        },
        end: {
          dateTime: new Date(new Date(event.date).getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'Asia/Jakarta',
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
      });

      res.json({ success: true, eventId: response.data.id });
    } catch (error) {
      console.error('Error creating calendar event:', error);
      res.status(500).json({ error: 'Failed to sync event' });
    }
  });

  app.post('/api/notifications/send', async (req, res) => {
    const { title, body, topic, uids, url } = req.body;
    
    try {
      const dbInstance = firestore;
      if (!dbInstance) throw new Error('Firestore not initialized');

      const message: any = {
        notification: { title, body },
        data: { url: url || '/' }
      };

      if (topic) {
        message.topic = topic;
      } else if (uids && Array.isArray(uids)) {
        const tokens: string[] = [];
        for (const uid of uids) {
          const userDoc = await dbInstance.collection('users').doc(uid).get();
          const token = userDoc.data()?.fcmToken;
          if (token) tokens.push(token);
        }
        
        if (tokens.length === 0) return res.json({ success: true, sent: 0 });
        
        const messaging = (await import('firebase-admin/messaging')).getMessaging(firebaseApp);
        const response = await messaging.sendEachForMulticast({
          tokens,
          notification: { title, body },
          data: { url: url || '/' }
        });
        return res.json({ success: true, sent: response.successCount });
      }

      const messaging = (await import('firebase-admin/messaging')).getMessaging(firebaseApp);
      await messaging.send(message);
      res.json({ success: true });
    } catch (error) {
      console.error('Error sending notification:', error);
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  app.post('/api/notifications/subscribe', async (req, res) => {
    const { uid, token, topic } = req.body;
    try {
      const messaging = (await import('firebase-admin/messaging')).getMessaging(firebaseApp);
      await messaging.subscribeToTopic(token, topic);
      res.json({ success: true });
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(500).json({ error: 'Failed to subscribe to topic' });
    }
  });

  app.get('/api/notifications/reminders', async (req, res) => {
    try {
      const dbInstance = firestore;
      if (!dbInstance) throw new Error('Firestore not initialized');

      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      
      const visitasis = await dbInstance.collection('visitasis')
        .where('tanggalVisitasi', '>=', now.toISOString().slice(0, 10))
        .where('tanggalVisitasi', '<=', tomorrow.toISOString().slice(0, 10))
        .get();

      let sentCount = 0;
      for (const doc of visitasis.docs) {
        const data = doc.data();
        if (data.status === 'Terjadwal') {
          // Send to all management topic
          const messaging = (await import('firebase-admin/messaging')).getMessaging(firebaseApp);
          await messaging.send({
            notification: {
              title: 'Pengingat Visitasi Besok 🕒',
              body: `Besok ada jadwal visitasi ke ${data.targetLembaga} pukul ${data.waktu} WIB.`
            },
            topic: 'management',
            data: { url: '/visitasi' }
          });
          sentCount++;
        }
      }

      res.json({ success: true, remindersSent: sentCount });
    } catch (error) {
      console.error('Reminder check error:', error);
      res.status(500).json({ error: 'Failed to check reminders' });
    }
  });

  // Serve static files from public folder
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Serve uploads folder
  app.use('/uploads', express.static(uploadsDir));

  // --- Security: Multer Configuration with Disk Storage ---
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadsDir);
    },
    filename: (_req, file, cb) => {
      const sanitizedFilename = `${Date.now()}_${file.originalname.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      cb(null, sanitizedFilename);
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit
    },
    fileFilter: (_req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime',
        'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3',
        'text/plain', 'application/octet-stream'
      ];
      
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Tipe file tidak didukung!'));
      }
    }
  });

  // --- API Routes ---
  app.post('/api/media/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'Tidak ada file yang diunggah' });
    }

    const mediaId = uuidv4();
    const filename = req.file.filename;
    const localPath = `/uploads/${filename}`;

    try {
      const isImage = req.file.mimetype.startsWith('image/');
      const isVideo = req.file.mimetype.startsWith('video/');

      if (process.env.CLOUDINARY_CLOUD_NAME && (isImage || isVideo)) {
        try {
          const result = await cloudinary.uploader.upload(req.file.path, {
            folder: 'caruban_core',
            resource_type: 'auto'
          });

          fs.unlinkSync(req.file.path);
          return res.json({ id: mediaId, url: result.secure_url, isCloudinary: true });
        } catch (cloudinaryErr) {
          console.error('Cloudinary upload error, falling back to local:', cloudinaryErr);
        }
      }

      const fileBuffer = await fs.promises.readFile(req.file.path);
      const stmt = db.prepare('INSERT INTO media (id, data, mimeType, filename, localPath) VALUES (?, ?, ?, ?, ?)');
      stmt.run(mediaId, fileBuffer, req.file.mimetype, filename, localPath, (err) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Gagal menyimpan media ke database' });
        }
        res.json({ id: mediaId, url: localPath });
      });
      stmt.finalize();
    } catch (error) {
      console.error('File processing error:', error);
      res.status(500).json({ error: 'Gagal memproses file' });
    }
  });

  app.get('/api/media/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT data, mimeType, localPath FROM media WHERE id = ?', [id], (err, row: any) => {
      if (err || !row) {
        return res.status(404).send('Media tidak ditemukan');
      }

      if (row.localPath) {
        const filename = row.localPath.split('/').pop();
        const fullPath = path.join(uploadsDir, filename);
        if (fs.existsSync(fullPath)) {
          return res.sendFile(fullPath);
        }
      }

      if (row.data) {
        res.setHeader('Content-Type', row.mimeType);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Cache-Control', 'public, max-age=31536000');
        return res.send(row.data);
      }

      res.status(404).send('Media tidak ditemukan di penyimpanan');
    });
  });

  app.get('/api/posts', (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    db.all('SELECT * FROM posts ORDER BY createdAt DESC LIMIT ?', [limit], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.all('SELECT id, localPath FROM media', [], (mErr, mediaRows: any[]) => {
        if (mErr) {
          return res.status(500).json({ error: mErr.message });
        }
        const mediaMap = new Map((mediaRows || []).map(m => [m.id, m.localPath]));
        
        const posts = rows.map((row: any) => ({
          ...row,
          likes: JSON.parse(row.likes),
          comments: JSON.parse(row.comments),
          upvotes: JSON.parse(row.upvotes || '[]'),
          downvotes: JSON.parse(row.downvotes || '[]'),
          mediaUrl: row.mediaId ? (mediaMap.get(row.mediaId) || `/api/media/${row.mediaId}`) : null
        }));
        res.json(posts);
      });
    });
  });

  app.post('/api/posts', (req, res) => {
    const { content, authorName, authorPhoto, authorUid, createdAt, mediaId, mediaType } = req.body;
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO posts (id, content, authorName, authorPhoto, authorUid, createdAt, mediaId, mediaType)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, content, authorName, authorPhoto, authorUid, createdAt, mediaId, mediaType, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id });
    });
    stmt.finalize();
  });

  app.post('/api/members/webhook', async (req, res) => {
    try {
      const memberData = req.body;
      if (!memberData.nama || !memberData.email) {
        return res.status(400).json({ error: 'Data tidak lengkap (nama dan email wajib)' });
      }

      const dbInstance = firestore;
      if (!dbInstance) throw new Error('Firestore not initialized');

      const memberRef = dbInstance.collection('members').doc();
      await memberRef.set({
        ...memberData,
        createdAt: new Date().toISOString(),
        source: 'Google Forms Webhook'
      });
      res.status(200).json({ success: true, id: memberRef.id });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Gagal memproses webhook' });
    }
  });

  app.post('/api/posts/:id/like', (req, res) => {
    const { id } = req.params;
    const { uid } = req.body;
    db.get('SELECT likes FROM posts WHERE id = ?', [id], (err, row: any) => {
      if (err || !row) return res.status(404).json({ error: 'Post not found' });
      let likes = JSON.parse(row.likes);
      if (likes.includes(uid)) {
        likes = likes.filter((l: string) => l !== uid);
      } else {
        likes.push(uid);
      }
      db.run('UPDATE posts SET likes = ? WHERE id = ?', [JSON.stringify(likes), id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ likes });
      });
    });
  });

  app.post('/api/posts/:id/comment', (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
    db.get('SELECT comments FROM posts WHERE id = ?', [id], (err, row: any) => {
      if (err || !row) return res.status(404).json({ error: 'Post not found' });
      const comments = JSON.parse(row.comments);
      comments.push(comment);
      db.run('UPDATE posts SET comments = ? WHERE id = ?', [JSON.stringify(comments), id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ comments });
      });
    });
  });

  app.delete('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM posts WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  app.put('/api/posts/:id', (req, res) => {
    const { id } = req.params;
    const { content } = req.body;
    db.run('UPDATE posts SET content = ? WHERE id = ?', [content, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  app.get('/api/stories', (req, res) => {
    db.all('SELECT * FROM stories ORDER BY createdAt DESC', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.all('SELECT id, localPath FROM media', [], (mErr, mediaRows: any[]) => {
        if (mErr) {
          return res.status(500).json({ error: mErr.message });
        }
        const mediaMap = new Map((mediaRows || []).map(m => [m.id, m.localPath]));
        
        const stories = rows.map((row: any) => ({
          ...row,
          mediaUrl: row.mediaId ? (mediaMap.get(row.mediaId) || `/api/media/${row.mediaId}`) : null
        }));
        res.json(stories);
      });
    });
  });

  app.post('/api/stories', (req, res) => {
    const { authorName, authorPhoto, authorUid, createdAt, mediaId, mediaType, musicTitle, musicArtist, musicPreviewUrl } = req.body;
    const id = uuidv4();
    const stmt = db.prepare(`
      INSERT INTO stories (id, authorName, authorPhoto, authorUid, createdAt, mediaId, mediaType, musicTitle, musicArtist, musicPreviewUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(id, authorName, authorPhoto, authorUid, createdAt, mediaId, mediaType, musicTitle, musicArtist, musicPreviewUrl, (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id });
    });
    stmt.finalize();
  });

  app.delete('/api/stories/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM stories WHERE id = ?', [id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  app.put('/api/stories/:id', (req, res) => {
    const { id } = req.params;
    const { musicTitle, musicArtist, musicPreviewUrl } = req.body;
    db.run('UPDATE stories SET musicTitle = ?, musicArtist = ?, musicPreviewUrl = ? WHERE id = ?', [musicTitle, musicArtist, musicPreviewUrl, id], (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true });
    });
  });

  app.post('/api/posts/:id/vote', (req, res) => {
    const { id } = req.params;
    const { uid, type } = req.body;
    db.get('SELECT upvotes, downvotes FROM posts WHERE id = ?', [id], (err, row: any) => {
      if (err || !row) return res.status(404).json({ error: 'Post not found' });
      let upvotes = JSON.parse(row.upvotes || '[]');
      let downvotes = JSON.parse(row.downvotes || '[]');
      if (type === 'up') {
        if (upvotes.includes(uid)) {
          upvotes = upvotes.filter((u: string) => u !== uid);
        } else {
          upvotes.push(uid);
          downvotes = downvotes.filter((d: string) => d !== uid);
        }
      } else if (type === 'down') {
        if (downvotes.includes(uid)) {
          downvotes = downvotes.filter((d: string) => d !== uid);
        } else {
          downvotes.push(uid);
          upvotes = upvotes.filter((u: string) => u !== uid);
        }
      }
      db.run('UPDATE posts SET upvotes = ?, downvotes = ? WHERE id = ?', [JSON.stringify(upvotes), JSON.stringify(downvotes), id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ upvotes, downvotes });
      });
    });
  });

  // --- Server-Side Gemini API Routes ---
  app.post('/api/gemini/generate', async (req, res) => {
    try {
      const { prompt, model, systemInstruction, config } = req.body;
      if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

      const selectedModel = model || 'gemini-3.8-flash';
      const requestConfig: any = { ...config };
      if (systemInstruction) {
        requestConfig.systemInstruction = systemInstruction;
      }

      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: prompt,
        ...(Object.keys(requestConfig).length > 0 ? { config: requestConfig } : {})
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server Gemini Generate Error:', error);
      res.status(500).json({ 
        error: error.message || 'Failed to generate content',
        code: error.status || 500
      });
    }
  });

  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history, systemInstruction, model } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      const chat = ai.chats.create({
        model: model || 'gemini-3.8-flash',
        history: history || [],
        config: {
          systemInstruction: systemInstruction || "Anda adalah asisten AI resmi Perpustakaan Digital Caruban Core PC IPNU IPPNU Kabupaten Cirebon.",
        }
      });

      const response = await chat.sendMessage({ message });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server Gemini Chat Error:', error);
      res.status(500).json({ error: error.message || 'Chat generation failed' });
    }
  });

  app.post('/api/gemini/stream', async (req, res) => {
    try {
      const { message, systemInstruction, model } = req.body;
      if (!message) return res.status(400).json({ error: 'Message is required' });

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const responseStream = await ai.models.generateContentStream({
        model: model || 'gemini-3.8-flash',
        contents: message,
        config: {
          systemInstruction: systemInstruction || "Anda adalah asisten AI senior Perpustakaan Digital Caruban Core untuk PC IPNU dan IPPNU Kabupaten Cirebon. Berikan jawaban yang komprehensif, akurat, dan inspiratif.",
        }
      });

      for await (const chunk of responseStream) {
        const text = chunk.text || '';
        const grounding = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        res.write(`data: ${JSON.stringify({ text, grounding })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error: any) {
      console.error('Server Gemini Stream Error:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: error.message || 'Streaming failed' });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  app.post('/api/gemini/asbabun-nuzul', async (req, res) => {
    try {
      const { surahNumber, verseNumber, surahName, translationText } = req.body;
      if (!surahNumber || !verseNumber) {
        return res.status(400).json({ error: 'surahNumber and verseNumber are required' });
      }

      const prompt = `Anda adalah seorang ahli tafsir dan ulama Al-Qur'an Ahlussunnah wal Jama'ah (Nahdlatul Ulama).
Tugas: Berikan Asbabun Nuzul (sebab-sebab turunnya ayat) untuk Surah ${surahName} (Surah ke-${surahNumber}) Ayat ${verseNumber}.
Terjemahan ayat: "${translationText || ''}".

Panduan penulisan:
1. Rujuk riwayat muktabar dari kitab 'Lubabun Nuqul fi Asbabin Nuzul' karya Imam Jalaluddin As-Suyuti atau 'Asbabun Nuzul' karya Imam Al-Wahidi.
2. Jelaskan peristiwa atau pertanyaan sahabat/kaum musyrikin yang melatarbelakangi turunnya ayat ini.
3. Jika ayat ini tidak memiliki sebab turun khusus (ghairu dzat asbab), jelaskan latar belakang konteks umum turunnya ayat di masa Rasulullah SAW (apakah periode Makkiyah atau Madaniyah) dan hikmah utamanya bagi pelajar NU.
4. Tulis dalam Bahasa Indonesia yang santun, jelas, ringkas, dan mudah dipahami (maksimal 2-3 paragraf).`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error('Server Asbabun Nuzul Error:', error);
      res.status(500).json({ error: error.message || 'Failed to retrieve Asbabun Nuzul' });
    }
  });

  app.post('/api/gemini/analyze-system', async (req, res) => {
    try {
      const { suratData } = req.body;
      const prompt = `
        Analisis data sistem berikut untuk memberikan ringkasan eksekutif bagi admin PC IPNU & IPPNU Kabupaten Cirebon:
        Data Surat Masuk (10 terbaru): ${JSON.stringify(suratData || [])}
        
        Berikan:
        1. Ringkasan status (Green/Yellow/Red).
        2. Anomali atau masalah kritis yang perlu diperhatikan (jika ada).
        3. Rekomendasi tindakan singkat.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING, description: 'Status sistem: Green, Yellow, atau Red' },
              summary: { type: Type.STRING, description: 'Ringkasan eksekutif dari analisis data' },
              alerts: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Daftar anomali atau masalah kritis' },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'Daftar rekomendasi tindakan' }
            },
            required: ['status', 'summary', 'alerts', 'recommendations']
          }
        }
      });

      res.json(JSON.parse(response.text || '{}'));
    } catch (error: any) {
      console.error('Server AI Analyze System Error:', error);
      res.status(500).json({
        status: 'Yellow',
        summary: 'Gagal melakukan analisis otomatis.',
        alerts: ['Gagal terhubung ke layanan AI server.'],
        recommendations: ['Periksa pengaturan server.', 'Coba lagi nanti.']
      });
    }
  });

  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.originalUrl}` });
  });

  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (req.path.startsWith('/api/')) {
      console.error('API Error:', err);
      return res.status(500).json({ error: 'Internal Server Error', message: err.message });
    }
    next(err);
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
