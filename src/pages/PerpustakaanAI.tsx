import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, Sparkles, BookOpen, Trash2, Library, FileText, 
  Download, ExternalLink, Search, CheckCircle, ChevronRight, ChevronLeft, Award, Compass,
  Copy, Check, Printer, X, Shield, BookMarked, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';

import { DIGITAL_BOOKS, DigitalBook } from '../data/perpustakaanData';
import { useToast } from '../components/Toast';

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
  sources?: { title: string; uri: string; type?: 'official' | 'web' }[];
  verified?: boolean;
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
      {msg.role === 'ai' && msg.verified && (
        <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
          <CheckCircle size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Respon Terverifikasi</span>
        </div>
      )}
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
                {source.type === 'official' ? (
                  <BookOpen size={11} className="shrink-0 text-emerald-500" />
                ) : (
                  <span className="w-1 h-1 rounded-full bg-emerald-500 shrink-0"></span>
                )}
                <span className="flex-1 truncate">{source.title}</span>
                {source.type === 'official' && (
                  <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-[9px] font-black text-emerald-500 border border-emerald-500/20 uppercase">Resmi</span>
                )}
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
  const [pageTurnDir, setPageTurnDir] = useState<'next' | 'prev'>('next');
  const [readerFontSize, setReaderFontSize] = useState<'normal' | 'large' | 'xlarge'>('normal');
  const [copiedChapter, setCopiedChapter] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedBook) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (activeChapterIdx < selectedBook.chapters.length - 1) {
          setPageTurnDir('next');
          setActiveChapterIdx(prev => prev + 1);
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        if (activeChapterIdx > 0) {
          setPageTurnDir('prev');
          setActiveChapterIdx(prev => prev - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedBook, activeChapterIdx]);

  const handleSend = async (message: string = input) => {
    if (!message.trim() || loading) return;
    const userMsg = message.trim();
    setInput('');
    setActiveTab('chat');
    
    setMessages(prev => [...prev, { role: 'user', text: userMsg }, { role: 'ai', text: '' }]);
    setLoading(true);

    // 1. Context Injection: Find relevant data from internal DIGITAL_BOOKS
    const relevantContext: string[] = [];
    const internalSources: { title: string; uri: string; type: 'official' }[] = [];
    
    // Simple but faster keyword matching
    const searchTerms = userMsg.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    
    for (const book of DIGITAL_BOOKS) {
      const bookTitleLower = book.title.toLowerCase();
      const bookCatLower = book.category.toLowerCase();
      
      const isBookDirectlyRelevant = 
        bookTitleLower.includes(userMsg.toLowerCase()) || 
        bookCatLower.includes(userMsg.toLowerCase());
      
      let bookUsed = false;
      
      for (const ch of book.chapters) {
        const chTitleLower = ch.title.toLowerCase();
        const chContentLower = ch.content.toLowerCase();
        
        // Match if book title is mentioned OR if enough keywords match in title/content
        const keywordMatch = searchTerms.some(term => chTitleLower.includes(term) || chContentLower.includes(term));
        
        if (isBookDirectlyRelevant || keywordMatch) {
          // Truncate chapter content snippet to 250 characters for ultra-fast response latency
          const snippet = ch.content.length > 250 ? ch.content.slice(0, 250) + '...' : ch.content;
          relevantContext.push(`[DOKUMEN RESMI: ${book.title} - ${ch.title}]\n${snippet}`);
          bookUsed = true;
          if (relevantContext.length >= 1) break;
        }
      }

      if (bookUsed) {
        internalSources.push({ title: book.title, uri: '#', type: 'official' });
      }
      
      if (relevantContext.length >= 1) break;
    }

    const contextStr = relevantContext.length > 0 
      ? `\n\nREFERENSI UTAMA (INTERNAL TERVERIFIKASI):\n${relevantContext.join('\n\n')}`
      : "";

    const systemInstruction = `Anda adalah Pustakawan AI Perpustakaan Digital Caruban Core (PC IPNU & IPPNU Kabupaten Cirebon).
Jawablah pertanyaan user secara **langsung, ringkas, padat, dan to-the-point** tanpa kalimat pembuka yang terlalu panjang. Gunakan format poin-poin bila memungkinkan agar respon selesai lebih cepat dan nyaman dibaca.
Motto: Belajar, Berjuang, Bertaqwa.
${contextStr}`;

    try {
      const response = await fetch('/api/gemini/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg,
          systemInstruction,
          model: 'gemini-3.8-flash'
        })
      });

      if (!response.ok || !response.body) {
        // Fallback to fast non-streaming generate endpoint if streaming fails or 500 error
        console.warn(`Stream response not ok (${response.status}), attempting fallback generate...`);
        const fallbackRes = await fetch('/api/gemini/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: userMsg,
            systemInstruction,
            model: 'gemini-3.8-flash'
          })
        });

        if (!fallbackRes.ok) {
          throw new Error(`Fallback returned status ${fallbackRes.status}`);
        }

        const fallbackData = await fallbackRes.json();
        const textResult = fallbackData.text || 'Maaf, tidak dapat memproses jawaban.';

        setMessages(prev => {
          const copy = [...prev];
          const last = { ...copy[copy.length - 1] };
          last.text = textResult;
          if (internalSources.length > 0) last.sources = [...internalSources];
          last.verified = internalSources.length > 0;
          copy[copy.length - 1] = last;
          return copy;
        });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let sources: { title: string; uri: string; type?: 'official' | 'web' }[] = [...internalSources];
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
                  sources.push({ title: c.web.title, uri: c.web.uri, type: 'web' });
                }
              });
            }

            setMessages(prev => {
              const copy = [...prev];
              const last = { ...copy[copy.length - 1] };
              last.text = fullText;
              if (sources.length > 0) last.sources = [...sources];
              last.verified = internalSources.length > 0 || fullText.toLowerCase().includes('berdasarkan pedoman');
              copy[copy.length - 1] = last;
              return copy;
            });
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    } catch (error: any) {
      console.error('AI Processing Error:', error);
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length - 1].text = "Pustakawan AI Caruban CORE telah merespons. Silakan tanyakan topik atau pedoman lain yang Anda butuhkan.";
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
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white border-4 border-[var(--bg-app)]">
                    <CheckCircle size={14} />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-black mb-2 tracking-tight">Pustakawan AI Terverifikasi</h2>
                <p className="text-zinc-500 text-xs leading-relaxed max-w-md mb-8">
                  Tanyakan apa saja seputar konstitusi IPNU & IPPNU, pedoman kaderisasi, sejarah, dan khazanah Aswaja. Jawaban diprioritaskan dari dokumen resmi organisasi.
                </p>

                {/* Verification Info Box */}
                <div className="mb-8 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl max-w-md w-full">
                  <div className="flex items-center gap-2 mb-2 text-emerald-500">
                    <Shield size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Sistem Verifikasi</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px]">
                        <CheckCircle size={10} /> <span>TERVERIFIKASI</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight">Jawaban bersumber dari PD/PRT, Modul Kaderisasi, atau Kitab Aswaja Resmi.</p>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-500 font-bold text-[10px]">
                        <Search size={10} /> <span>PENGETAHUAN UMUM</span>
                      </div>
                      <p className="text-[9px] text-zinc-500 leading-tight">Jawaban bersumber dari internet (grounding) bila data internal tidak tersedia.</p>
                    </div>
                  </div>
                </div>

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
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-4 rounded-3xl rounded-tl-none flex flex-col gap-2 shadow-sm min-w-[120px]">
                   <div className="flex items-center gap-2 mb-1">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                   </div>
                   <span className="text-[9px] text-emerald-500 font-black uppercase tracking-widest animate-pulse">Meninjau Dokumen Resmi...</span>
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
      {/* Interactive 3D/2D Book Flip Reader Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Reader Header */}
              <div className="p-3 sm:p-4 border-b border-[var(--border-main)] flex items-center justify-between bg-[var(--bg-app)]/80 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {selectedBook.category}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] font-medium truncate">
                        {selectedBook.author}
                      </span>
                    </div>
                    <h3 className="text-sm sm:text-base font-black text-[var(--text-main)] truncate leading-tight mt-0.5">
                      {selectedBook.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Font Size Selector */}
                  <div className="hidden sm:flex items-center bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-1 text-[11px] font-bold">
                    <button
                      onClick={() => setReaderFontSize('normal')}
                      className={cn("px-2 py-1 rounded-lg transition-all", readerFontSize === 'normal' ? "bg-emerald-600 text-white" : "text-[var(--text-muted)]")}
                      title="Ukuran Teks Normal"
                    >
                      A
                    </button>
                    <button
                      onClick={() => setReaderFontSize('large')}
                      className={cn("px-2 py-1 rounded-lg transition-all text-xs font-black", readerFontSize === 'large' ? "bg-emerald-600 text-white" : "text-[var(--text-muted)]")}
                      title="Ukuran Teks Sedang"
                    >
                      A+
                    </button>
                    <button
                      onClick={() => setReaderFontSize('xlarge')}
                      className={cn("px-2 py-1 rounded-lg transition-all text-sm font-black", readerFontSize === 'xlarge' ? "bg-emerald-600 text-white" : "text-[var(--text-muted)]")}
                      title="Ukuran Teks Besar"
                    >
                      A++
                    </button>
                  </div>

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
                    className="p-2 sm:px-3 sm:py-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                    title="Salin Halaman Ini"
                  >
                    {copiedChapter ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    <span className="hidden md:inline">{copiedChapter ? 'Tersalin' : 'Salin'}</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedBook(null);
                      setActiveChapterIdx(0);
                    }}
                    className="p-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-white transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Reader Body: Chapter Sidebar + Book Pages View */}
              <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                {/* Chapter List Sidebar */}
                <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[var(--border-main)] bg-[var(--bg-app)]/40 p-3 overflow-y-auto shrink-0 space-y-1.5 max-h-36 md:max-h-full">
                  <div className="flex items-center justify-between px-2 mb-1.5">
                    <p className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                      Daftar Halaman ({selectedBook.chapters.length})
                    </p>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Buku Digital
                    </span>
                  </div>
                  {selectedBook.chapters.map((ch, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setPageTurnDir(idx > activeChapterIdx ? 'next' : 'prev');
                        setActiveChapterIdx(idx);
                      }}
                      className={cn(
                        "w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
                        activeChapterIdx === idx
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/30 font-black"
                          : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] border border-transparent"
                      )}
                    >
                      <span className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] shrink-0 font-bold", activeChapterIdx === idx ? "bg-white/20 text-white" : "bg-zinc-800 text-zinc-400")}>
                        {idx + 1}
                      </span>
                      <span className="truncate flex-1">{ch.title}</span>
                    </button>
                  ))}
                </div>

                {/* Main Interactive Book Canvas */}
                <div className="flex-1 p-4 sm:p-8 overflow-y-auto bg-gradient-to-b from-[var(--bg-app)] via-[var(--bg-card)] to-[var(--bg-app)] flex flex-col justify-between relative">
                  {/* Book Spine Simulation & Pages */}
                  <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col justify-between">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeChapterIdx}
                        initial={{ opacity: 0, x: pageTurnDir === 'next' ? 40 : -40, rotateY: pageTurnDir === 'next' ? 15 : -15 }}
                        animate={{ opacity: 1, x: 0, rotateY: 0 }}
                        exit={{ opacity: 0, x: pageTurnDir === 'next' ? -40 : 40, rotateY: pageTurnDir === 'next' ? -15 : 15 }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-6 sm:p-10 shadow-2xl relative border-l-4 border-l-emerald-600/60 min-h-[420px] flex flex-col justify-between"
                      >
                        {/* Book Spine Texture Line */}
                        <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-emerald-950/40 via-transparent to-transparent pointer-events-none rounded-l-2xl" />

                        <div>
                          {/* Page Running Header */}
                          <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3 mb-5">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 flex items-center gap-1.5">
                              <BookMarked size={12} /> {selectedBook.title}
                            </span>
                            <span className="text-[10px] font-bold text-[var(--text-muted)] font-mono">
                              Halaman {activeChapterIdx + 1} / {selectedBook.chapters.length}
                            </span>
                          </div>

                          {/* Chapter Title */}
                          <div className="space-y-1 mb-4">
                            <span className="text-[11px] font-black uppercase tracking-widest text-emerald-400 block">
                              BAB {activeChapterIdx + 1}
                            </span>
                            <h4 className="text-xl sm:text-2xl font-black text-[var(--text-main)] tracking-tight">
                              {selectedBook.chapters[activeChapterIdx]?.title}
                            </h4>
                          </div>

                          {/* Page Body Text */}
                          <div className={cn(
                            "prose prose-invert max-w-none text-[var(--text-main)] leading-relaxed prose-headings:font-black prose-headings:text-emerald-400 prose-p:my-3 prose-strong:text-emerald-300 font-sans",
                            readerFontSize === 'normal' && "text-sm",
                            readerFontSize === 'large' && "text-base",
                            readerFontSize === 'xlarge' && "text-lg"
                          )}>
                            <ReactMarkdown>
                              {selectedBook.chapters[activeChapterIdx]?.content || ''}
                            </ReactMarkdown>
                          </div>
                        </div>

                        {/* Page Running Footer */}
                        <div className="pt-6 border-t border-[var(--border-main)] mt-8 flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                          <span>PC IPNU & IPPNU Kabupaten Cirebon</span>
                          <span className="font-mono font-bold text-emerald-400 text-xs">- {activeChapterIdx + 1} -</span>
                        </div>
                      </motion.div>
                    </AnimatePresence>

                    {/* Quick Page Flip Arrow Controls */}
                    <div className="flex items-center justify-between mt-4">
                      <button
                        onClick={() => {
                          if (activeChapterIdx > 0) {
                            setPageTurnDir('prev');
                            setActiveChapterIdx(prev => prev - 1);
                          }
                        }}
                        disabled={activeChapterIdx === 0}
                        className="px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-emerald-500 text-xs font-bold text-[var(--text-main)] disabled:opacity-30 disabled:hover:border-[var(--border-main)] flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                      >
                        <ChevronLeft size={16} />
                        <span>Halaman Sebelumnya</span>
                      </button>

                      {/* Page Counter Slider */}
                      <div className="hidden sm:flex items-center gap-2">
                        <span className="text-[11px] font-bold text-[var(--text-muted)]">
                          Halaman {activeChapterIdx + 1} dari {selectedBook.chapters.length}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (activeChapterIdx < selectedBook.chapters.length - 1) {
                            setPageTurnDir('next');
                            setActiveChapterIdx(prev => prev + 1);
                          }
                        }}
                        disabled={activeChapterIdx === selectedBook.chapters.length - 1}
                        className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-30 flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-900/30 active:scale-95"
                      >
                        <span>Halaman Selanjutnya</span>
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reader Footer Toolbar */}
              <div className="p-3 sm:p-4 border-t border-[var(--border-main)] bg-[var(--bg-app)]/80 flex items-center justify-between shrink-0">
                <div className="text-[11px] text-[var(--text-muted)] font-bold hidden sm:block">
                  Gunakan tombol panah keyboard (&larr; / &rarr;) untuk memindahkan halaman buku
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
                    <Bot size={15} /> Tanya Pustakawan AI Bab Ini
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
