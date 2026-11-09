import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useTheme } from '../components/ThemeProvider';
import { GraduationCap, Search, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

const Beasiswa: React.FC = () => {
  const { user, role } = useFirebase();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    judul: '',
    deskripsi: '',
    link: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'beasiswa'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (s) => setData(s.docs.map(d => ({ id: d.id, ...d.data() }))), (error) => {
      console.warn('Beasiswa snapshot sync notice:', error);
    });
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'beasiswa'), {
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });
      setIsModalOpen(false);
      setFormData({ judul: '', deskripsi: '', link: '' });
    } catch (error) {
      console.error('Error adding scholarship:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus info beasiswa ini?')) {
      try {
        await deleteDoc(doc(db, 'beasiswa', id));
      } catch (error) {
        console.error('Error deleting scholarship:', error);
      }
    }
  };

  return (
    <div className={cn(
      "p-4 pb-24 min-h-screen font-sans transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]",
    )}>
      <div className="flex justify-between items-center mb-8 pt-12">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">INFO BEASISWA</h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Informasi beasiswa untuk kader</p>
        </div>
        {(role === 'admin' || role === 'PC' || role === 'PAC' || role === 'PK' || role === 'PR') && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-14 h-14 bg-blue-600 rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all flex items-center justify-center text-white"
          >
            <Plus size={28} />
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {data.map(item => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={item.id} 
            className={cn(
              "p-6 rounded-[32px] border group relative transition-all bg-[var(--bg-card)] border-[var(--border-main)] hover:border-blue-500/50 shadow-sm",
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-500 border border-blue-500/20">
                  <GraduationCap size={28} />
                </div>
                <h3 className={cn(
                  "font-black text-lg leading-tight transition-colors text-[var(--text-main)]",
                )}>{item.judul}</h3>
              </div>
              <div className="flex items-center gap-2">
                {item.link && (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className={cn(
                    "p-2 transition-colors text-[var(--text-muted)] hover:text-blue-500",
                  )}>
                    <ExternalLink size={20} />
                  </a>
                )}
                {(role === 'admin' || role === 'PC' || role === 'PAC' || role === 'PK' || role === 'PR') && (
                  <button
                    onClick={() => handleDelete(item.id)}
                    className={cn(
                      "p-2 transition-colors",
                      isDark ? "text-zinc-500 hover:text-rose-500" : "text-zinc-400 hover:text-rose-600"
                    )}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
            <p className={cn(
              "text-sm leading-relaxed transition-colors",
              isDark ? "text-zinc-400" : "text-zinc-600"
            )}>{item.deskripsi}</p>
          </motion.div>
        ))}

        {data.length === 0 && (
          <div className="text-center py-20">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4",
              isDark ? "bg-zinc-900 text-zinc-700" : "bg-zinc-100 text-zinc-300"
            )}>
              <Search size={32} />
            </div>
            <p className={cn(
              "font-bold",
              isDark ? "text-zinc-500" : "text-zinc-400"
            )}>Belum ada info beasiswa terbaru.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              className={cn(
                "relative w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 max-h-[90vh] overflow-y-auto no-scrollbar border shadow-2xl transition-colors bg-[var(--bg-card)] border-[var(--border-main)]"
              )}
            >
              <div className={cn(
                "w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden transition-colors",
                isDark ? "bg-zinc-800" : "bg-zinc-200"
              )} />
              <div className="flex justify-between items-center mb-8">
                <h2 className={cn(
                  "text-2xl font-black transition-colors",
                  isDark ? "text-white" : "text-zinc-900"
                )}>Tambah Info Beasiswa</h2>
                <button onClick={() => setIsModalOpen(false)} className={cn(
                  "p-2 rounded-full transition-colors",
                  isDark ? "bg-zinc-900 hover:bg-zinc-800" : "bg-zinc-100 hover:bg-zinc-200"
                )}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Judul Beasiswa</label>
                    <input
                      required
                      type="text"
                      placeholder="Contoh: Beasiswa LPDP"
                      value={formData.judul}
                      onChange={(e) => setFormData({...formData, judul: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-blue-500 transition-all",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Deskripsi Singkat</label>
                    <textarea
                      required
                      placeholder="Detail beasiswa..."
                      value={formData.deskripsi}
                      onChange={(e) => setFormData({...formData, deskripsi: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-blue-500 transition-all min-h-[120px] resize-none",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Link Pendaftaran (Opsional)</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.link}
                      onChange={(e) => setFormData({...formData, link: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-blue-500 transition-all",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className={cn(
                      "flex-1 py-4 rounded-2xl text-xs font-black transition-all",
                      isDark ? "text-zinc-500 hover:bg-zinc-900" : "text-zinc-400 hover:bg-zinc-100"
                    )}
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-900/20 active:scale-95 transition-all"
                  >
                    SIMPAN INFO
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Beasiswa;
