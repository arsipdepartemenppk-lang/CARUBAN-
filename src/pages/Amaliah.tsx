import React, { useState, useEffect } from 'react';
import { Book, ChevronRight, ArrowLeft, ChevronLeft, X, List } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AMALIAH_DATA } from '../data/amaliahData';

export default function Amaliah() {
  const [selectedAmaliah, setSelectedAmaliah] = useState<typeof AMALIAH_DATA[0] | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [showTOC, setShowTOC] = useState(false);

  const handleSelectAmaliah = (item: typeof AMALIAH_DATA[0]) => {
    setSelectedAmaliah(item);
    setCurrentPage(0);
    setShowTOC(false);
  };

  const handleNextPage = () => {
    if (selectedAmaliah && currentPage < selectedAmaliah.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const jumpToPage = (index: number) => {
    setCurrentPage(index);
    setShowTOC(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedAmaliah) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrevPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAmaliah, currentPage]);

  const renderArabicLine = (line: string, i: number) => {
    const hasArabic = /[\u0600-\u06FF]/.test(line);
    const isRedText = line.includes('اللّٰهُمَّ') || 
                      line.includes('صَلِّ') || 
                      (line.trim().startsWith('(') && line.trim().endsWith(')'));
    const isPoetry = line.includes('   ');

    if (!hasArabic) {
      return (
        <p 
          key={i} 
          className="mb-4 text-sm md:text-base text-zinc-600 font-sans italic text-left leading-relaxed"
          dir="ltr"
        >
          {line}
        </p>
      );
    }

    if (isPoetry) {
      const parts = line.split('   ');
      return (
        <div key={i} className="flex justify-between items-center mb-6 w-full px-4 md:px-12" dir="rtl">
          <span className="text-right flex-1">{parts[0]}</span>
          <span className="text-[#B91C1C] mx-4 font-bold">۞</span>
          <span className="text-right flex-1">{parts[1]}</span>
        </div>
      );
    }

    return (
      <p 
        key={i} 
        className={`mb-6 leading-[2.5] ${isRedText ? 'text-[#B91C1C] text-center font-bold' : 'text-justify'}`}
        dir="rtl"
      >
        {line}
      </p>
    );
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans">
      <AnimatePresence mode="wait">
        {!selectedAmaliah ? (
          <motion.div
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="mb-8 pt-8 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase mb-1">Amaliah Nahdliyah</h1>
                  <p className="text-emerald-500 text-xs font-bold uppercase tracking-[0.25em]">
                    Tuntunan Ibadah, Sholat, Kitab Maulid, & Doa Harian
                  </p>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold w-fit">
                  ✓ Sesuai Rujukan Resmi Kemenag RI & PBNU
                </div>
              </div>

              {/* Banner Rujukan Kemenag RI */}
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-zinc-950 border border-emerald-500/30 text-xs text-zinc-300 flex items-start gap-3 shadow-md">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                  <Book size={18} />
                </div>
                <div className="space-y-1">
                  <p className="font-bold text-white text-sm">Standarisasi Rujukan Kitab Kementerian Agama Republik Indonesia (Kemenag RI)</p>
                  <p className="text-zinc-400 text-[11px] leading-relaxed">
                    Seluruh bacaan amaliah dalam menu ini (Risalah Tuntunan Sholat Fardhu, Kumpulan Doa Sehari-hari, Susunan Tahlil & Hadlarah Muassis, Maulid Diba'i, serta Maulid Al-Barzanji) diselaraskan dengan naskah resmi pedoman ibadah Direktorat Jenderal Bimbingan Masyarakat Islam Kemenag RI dan tradisi Ahlussunnah wal Jama'ah An-Nahdliyah.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {AMALIAH_DATA.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectAmaliah(item)}
                  className="flex flex-col items-start p-6 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[32px] hover:bg-[var(--bg-sidebar)] hover:border-[var(--accent-primary)]/50 transition-all group text-left relative overflow-hidden"
                >
                  <div className="absolute -right-10 -top-10 w-40 h-40 bg-[var(--accent-primary)]/5 rounded-full blur-3xl group-hover:bg-[var(--accent-primary)]/10 transition-colors" />
                  <div className="w-14 h-14 rounded-2xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] mb-4 group-hover:scale-110 transition-transform relative z-10">
                    <Book size={28} />
                  </div>
                  <h3 className="text-xl font-black text-[var(--text-main)] mb-1 relative z-10">{item.title}</h3>
                  <p className="text-xs text-zinc-400 mb-3 flex-1 relative z-10 leading-relaxed">{item.description}</p>
                  
                  {item.source && (
                    <div className="mb-4 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 relative z-10 line-clamp-1 w-full">
                      {item.source}
                    </div>
                  )}

                  <div className="flex items-center text-[var(--accent-primary)] text-xs font-black uppercase tracking-widest mt-auto relative z-10">
                    Buka Kitab <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="pt-12 relative"
          >
            <div className="flex items-center justify-between mb-8 sticky top-4 z-50">
              <button
                onClick={() => setSelectedAmaliah(null)}
                className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors bg-[var(--bg-header)] backdrop-blur-md px-4 py-3 rounded-2xl border border-[var(--border-main)] shadow-xl"
              >
                <ArrowLeft size={18} />
                <span className="text-xs font-black uppercase tracking-widest hidden sm:inline">Kembali</span>
              </button>
              
              <button
                onClick={() => setShowTOC(true)}
                className="flex items-center gap-2 text-[var(--accent-primary)] hover:text-[var(--accent-primary)]/80 transition-colors bg-zinc-900/90 backdrop-blur-md px-4 py-3 rounded-2xl border border-[var(--accent-primary)]/20 shadow-xl"
              >
                <List size={18} />
                <span className="text-xs font-black uppercase tracking-widest">Daftar Isi</span>
              </button>
            </div>

            <AnimatePresence>
              {showTOC && selectedAmaliah.pages && (
                <>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowTOC(false)}
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                  />
                  <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="fixed top-0 right-0 h-full w-full max-w-sm bg-zinc-900 border-l border-zinc-800 z-50 overflow-y-auto shadow-2xl"
                  >
                    <div className="p-6 sticky top-0 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between z-10">
                      <h3 className="text-lg font-black uppercase tracking-widest text-white">Daftar Isi</h3>
                      <button onClick={() => setShowTOC(false)} className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-4 flex flex-col gap-2">
                      {selectedAmaliah.pages.map((page, idx) => (
                        <button
                          key={idx}
                          onClick={() => jumpToPage(idx)}
                          className={`text-left p-4 rounded-2xl transition-all flex items-center justify-between ${
                            currentPage === idx 
                              ? 'bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/30 text-[var(--accent-primary)]' 
                              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                          }`}
                        >
                          <span className="font-bold">{page.title}</span>
                          <span className="text-xs font-black opacity-50">{idx + 1}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            <div className="bg-[#FDFBF7] border-[8px] border-[#E8DFCE] rounded-[24px] p-4 sm:p-8 md:p-16 relative overflow-hidden shadow-2xl shadow-[var(--bg-primary)]/20 max-w-4xl mx-auto">
              <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }} />
              
              <div className="absolute inset-3 sm:inset-6 border-2 border-[#D4C5A9] rounded-[12px] pointer-events-none" />
              <div className="absolute inset-4 sm:inset-7 border border-[#D4C5A9] rounded-[8px] pointer-events-none" />
              
              <div className="text-center relative z-10 mb-12 mt-8">
                <h2 className="text-2xl md:text-3xl font-black text-[#B91C1C] mb-4 font-serif">{selectedAmaliah.title}</h2>
                <h3 className="text-xl text-[#2C3E2D] font-bold font-serif">{selectedAmaliah.pages[currentPage].title}</h3>
                <div className="w-48 h-0.5 bg-[#D4C5A9] mx-auto mt-6" />
                <div className="w-24 h-0.5 bg-[#D4C5A9] mx-auto mt-1" />
              </div>
              
              <div className="prose prose-lg max-w-none mx-auto font-arabic text-3xl md:text-4xl relative z-10 text-[#1A1A1A] px-2 sm:px-8">
                {selectedAmaliah.pages[currentPage].content.split('\n').map((line, i) => renderArabicLine(line, i))}
              </div>

              <div className="flex items-center justify-between mt-20 pt-8 border-t-2 border-[#D4C5A9] relative z-10 px-4">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#8C2727] disabled:opacity-30 hover:text-[#B91C1C] transition-colors"
                >
                  <ChevronLeft size={20} />
                  <span className="hidden md:inline">Halaman Sebelumnya</span>
                </button>
                
                <div className="text-lg font-bold text-[#1A1A1A] font-serif border-2 border-[#D4C5A9] w-12 h-12 flex items-center justify-center rounded-full bg-[#F5EEDC]">
                  {currentPage + 1}
                </div>

                <button
                  onClick={handleNextPage}
                  disabled={currentPage === selectedAmaliah.pages.length - 1}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-[#8C2727] disabled:opacity-30 hover:text-[#B91C1C] transition-colors"
                >
                  <span className="hidden md:inline">Halaman Selanjutnya</span>
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
