import React, { useState, useEffect, useRef } from 'react';
import { Search, X, User, FileText, MapPin, ArrowRight, Loader2 } from 'lucide-react';
import { collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useTheme } from './ThemeProvider';
import Fuse from 'fuse.js';

export const GlobalSearch: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.length < 2 && !startDate && !endDate && statusFilter === 'Semua') {
      setResults([]);
      return;
    }

    const search = async () => {
      setIsSearching(true);
      const collections = [
        { id: 'members', label: 'Anggota', icon: User, route: 'anggota' },
        { id: 'pks', label: 'Master PK', icon: MapPin, route: 'master-pk' },
        { id: 'suratMasuk', label: 'Surat Masuk', icon: FileText, route: 'surat-masuk' },
        { id: 'suratKeluar', label: 'Surat Keluar', icon: FileText, route: 'surat-keluar' },
        { id: 'visitations', label: 'Visitasi', icon: MapPin, route: 'data-visitasi' }
      ];
      
      const allItems: any[] = [];
      
      for (const col of collections) {
        try {
          const q = query(collection(db, col.id), limit(100));
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            const data = doc.data();
            
            const date = data.tglSurat || data.tglDiterima || data.tglVisitasi || data.createdAt || '';
            const matchesDate = (!startDate || date >= startDate) && (!endDate || date <= endDate);
            const matchesStatus = statusFilter === 'Semua' || data.status === statusFilter;
            
            if (matchesDate && matchesStatus) {
              allItems.push({
                id: doc.id,
                collection: col.id,
                label: col.label,
                icon: col.icon,
                route: col.route,
                title: data.namaLengkap || data.namaPK || data.judul || data.noSurat || data.perihal || data.id,
                subtitle: data.pkId || data.jabatan || data.asalSurat || data.tglSurat || data.lokasi || '',
                raw: data
              });
            }
          });
        } catch (error) {
          console.error(`Error searching collection ${col.id}:`, error);
        }
      }

      if (searchTerm.length >= 2) {
        const fuse = new Fuse(allItems, {
          keys: ['title', 'subtitle', 'id'],
          threshold: 0.3,
          includeScore: true
        });
        const fuseResults = fuse.search(searchTerm);
        setResults(fuseResults.map(r => r.item));
      } else {
        setResults(allItems.slice(0, 50));
      }
      
      setIsSearching(false);
    };

    const timeout = setTimeout(search, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, startDate, endDate, statusFilter]);

  return (
    <div className="relative w-full">
      <button 
        onClick={() => setIsOpen(true)} 
        className={cn(
          "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all group",
          resolvedTheme === 'dark' ? "bg-zinc-900/50 border-zinc-800 text-zinc-500" : "bg-slate-50 border-zinc-100 text-zinc-400"
        )}
      >
        <Search size={18} className="group-hover:text-emerald-500 transition-colors" />
        <span className="text-sm font-bold uppercase tracking-widest">Cari data (Anggota, PK, Surat)...</span>
        <div className="ml-auto flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-black border border-zinc-700">⌘</span>
          <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-black border border-zinc-700">K</span>
        </div>
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 sm:p-20">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={cn(
                "relative w-full max-w-2xl rounded-[32px] border shadow-2xl overflow-hidden mt-10",
                resolvedTheme === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-100"
              )}
            >
              <div className={cn(
                "flex flex-col p-6 border-b",
                resolvedTheme === 'dark' ? "border-zinc-800" : "border-zinc-100"
              )}>
                <div className="flex items-center mb-4">
                  <Search className="text-emerald-500 mr-4" size={24} />
                  <input 
                    ref={inputRef}
                    type="text"
                    placeholder="Ketik untuk mencari..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(
                      "flex-1 bg-transparent outline-none text-lg font-bold",
                      resolvedTheme === 'dark' ? "text-white" : "text-zinc-900"
                    )}
                  />
                  {isSearching ? (
                    <Loader2 className="animate-spin text-emerald-500" size={20} />
                  ) : (
                    <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                      <X size={20} />
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-400" />
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-400" />
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-zinc-900 border border-zinc-800 rounded-xl p-2 text-xs text-zinc-400">
                    <option value="Semua">Semua Status</option>
                    <option value="Diproses">Diproses</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Ditolak">Ditolak</option>
                  </select>
                </div>
              </div>
              
              <div className="max-h-[50vh] overflow-y-auto p-4 custom-scrollbar">
                {searchTerm.length > 0 && results.length === 0 && !isSearching && (
                  <div className="py-12 text-center">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search size={24} className="text-zinc-700" />
                    </div>
                    <p className="text-zinc-400 font-bold">Tidak ada hasil ditemukan untuk "{searchTerm}"</p>
                  </div>
                )}
                
                {searchTerm.length === 0 && (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Cari apa saja di Caruban Core</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 px-4">
                      {[
                        { label: 'Anggota', icon: User, color: 'text-blue-500' },
                        { label: 'PK', icon: MapPin, color: 'text-emerald-500' },
                        { label: 'Surat', icon: FileText, color: 'text-indigo-500' },
                        { label: 'Agenda', icon: ArrowRight, color: 'text-orange-500' }
                      ].map(item => (
                        <div key={item.label} className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                          <item.icon size={20} className={item.color} />
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{item.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {results.map(res => (
                    <button 
                      key={res.id}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/${res.route}`);
                      }}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-2xl border transition-all group text-left",
                        resolvedTheme === 'dark' ? "bg-zinc-900/50 border-zinc-800 hover:bg-zinc-900" : "bg-slate-50 border-zinc-100 hover:bg-white"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center transition-all",
                        resolvedTheme === 'dark' ? "bg-zinc-800 group-hover:bg-emerald-500/10" : "bg-white shadow-sm group-hover:bg-emerald-50"
                      )}>
                        <res.icon size={20} className="text-emerald-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          "font-bold text-sm truncate",
                          resolvedTheme === 'dark' ? "text-white" : "text-zinc-900"
                        )}>{res.title}</p>
                        <p className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-2">
                          <span className="text-emerald-500">{res.label}</span>
                          {res.subtitle && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-zinc-700" />
                              <span className="truncate">{res.subtitle}</span>
                            </>
                          )}
                        </p>
                      </div>
                      <ArrowRight size={16} className="text-zinc-700 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
              
              <div className={cn(
                "p-4 border-t flex items-center justify-between",
                resolvedTheme === 'dark' ? "bg-zinc-900/50 border-zinc-800" : "bg-slate-50 border-zinc-100"
              )}>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-black border border-zinc-700 text-zinc-400">ESC</span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Tutup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[8px] font-black border border-zinc-700 text-zinc-400">↵</span>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Pilih</span>
                  </div>
                </div>
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Caruban Core Search Engine</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
