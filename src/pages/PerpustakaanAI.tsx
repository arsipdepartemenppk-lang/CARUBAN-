import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, Sparkles, BookOpen, Trash2, Library, FileText, 
  Download, ExternalLink, Search, CheckCircle, ChevronRight, Award, Compass,
  Copy, Check, Printer, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

import { DIGITAL_BOOKS, DigitalBook } from '../data/perpustakaanData';
import { useToast } from '../components/Toast';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  sources?: { title: string; uri: string }[];
}

const MessageBubble = React.memo(({ msg }: { msg: ChatMessage }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
  >
    <div className={`max-w-[85%] p-4 rounded-3xl ${
      msg.role === 'user' 
        ? 'bg-emerald-600 text-white rounded-tr-none' 
        : 'bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-main)] rounded-tl-none shadow-sm'
    }`}>
      <div className="text-sm leading-relaxed prose prose-invert prose-p:my-2 prose-headings:font-black prose-a:text-emerald-400">
        <ReactMarkdown>{msg.text}</ReactMarkdown>
      </div>
      {msg.sources && msg.sources.length > 0 && (
        <div className="mt-4 pt-3 border-t border-neutral-800/50">
          <p className="text-[10px] font-black uppercase tracking-widest text-neutral-500 mb-2">Sumber Referensi:</p>
          <div className="flex flex-col gap-1.5">
            {msg.sources.map((source, idx) => (
              <a 
                key={idx} 
                href={source.uri} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 truncate flex items-center gap-1.5 transition-colors"
              >
                <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></span>
                {source.title}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  </motion.div>
));

const PerpustakaanAI: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'chat' | 'koleksi'>('koleksi');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchDoc, setSearchDoc] = useState('');
  const [selectedBook, setSelectedBook] = useState<DigitalBook | null>(null);
  const [activeChapterIdx, setActiveChapterIdx] = useState<number>(0);
  const [copiedChapter, setCopiedChapter] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (message: string = input) => {
    if (!message.trim() || loading) return;
    const userMsg = message.trim();
    setInput('');
    setActiveTab('chat');
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }, { role: 'ai', text: '' }]);
    setLoading(true);

    try {
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          systemInstruction: "Anda adalah asisten AI senior dan pustakawan ahli Perpustakaan Digital Caruban Core untuk PC IPNU dan IPPNU Kabupaten Cirebon. Anda menguasai konstitusi PD/PRT IPNU, PD/PRT IPPNU, pedoman kaderisasi (Makesta, Lakmud, Lakut, Latin), sejarah peradaban Islam, dan nilai-nilai Ahlussunnah wal Jama'ah An-Nahdliyah. Berikan penjelasan yang edukatif, ilmiah, santun, dan terstruktur rapi dengan format Markdown."
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Readable stream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let sources: { title: string; uri: string }[] = [];
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.text) {
              fullText += parsed.text;
            }
            if (parsed.grounding && Array.isArray(parsed.grounding)) {
              parsed.grounding.forEach((c: any) => {
                if (c.web?.uri && c.web?.title && !sources.find(s => s.uri === c.web.uri)) {
                  sources.push({ title: c.web.title, uri: c.web.uri });
                }
              });
            }

            setMessages(prev => {
              const copy = [...prev];
              const last = { ...copy[copy.length - 1] };
              last.text = fullText;
              if (sources.length > 0) last.sources = [...sources];
              copy[copy.length - 1] = last;
              return copy;
            });
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    } catch (error: any) {
      console.error('AI Stream Error:', error);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1].text = "Mohon maaf, terjadi kendala saat menghubungi pustakawan AI. Silakan coba kembali sesaat lagi.";
        return copy;
      });
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const filteredBooks = DIGITAL_BOOKS.filter(b => {
    const matchCat = selectedCategory === 'Semua' || b.category === selectedCategory;
    const matchSearch = 
      b.title.toLowerCase().includes(searchDoc.toLowerCase()) ||
      b.category.toLowerCase().includes(searchDoc.toLowerCase()) ||
      b.description.toLowerCase().includes(searchDoc.toLowerCase()) ||
      b.chapters.some(c => c.title.toLowerCase().includes(searchDoc.toLowerCase()) || c.content.toLowerCase().includes(searchDoc.toLowerCase()));
    return matchCat && matchSearch;
  });

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans">
      {/* Top Header */}
      <div className="p-4 md:p-6 border-b border-[var(--border-main)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-app)]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-500/20">
            <Library size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-black text-lg tracking-tight">Perpustakaan Digital</h1>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                IPNU & IPPNU
              </span>
            </div>
            <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-[0.2em] flex items-center gap-1">
              <Sparkles size={10} /> Khazanah Aswaja & Modul Kaderisasi
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-1">
            <button
              onClick={() => setActiveTab('koleksi')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'koleksi'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <BookOpen size={14} /> Koleksi Literatur
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5",
                activeTab === 'chat'
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <Bot size={14} /> Tanya Pustakawan AI
            </button>
          </div>

          {activeTab === 'chat' && (
            <button 
              onClick={clearChat}
              title="Bersihkan Percakapan"
              className="p-2.5 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[var(--text-muted)] hover:text-red-500 transition-all active:scale-90"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'koleksi' ? (
        <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
          {/* Search Bar & Category Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input
                type="text"
                placeholder="Cari naskah pedoman, pasal PD/PRT, kurikulum kaderisasi, atau mars..."
                value={searchDoc}
                onChange={(e) => setSearchDoc(e.target.value)}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Filter Kategori */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
              {['Semua', 'Pedoman IPNU', 'Pedoman IPPNU', 'Modul Kaderisasi', 'Khazanah Aswaja'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                    selectedCategory === cat
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/20"
                      : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-white border border-[var(--border-main)]"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Banner Informasi Organisasi */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-emerald-900/20 to-[var(--bg-card)] border border-emerald-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400">
                Pusat Referensi Resmi
              </span>
              <h2 className="text-xl font-black text-white">Khazanah Intelektual IPNU & IPPNU</h2>
              <p className="text-xs text-zinc-400 max-w-xl">
                Seluruh materi dasar kaderisasi, tata aturan administrasi, dan landasan Aswaja An-Nahdliyah untuk pengurus Cabang, PAC, hingga Pimpinan Komisariat Kab. Cirebon.
              </p>
            </div>
            <button
              onClick={() => handleSend("Jelaskan garis besar kurikulum kaderisasi formal dari Makesta, Lakmud, Lakut, hingga Latin di IPNU dan IPPNU.")}
              className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shrink-0 self-start md:self-auto shadow-lg shadow-emerald-900/30"
            >
              <Sparkles size={14} /> Bedah Kurikulum AI
            </button>
          </div>

          {/* Book Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBooks.map((book) => (
              <div 
                key={book.id}
                className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-6 flex flex-col justify-between hover:border-emerald-500/40 transition-all group shadow-sm"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {book.category}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-medium">{book.author}</span>
                  </div>

                  <h3 className="font-black text-lg text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                    {book.title}
                  </h3>

                  <p className="text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                    {book.description}
                  </p>

                  <div className="pt-2 border-t border-[var(--border-main)]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-1.5">
                      Daftar Bab & Bahasan:
                    </span>
                    <div className="space-y-1">
                      {book.chapters.map((ch, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-zinc-400">
                          <CheckCircle size={11} className="text-emerald-500 shrink-0" />
                          <span className="truncate">{ch.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-[var(--border-main)] flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedBook(book);
                      setActiveChapterIdx(0);
                    }}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/20"
                  >
                    <BookOpen size={14} /> Baca Naskah
                  </button>
                  <button
                    onClick={() => handleSend(book.samplePrompt)}
                    className="py-2 px-3 rounded-xl bg-[var(--bg-app)] hover:bg-[var(--bg-card)] border border-[var(--border-main)] text-emerald-400 hover:text-white text-xs font-bold transition-all flex items-center gap-1"
                    title="Tanya AI Tentang Kitab Ini"
                  >
                    <Bot size={14} />
                    <span>Tanya AI</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Chat with AI View */
        <div className="flex flex-col flex-1 overflow-hidden">
          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 max-w-4xl mx-auto w-full no-scrollbar"
          >
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="w-20 h-20 bg-[var(--bg-card)] rounded-[32px] flex items-center justify-center text-emerald-500 mb-6 border border-[var(--border-main)] shadow-xl relative"
                >
                  <BookOpen size={40} />
                </motion.div>
                <h2 className="text-2xl font-black mb-2 tracking-tight">Pustakawan AI Caruban</h2>
                <p className="text-zinc-500 text-xs leading-relaxed max-w-md mb-6">
                  Tanyakan apa saja seputar konstitusi IPNU & IPPNU, pedoman kaderisasi (Makesta, Lakmud, Lakut, Latin), sejarah pendirian, administrasi persuratan, maupun khazanah Aswaja.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
                  {[
                    { label: 'Sejarah Kelahiran IPNU & IPPNU', icon: '📜' },
                    { label: 'Prinsip Aswaja An-Nahdliyah', icon: '🕌' },
                    { label: 'Format Surat Resmi PP IPNU IPPNU', icon: '📑' },
                    { label: 'Tahapan Kaderisasi Pelajar NU', icon: '🌱' }
                  ].map(q => (
                    <button 
                      key={q.label}
                      onClick={() => handleSend(q.label)}
                      className="p-3 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl text-[11px] font-bold text-[var(--text-muted)] hover:border-emerald-500 hover:text-[var(--text-main)] transition-all flex items-center justify-between group text-left"
                    >
                      <span>{q.label}</span>
                      <span>{q.icon}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-4 rounded-3xl rounded-tl-none flex gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 bg-[var(--bg-app)]/90 backdrop-blur-md border-t border-[var(--border-main)] pb-28 md:pb-8">
            <div className="max-w-4xl mx-auto flex items-center gap-3">
              <input
                type="text"
                placeholder="Ketik pertanyaan atau topik literatur..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl py-3.5 px-5 text-sm focus:outline-none focus:border-emerald-500 transition-colors text-[var(--text-main)]"
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-3.5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl shadow-lg shadow-emerald-900/30 active:scale-95 transition-transform disabled:opacity-50 text-white"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Document Reader Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl max-w-4xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Reader Header */}
              <div className="p-4 sm:p-5 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-app)]/50 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {selectedBook.category}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium">
                        {selectedBook.author}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-[var(--text-main)] leading-tight mt-0.5">
                      {selectedBook.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const ch = selectedBook.chapters[activeChapterIdx];
                      if (ch) {
                        navigator.clipboard.writeText(`${selectedBook.title} - ${ch.title}\n\n${ch.content}`);
                        setCopiedChapter(true);
                        showToast('Teks bab berhasil disalin ke clipboard');
                        setTimeout(() => setCopiedChapter(false), 2000);
                      }
                    }}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="Salin Naskah Bab Ini"
                  >
                    {copiedChapter ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span className="hidden sm:inline">{copiedChapter ? 'Tersalin' : 'Salin'}</span>
                  </button>

                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (printWindow) {
                        const ch = selectedBook.chapters[activeChapterIdx];
                        printWindow.document.write(`
                          <html>
                            <head>
                              <title>${selectedBook.title} - ${ch.title}</title>
                              <style>
                                body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 40px; color: #111; }
                                h1 { font-size: 20px; border-bottom: 2px solid #059669; padding-bottom: 8px; }
                                h2 { font-size: 16px; color: #059669; }
                                p, li { font-size: 14px; }
                                .header { margin-bottom: 24px; }
                                .badge { display: inline-block; background: #ecfdf5; color: #047857; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: bold; }
                              </style>
                            </head>
                            <body>
                              <div class="header">
                                <span class="badge">${selectedBook.category}</span>
                                <h1>${selectedBook.title}</h1>
                                <p><strong>Penyusun:</strong> ${selectedBook.author}</p>
                              </div>
                              <hr />
                              <h2>${ch.title}</h2>
                              <pre style="white-space: pre-wrap; font-family: inherit;">${ch.content}</pre>
                            </body>
                          </html>
                        `);
                        printWindow.document.close();
                        printWindow.print();
                      }
                    }}
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="Cetak Naskah"
                  >
                    <Printer size={14} />
                    <span className="hidden sm:inline">Cetak</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setActiveChapterIdx(0);
                    }}
                    className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Reader Body: Chapter Sidebar + Content */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* Chapter List */}
                <div className="w-full md:w-72 border-b md:border-b-0 md:border-r border-[var(--border-main)] bg-[var(--bg-app)]/30 p-3 sm:p-4 overflow-y-auto shrink-0 space-y-1.5 max-h-40 md:max-h-full">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-2 mb-2">
                    Daftar Bab & Materi ({selectedBook.chapters.length})
                  </p>
                  {selectedBook.chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveChapterIdx(idx)}
                      className={cn(
                        "w-full text-left p-3 rounded-2xl text-xs font-bold transition-all flex items-start gap-2.5",
                        activeChapterIdx === idx
                          ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm"
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] border border-transparent"
                      )}
                    >
                      <FileText size={14} className={cn("shrink-0 mt-0.5", activeChapterIdx === idx ? "text-emerald-400" : "text-zinc-500")} />
                      <span className="line-clamp-2 leading-snug">{ch.title}</span>
                    </button>
                  ))}
                </div>

                {/* Chapter Content Area */}
                <div className="flex-1 p-5 sm:p-7 overflow-y-auto bg-[var(--bg-card)]/50">
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="pb-3 border-b border-[var(--border-main)]">
                      <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest">
                        Bab {activeChapterIdx + 1} dari {selectedBook.chapters.length}
                      </span>
                      <h4 className="text-xl sm:text-2xl font-black text-[var(--text-main)] mt-1">
                        {selectedBook.chapters[activeChapterIdx]?.title}
                      </h4>
                    </div>

                    <div className="prose prose-invert max-w-none text-sm text-[var(--text-main)] leading-relaxed prose-headings:font-black prose-headings:text-emerald-400 prose-p:my-3 prose-strong:text-emerald-300">
                      <ReactMarkdown>
                        {selectedBook.chapters[activeChapterIdx]?.content || ''}
                      </ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reader Footer Toolbar */}
              <div className="p-3 sm:p-4 border-t border-[var(--border-main)] bg-[var(--bg-app)]/60 flex items-center justify-between shrink-0">
                <div className="hidden sm:block text-[11px] text-[var(--text-muted)]">
                  Rujukan resmi PC IPNU IPPNU Kabupaten Cirebon
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => {
                      const ch = selectedBook.chapters[activeChapterIdx];
                      const prompt = `Saya sedang membaca naskah ${selectedBook.title} - ${ch.title}. Mohon jelaskan secara mendalam tentang bab ini, relevansi praktisnya untuk kader IPNU IPPNU Kabupaten Cirebon, serta implementasinya.`;
                      setSelectedBook(null);
                      handleSend(prompt);
                    }}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-900/30"
                  >
                    <Bot size={15} /> Tanya AI Bab Ini
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PerpustakaanAI;
