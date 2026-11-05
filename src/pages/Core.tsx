import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, query, addDoc, doc, updateDoc, deleteDoc, orderBy } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Loader2, Plus, Edit2, Trash2, CheckCircle2, FileText, Award, BarChart3, X, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { logActivity } from '../utils/activityLogger';

interface CoreEvaluation {
  id: string;
  entityType: 'PR' | 'PK' | 'PAC' | 'PC' | 'Pondok Pesantren' | 'SMP' | 'Mts' | 'MA' | 'SMK' | 'SMA';
  entityName: string;
  period: string;
  status: 'Draft' | 'Submitted' | 'Verified';
  scores: {
    administrasi: number[];
    kaderisasi: number[];
    keuangan: number[];
    inovasi: number[];
    eksternal: number[];
  };
  finalScore: number;
  grade: 'A' | 'B' | 'C' | 'D';
  verifiedBy?: string;
  createdBy: string;
  createdAt: string;
}

const EVALUATION_QUESTIONS = {
  administrasi: [
    "Kelengkapan SK Kepengurusan yang masih berlaku",
    "Ketertiban Administrasi Surat Menyurat & Arsip",
    "Ketersediaan Papan Nama, Stempel, & Atribut Organisasi",
    "Rutinitas & Notulensi Rapat Pengurus",
    "Kelengkapan Buku Inventaris, Buku Tamu, & Buku Agenda"
  ],
  kaderisasi: [
    "Pelaksanaan Kaderisasi Formal (Makesta/Lakmud/Lakut)",
    "Kerapian & Pembaruan Database Anggota",
    "Keterlibatan Anggota dalam Kegiatan Rutin",
    "Pelaksanaan Upgrading/Pelatihan Pengurus",
    "Pelaksanaan Rencana Tindak Lanjut (RTL) Kaderisasi"
  ],
  keuangan: [
    "Pengelolaan Iuran/Kas Rutin Anggota & Pengurus",
    "Transparansi & Pelaporan Keuangan Berkala",
    "Kemandirian Finansial melalui Kewirausahaan/Usaha Mandiri",
    "Penggalian Dana Eksternal (Sponsorship/Donatur sah)",
    "Kerapian Pembukuan (Buku Kas Umum, Jurnal)"
  ],
  inovasi: [
    "Pelaksanaan Program Kerja Unggulan/Prioritas",
    "Pemanfaatan Teknologi & Media Sosial Organisasi",
    "Kreativitas & Daya Tarik Kegiatan bagi Pelajar",
    "Dampak Positif Program terhadap Anggota & Lingkungan",
    "Keberlanjutan Program (Sustainability)"
  ],
  eksternal: [
    "Hubungan Baik dengan Pembina, Alumni, & Tokoh Masyarakat",
    "Kerjasama dengan Pihak Sekolah/Instansi Terkait",
    "Partisipasi Aktif dalam Kegiatan Kemasyarakatan",
    "Publikasi Kegiatan di Media Massa/Eksternal",
    "Jaringan & Sinergi dengan Organisasi Kepemudaan Lain"
  ]
};

const RATING_DESCRIPTIONS = {
  1: "Sangat Kurang: Belum ada upaya, kegiatan, atau program yang dilakukan sama sekali.",
  2: "Kurang: Upaya minimal, kegiatan ada namun belum terencana dengan baik dan tidak konsisten.",
  3: "Cukup: Kegiatan berjalan cukup rutin, namun belum memberikan dampak yang luas.",
  4: "Baik: Kegiatan berjalan rutin, terencana dengan baik, dan memberikan dampak positif bagi anggota.",
  5: "Sangat Baik: Kegiatan sangat inovatif, berdampak luas, berkelanjutan, dan menjadi teladan bagi pimpinan lainnya."
};

const calculateScoreAndGrade = (scores: CoreEvaluation['scores']) => {
  let totalScore = 0;
  let maxScore = 0;
  Object.values(scores).forEach(categoryScores => {
    categoryScores.forEach(score => {
      totalScore += score;
      maxScore += 5;
    });
  });
  const finalScore = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
  let grade: 'A' | 'B' | 'C' | 'D' = 'D';
  if (finalScore >= 90) grade = 'A';
  else if (finalScore >= 75) grade = 'B';
  else if (finalScore >= 60) grade = 'C';
  return { finalScore: Math.round(finalScore * 10) / 10, grade };
};

const CoreModule: React.FC = () => {
  const { user, role } = useFirebase();
  const { showToast } = useToast();
  const [evaluations, setEvaluations] = useState<CoreEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'list'>('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string | null }>({ isOpen: false, id: null });
  const [formData, setFormData] = useState<Partial<CoreEvaluation>>({
    entityType: 'PK',
    entityName: '',
    period: '',
    status: 'Draft',
    scores: {
      administrasi: [0, 0, 0, 0, 0],
      kaderisasi: [0, 0, 0, 0, 0],
      keuangan: [0, 0, 0, 0, 0],
      inovasi: [0, 0, 0, 0, 0],
      eksternal: [0, 0, 0, 0, 0]
    }
  });

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'core_evaluations'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      setEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CoreEvaluation)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'core_evaluations', auth);
    });
    return () => unsub();
  }, []);

  const handleScoreChange = (category: keyof CoreEvaluation['scores'], index: number, value: number) => {
    setFormData(prev => {
      const newScores = { ...prev.scores } as CoreEvaluation['scores'];
      newScores[category][index] = value;
      return { ...prev, scores: newScores };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.entityName || !formData.period) {
      showToast('Nama Pimpinan dan Periode wajib diisi', 'error');
      return;
    }
    const { finalScore, grade } = calculateScoreAndGrade(formData.scores as CoreEvaluation['scores']);
    try {
      const docData = {
        ...formData,
        finalScore,
        grade,
        createdBy: user?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      if (formData.id) {
        await updateDoc(doc(db, 'core_evaluations', formData.id), docData);
        logActivity(user?.uid, user?.email, 'UPDATE', 'CoreEvaluation', formData.id, { entityName: formData.entityName });
        showToast('Evaluasi berhasil diperbarui', 'success');
      } else {
        const docRef = await addDoc(collection(db, 'core_evaluations'), docData);
        logActivity(user?.uid, user?.email, 'CREATE', 'CoreEvaluation', docRef.id, { entityName: formData.entityName });
        showToast('Evaluasi berhasil disimpan', 'success');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, formData.id ? OperationType.UPDATE : OperationType.CREATE, 'core_evaluations', auth);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteDoc(doc(db, 'core_evaluations', deleteConfirm.id));
      logActivity(user?.uid, user?.email, 'DELETE', 'CoreEvaluation', deleteConfirm.id, {});
      showToast('Evaluasi berhasil dihapus', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'core_evaluations', auth);
    } finally {
      setDeleteConfirm({ isOpen: false, id: null });
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await updateDoc(doc(db, 'core_evaluations', id), {
        status: 'Verified',
        verifiedBy: user?.uid,
        updatedAt: new Date().toISOString()
      });
      logActivity(user?.uid, user?.email, 'VERIFY', 'CoreEvaluation', id, {});
      showToast('Evaluasi berhasil diverifikasi', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'core_evaluations', auth);
    }
  };

  const resetForm = () => {
    setFormData({
      entityType: 'PK',
      entityName: '',
      period: '',
      status: 'Draft',
      scores: {
        administrasi: [0, 0, 0, 0, 0],
        kaderisasi: [0, 0, 0, 0, 0],
        keuangan: [0, 0, 0, 0, 0],
        inovasi: [0, 0, 0, 0, 0],
        eksternal: [0, 0, 0, 0, 0]
      }
    });
  };

  const openEditModal = (evaluation: CoreEvaluation) => {
    setFormData(evaluation);
    setIsModalOpen(true);
  };

  const totalEvaluations = (evaluations || []).length;
  const averageScore = totalEvaluations > 0 
    ? ((evaluations || []).reduce((acc, curr) => acc + curr.finalScore, 0) / totalEvaluations).toFixed(1)
    : 0;
  const verifiedCount = (evaluations || []).filter(e => e.status === 'Verified').length;
  const topPerformers = [...(evaluations || [])].sort((a, b) => b.finalScore - a.finalScore).slice(0, 5);

  const filteredEvaluations = (evaluations || []).filter(e => {
    const matchesType = filterType === 'All' || e.entityType === filterType;
    const matchesSearch = (e.entityName || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                          (e.period || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="p-4 pb-32 min-h-screen font-sans transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tighter uppercase">Modul CORE</h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Charta of Organization & Regeneration Evaluation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'dashboard' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
            )}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('list')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              activeTab === 'list' ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
            )}
          >
            Data Evaluasi
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
      ) : (
        <>
          {activeTab === 'dashboard' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-[32px] flex items-center gap-4">
                  <div className="w-14 h-14 bg-emerald-500/10 text-emerald-500 rounded-2xl flex items-center justify-center">
                    <BarChart3 size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rata-rata Skor</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">{averageScore}</p>
                  </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-[32px] flex items-center gap-4">
                  <div className="w-14 h-14 bg-blue-500/10 text-blue-500 rounded-2xl flex items-center justify-center">
                    <FileText size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Total Evaluasi</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">{totalEvaluations}</p>
                  </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-[32px] flex items-center gap-4">
                  <div className="w-14 h-14 bg-purple-500/10 text-purple-500 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Terverifikasi</p>
                    <p className="text-3xl font-black text-[var(--text-main)]">{verifiedCount}</p>
                  </div>
                </div>
              </div>

              <div className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-[32px]">
                <div className="flex items-center gap-3 mb-6">
                  <Award className="text-amber-500" size={24} />
                  <h2 className="text-lg font-black uppercase tracking-widest text-[var(--text-main)]">Top Performers</h2>
                </div>
                <div className="space-y-4">
                  {topPerformers.length > 0 ? topPerformers.map((evalItem, idx) => (
                    <div key={evalItem.id} className="flex items-center justify-between p-4 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-card)] flex items-center justify-center font-black text-[var(--text-muted)] border border-[var(--border-main)]">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-main)]">{evalItem.entityName}</p>
                          <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-widest">{evalItem.entityType} • {evalItem.period}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-black text-emerald-500">{evalItem.finalScore}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-widest">Skor Akhir</p>
                        </div>
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg",
                          evalItem.grade === 'A' ? "bg-emerald-500/20 text-emerald-500" :
                          evalItem.grade === 'B' ? "bg-blue-500/20 text-blue-500" :
                          evalItem.grade === 'C' ? "bg-amber-500/20 text-amber-500" :
                          "bg-rose-500/20 text-rose-500"
                        )}>
                          {evalItem.grade}
                        </div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-center text-zinc-500 py-8">Belum ada data evaluasi.</p>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'list' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="flex flex-1 gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                    <input 
                      type="text"
                      placeholder="Cari pimpinan atau periode..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl py-3 pl-12 pr-4 text-xs font-bold outline-none focus:border-emerald-500 transition-all text-[var(--text-main)]"
                    />
                  </div>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all appearance-none text-[var(--text-main)]"
                  >
                    <option value="All">Semua Tingkat</option>
                    <option value="PR">PR</option>
                    <option value="PK">PK</option>
                    <option value="PAC">PAC</option>
                    <option value="PC">PC</option>
                    <option value="SMA">SMA</option>
                    <option value="SMK">SMK</option>
                    <option value="MA">MA</option>
                    <option value="Mts">Mts</option>
                    <option value="SMP">SMP</option>
                    <option value="Pondok Pesantren">Pondok Pesantren</option>
                  </select>
                </div>
                {(role === 'admin' || role === 'PC' || role === 'PAC' || role === 'PK' || role === 'PR') && (
                  <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={16} /> Buat Evaluasi
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvaluations.map(evalItem => (
                  <div key={evalItem.id} className="bg-[var(--bg-card)] border border-[var(--border-main)] p-6 rounded-[32px] relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(role === 'admin' || user?.uid === evalItem.createdBy) && (
                        <button onClick={() => openEditModal(evalItem)} className="w-8 h-8 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg flex items-center justify-center text-blue-500 hover:bg-blue-500/20 transition-all">
                          <Edit2 size={14} />
                        </button>
                      )}
                      {(role === 'admin') && (
                        <button onClick={() => setDeleteConfirm({ isOpen: true, id: evalItem.id })} className="w-8 h-8 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-lg flex items-center justify-center text-rose-500 hover:bg-rose-500/20 transition-all">
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <span className="px-2 py-1 bg-[var(--bg-app)] rounded-md text-[8px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2 inline-block">
                          {evalItem.entityType}
                        </span>
                        <h3 className="font-black text-lg leading-tight text-[var(--text-main)]">{evalItem.entityName}</h3>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">{evalItem.period}</p>
                      </div>
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl border",
                        evalItem.grade === 'A' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                        evalItem.grade === 'B' ? "bg-blue-500/10 border-blue-500/20 text-blue-500" :
                        evalItem.grade === 'C' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" :
                        "bg-rose-500/10 border-rose-500/20 text-rose-500"
                      )}>
                        {evalItem.grade}
                      </div>
                    </div>

                    <div className="space-y-3 mb-6">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-500">Skor Akhir</span>
                        <span className="font-black text-[var(--text-main)]">{evalItem.finalScore} / 100</span>
                      </div>
                      <div className="w-full bg-[var(--bg-app)] rounded-full h-2">
                        <div 
                          className={cn(
                            "h-2 rounded-full",
                            evalItem.grade === 'A' ? "bg-emerald-500" :
                            evalItem.grade === 'B' ? "bg-blue-500" :
                            evalItem.grade === 'C' ? "bg-amber-500" : "bg-rose-500"
                          )} 
                          style={{ width: `${evalItem.finalScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-[var(--border-main)]">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                        evalItem.status === 'Verified' ? "bg-emerald-500/10 text-emerald-500" :
                        evalItem.status === 'Submitted' ? "bg-blue-500/10 text-blue-500" :
                        "bg-[var(--bg-app)] text-[var(--text-muted)]"
                      )}>
                        {evalItem.status}
                      </span>
                      
                      {evalItem.status !== 'Verified' && (role === 'admin' || role === 'PC') && (
                        <button 
                          onClick={() => handleVerify(evalItem.id)}
                          className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:underline flex items-center gap-1"
                        >
                          <CheckCircle2 size={12} /> Verifikasi
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </>
      )}

      {/* Evaluation Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
              className="relative w-full max-w-4xl bg-[var(--bg-card)] rounded-[40px] p-8 max-h-[90vh] overflow-y-auto no-scrollbar border border-[var(--border-main)] shadow-2xl"
            >
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase tracking-tighter text-[var(--text-main)]">Form Evaluasi CORE</h2>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-[var(--bg-app)] rounded-full flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[var(--bg-app)] p-6 rounded-[32px] border border-[var(--border-main)]">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Tingkat Pimpinan</label>
                    <select
                      value={formData.entityType}
                      onChange={(e) => setFormData({...formData, entityType: e.target.value as any})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all appearance-none text-[var(--text-main)]"
                    >
                      <option value="PR">PR (Pimpinan Ranting)</option>
                      <option value="PK">PK (Pimpinan Komisariat)</option>
                      <option value="PAC">PAC (Pimpinan Anak Cabang)</option>
                      <option value="PC">PC (Pimpinan Cabang)</option>
                      <option value="SMA">SMA</option>
                      <option value="SMK">SMK</option>
                      <option value="MA">MA</option>
                      <option value="Mts">Mts</option>
                      <option value="SMP">SMP</option>
                      <option value="Pondok Pesantren">Pondok Pesantren</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Nama Pimpinan</label>
                    <input
                      type="text"
                      placeholder="Contoh: PK SMA N 1 Cirebon"
                      value={formData.entityName}
                      onChange={(e) => setFormData({...formData, entityName: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all text-[var(--text-main)]"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Periode Evaluasi</label>
                    <input
                      type="text"
                      placeholder="Contoh: Semester 1 - 2026"
                      value={formData.period}
                      onChange={(e) => setFormData({...formData, period: e.target.value})}
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-2xl p-4 text-sm outline-none focus:border-emerald-500 transition-all text-[var(--text-main)]"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-8 pb-32">
                  {Object.entries(EVALUATION_QUESTIONS).map(([category, questions], catIdx) => (
                    <div key={category} className="bg-[var(--bg-app)] border border-[var(--border-main)] p-6 rounded-[32px]">
                      <h3 className="text-lg font-black uppercase tracking-widest mb-6 text-emerald-500 flex items-center gap-2">
                        <span className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center text-sm">{catIdx + 1}</span>
                        {category}
                      </h3>
                      <div className="space-y-6">
                        {questions.map((question, qIdx) => (
                          <div key={qIdx} className="flex flex-col gap-4 p-4 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-main)]">
                            <p className="text-sm text-[var(--text-main)]">{question}</p>
                            <div className="flex flex-col gap-2">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mr-2">Skor (1-5):</span>
                                {[1, 2, 3, 4, 5].map(score => (
                                  <button
                                    key={score}
                                    type="button"
                                    onClick={() => handleScoreChange(category as keyof CoreEvaluation['scores'], qIdx, score)}
                                    className={cn(
                                      "w-10 h-10 rounded-xl font-black text-sm transition-all",
                                      formData.scores?.[category as keyof CoreEvaluation['scores']][qIdx] === score
                                        ? "bg-emerald-500 text-black"
                                        : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
                                    )}
                                  >
                                    {score}
                                  </button>
                                ))}
                              </div>
                              <p className="text-[10px] text-zinc-500 italic">
                                {formData.scores?.[category as keyof CoreEvaluation['scores']][qIdx] 
                                  ? RATING_DESCRIPTIONS[formData.scores?.[category as keyof CoreEvaluation['scores']][qIdx] as 1|2|3|4|5]
                                  : "Pilih skor untuk melihat deskripsi."}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-4 pt-4 sticky bottom-0 bg-[var(--bg-card)] p-4 border-t border-[var(--border-main)] -mx-8 -mb-8 rounded-b-[40px]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-4 rounded-2xl text-xs font-black text-zinc-500 hover:bg-[var(--bg-app)] transition-all"
                  >
                    BATAL
                  </button>
                  <button
                    type="submit"
                    onClick={() => setFormData({...formData, status: 'Draft'})}
                    className="flex-1 bg-[var(--bg-app)] text-[var(--text-main)] font-black py-4 rounded-2xl hover:opacity-80 transition-all border border-[var(--border-main)]"
                  >
                    SIMPAN DRAFT
                  </button>
                  <button
                    type="submit"
                    onClick={() => setFormData({...formData, status: 'Submitted'})}
                    className="flex-1 bg-emerald-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-emerald-900/20 active:scale-95 transition-all"
                  >
                    SUBMIT EVALUASI
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Hapus Evaluasi"
        message="Apakah Anda yakin ingin menghapus evaluasi ini? Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Hapus"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, id: null })}
      />
    </div>
  );
};

export default CoreModule;
