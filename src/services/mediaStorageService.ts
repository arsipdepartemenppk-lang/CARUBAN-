import { 
  collection, 
  doc, 
  addDoc, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  where 
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { uploadMedia } from '../utils/uploadUtils';

export interface MediaStorageItem {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  fileType: 'photo' | 'video';
  mimeType: string;
  fileSize: number;
  fileName: string;
  folder: string;
  tags: string[];
  uploadedBy: string;
  uploaderName: string;
  uploaderEmail?: string;
  createdAt: string;
  views?: number;
  downloads?: number;
}

export const MEDIA_FOLDERS = [
  'Dokumentasi Acara',
  'Rapat & Pleno',
  'Pelantikan & Makesta',
  'Video Liputan',
  'Brosur & Desain',
  'Kaderisasi',
  'Arsip Umum'
] as const;

export type MediaFolderType = typeof MEDIA_FOLDERS[number];

/**
 * Uploads media file to server/storage and creates a Firestore metadata record
 */
export async function uploadMediaStorageItem(
  file: File | Blob,
  meta: {
    title: string;
    description?: string;
    folder: string;
    tags?: string[];
  },
  user: {
    uid: string;
    displayName?: string | null;
    email?: string | null;
  },
  onProgress?: (progress: number) => void
): Promise<MediaStorageItem> {
  const isVideo = file.type.startsWith('video/');
  const fileType: 'photo' | 'video' = isVideo ? 'video' : 'photo';
  const fileName = file instanceof File ? file.name : `media_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
  let finalUrl = '';

  // 1. Try server upload API first
  try {
    finalUrl = await uploadMedia(file, `media_storage/${user.uid}`, user.uid, onProgress);
  } catch (serverErr) {
    console.warn('Server upload failed, attempting Firebase Storage fallback:', serverErr);

    // 2. Try Firebase Storage directly
    try {
      const storagePath = `media_storage/${user.uid}/${Date.now()}_${fileName.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const fileRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(fileRef, file);

      await new Promise<void>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            if (onProgress) onProgress(progress);
          },
          (err) => reject(err),
          async () => {
            finalUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve();
          }
        );
      });
    } catch (fbStorageErr) {
      console.warn('Firebase Storage failed, falling back to base64 DataURL:', fbStorageErr);

      // 3. Last fallback: FileReader Base64 for images / small media
      finalUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      if (onProgress) onProgress(100);
    }
  }

  // 4. Record to Firestore
  const newMediaData: Omit<MediaStorageItem, 'id'> = {
    title: meta.title.trim() || fileName,
    description: meta.description?.trim() || '',
    fileUrl: finalUrl,
    fileType,
    mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
    fileSize: file.size || 0,
    fileName,
    folder: meta.folder || 'Arsip Umum',
    tags: meta.tags || [],
    uploadedBy: user.uid,
    uploaderName: user.displayName || user.email || 'Pengurus',
    uploaderEmail: user.email || '',
    createdAt: new Date().toISOString(),
    views: 0,
    downloads: 0
  };

  const docRef = await addDoc(collection(db, 'media_storage'), newMediaData);

  return {
    id: docRef.id,
    ...newMediaData
  };
}

/**
 * Subscribes to real-time media updates
 */
export function subscribeMediaItems(
  callback: (items: MediaStorageItem[]) => void,
  folderFilter?: string | null,
  typeFilter?: 'photo' | 'video' | 'all'
) {
  let q = query(collection(db, 'media_storage'), orderBy('createdAt', 'desc'));

  if (folderFilter && folderFilter !== 'Semua') {
    q = query(collection(db, 'media_storage'), where('folder', '==', folderFilter), orderBy('createdAt', 'desc'));
  }

  return onSnapshot(
    q,
    (snapshot) => {
      let items = snapshot.docs.map(
        (docSnap) => ({ id: docSnap.id, ...docSnap.data() } as MediaStorageItem)
      );
      if (typeFilter && typeFilter !== 'all') {
        items = items.filter((item) => item.fileType === typeFilter);
      }
      callback(items);
    },
    (err) => {
      console.error('Error fetching media storage items:', err);
    }
  );
}

/**
 * Deletes a media item record from Firestore
 */
export async function deleteMediaStorageItem(id: string): Promise<void> {
  const docRef = doc(db, 'media_storage', id);
  await deleteDoc(docRef);
}

/**
 * Updates metadata for a media item
 */
export async function updateMediaStorageItem(
  id: string,
  updates: Partial<Pick<MediaStorageItem, 'title' | 'description' | 'folder' | 'tags'>>
): Promise<void> {
  const docRef = doc(db, 'media_storage', id);
  await updateDoc(docRef, updates);
}

/**
 * Increments view count or download count
 */
export async function recordMediaAccess(id: string, type: 'view' | 'download'): Promise<void> {
  try {
    const docRef = doc(db, 'media_storage', id);
    if (type === 'view') {
      await updateDoc(docRef, { views: (Number(docRef) || 0) + 1 });
    } else {
      await updateDoc(docRef, { downloads: (Number(docRef) || 0) + 1 });
    }
  } catch {
    // Non-blocking
  }
}
