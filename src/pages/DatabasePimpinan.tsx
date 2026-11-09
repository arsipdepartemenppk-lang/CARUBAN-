import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useTheme } from '../components/ThemeProvider';
import { useToast } from '../components/Toast';
import { 
  Plus, Search, Trash2, Building2, Phone, MapPin, Calendar, Activity, 
  Layers, Users, Mail, RefreshCw, Sparkles, CheckCircle2, ArrowRight, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { IPNU_ZONES, IPPNU_ZONES } from '../constants/zones';
import { cn } from '../lib/utils';
import { logActivity } from '../utils/activityLogger';
import { encryptData, decryptData } from '../utils/securityEncryption';
import { syncAllData, SyncReport } from '../services/dataSyncService';

interface Pimpinan {
  id: string;
  namaLembaga: string;
  jenis: 'PAC' | 'PR' | 'PK';
  namaKetua: string;
  noHp: string;
  email?: string;
  alamatDomisili: string;
  masaKhidmat: string;
  statusPimpinan: 'Aktif' | 'Non Aktif' | 'Vakum';
  logoUrl?: string;
  organisasi: 'IPNU' | 'IPPNU';
  kecamatan: string;
  zona: string;
  koorzon: string;
  jumlahAnggota?: number;
  pkDocId?: string;
  pkId?: string;
}

const STATUS_OPTIONS = ['Aktif', 'Non Aktif', 'Vakum'];

const DatabasePimpinan: React.FC = () => {
  const { user, role } = useFirebase();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const isDark = theme === 'dark';
  const [pimpinan, setPimpinan] = useState<Pimpinan[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get('pk') || '');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleSyncData = async () => {
    setIsSyncing(true);
    showToast('Menyelaraskan data Pimpinan dengan Master PK dan Anggota...', 'info');
    try {
      const report = await syncAllData({ uid: user?.uid, email: user?.email || undefined });
      setSyncReport(report);
      setIsSyncModalOpen(true);
      showToast(`Sinkronisasi selesai! ${report.totalMembers} kader & ${report.totalPKs} PK tersinkron.`, 'success');
    } catch (err: any) {
      console.error('Error synchronizing in DatabasePimpinan:', err);
      showToast('Gagal melakukan sinkronisasi: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };
  const [formData, setFormData] = useState({
    namaLembaga: '',
    jenis: 'PAC' as 'PAC' | 'PR' | 'PK',
    namaKetua: '',
    noHp: '',
    email: '',
    alamatDomisili: '',
    masaKhidmat: '',
    statusPimpinan: 'Aktif' as const,
    logoUrl: '',
    organisasi: 'IPNU' as 'IPNU' | 'IPPNU',
    kecamatan: '',
    zona: '',
    koorzon: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'pimpinan'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const raw = doc.data();
        const item = { id: doc.id, ...raw } as any;
        if (raw._isEncrypted) {
          ['namaKetua', 'noHp', 'email', 'alamatDomisili', 'namaLembaga'].forEach(f => {
            if (raw[f]) item[f] = decryptData(raw[f]);
          });
        }
        return item;
      }) as Pimpinan[];
      // Client-side sort
      data.sort((a, b) => (a.namaLembaga || '').localeCompare(b.namaLembaga || ''));
      setPimpinan(data);
    }, (error) => {
      console.warn('Pimpinan snapshot sync notice:', error);
    });
    return () => unsubscribe();
  }, []);

  const handleKecamatanChange = (kecamatan: string, organisasi: 'IPNU' | 'IPPNU') => {
    const zones = organisasi === 'IPNU' ? IPNU_ZONES : IPPNU_ZONES;
    const foundZone = zones.find(z => z.kecamatan.includes(kecamatan));
    
    if (foundZone) {
      setFormData({ 
        ...formData, 
        kecamatan, 
        organisasi,
        zona: foundZone.zona, 
        koorzon: foundZone.koorzon 
      });
    } else {
      setFormData({ 
        ...formData, 
        kecamatan, 
        organisasi,
        zona: '', 
        koorzon: '' 
      });
    }
  };

  const getAllKecamatan = (organisasi: 'IPNU' | 'IPPNU') => {
    const zones = organisasi === 'IPNU' ? IPNU_ZONES : IPPNU_ZONES;
    const allKec = zones.flatMap(z => z.kecamatan);
    return Array.from(new Set(allKec)).sort();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const errors: Record<string, string> = {};
    if (formData.noHp) {
      const phoneRegex = /^[0-9]{10,15}$/;
      if (!phoneRegex.test(formData.noHp)) {
        errors.noHp = 'Nomor HP harus berupa angka dan panjang 10-15 karakter';
      }
    } else {
      errors.noHp = 'Nomor HP harus diisi';
    }

    if (formData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        errors.email = 'Format email tidak valid';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const pData = { ...formData } as any;

      // If adding PK, also ensure it exists in Master PK (pks)
      if (formData.jenis === 'PK') {
        try {
          const cleanNama = formData.namaLembaga.replace(/\s+/g, '').toUpperCase().slice(0, 10);
          const cleanZona = (formData.zona || 'ZONA1').replace(/\s+/g, '').toUpperCase();
          const generatedPkId = `${cleanNama}_${cleanZona}_${Math.floor(100 + Math.random() * 900)}`;

          const pkRef = await addDoc(collection(db, 'pks'), {
            pkId: generatedPkId,
            namaPK: formData.namaLembaga,
            alamat: formData.alamatDomisili || '',
            zona: formData.zona || 'Zona 1',
            koorzon: formData.koorzon || '',
            status: formData.statusPimpinan || 'Aktif',
            organisasi: formData.organisasi || 'IPNU',
            kecamatan: formData.kecamatan || '',
            namaKetua: formData.namaKetua || '',
            noHp: formData.noHp || '',
            emailKomisariat: formData.email || '',
            tanggalBerdiri: '2024-01-01',
            jumlahAnggota: 0,
            statusVisitasi: 'Unvisited',
            priority: 'Medium',
            taskType: 'Regular Visit',
            lat: -6.7372,
            lng: 108.5507,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid
          });

          pData.pkDocId = pkRef.id;
          pData.pkId = generatedPkId;
        } catch (pkErr) {
          console.warn('Sync PK creation notice:', pkErr);
        }
      }

      ['namaKetua', 'noHp', 'email', 'alamatDomisili', 'namaLembaga'].forEach(f => {
        if (pData[f]) {
          const { encrypted } = encryptData(pData[f]);
          pData[f] = encrypted;
        }
      });
      pData._isEncrypted = true;

      const docRef = await addDoc(collection(db, 'pimpinan'), {
        ...pData,
        createdAt: new Date().toISOString(),
        createdBy: user?.uid
      });
      await logActivity(user?.uid, user?.email, 'CREATE_PIMPINAN', 'Pimpinan', docRef.id, { namaLembaga: formData.namaLembaga, jenis: formData.jenis });
      showToast(`Pimpinan ${formData.namaLembaga} (${formData.jenis}) berhasil ditambahkan dan disinkronkan`, 'success');
      setIsModalOpen(false);
      setFormData({
        namaLembaga: '',
        jenis: 'PAC',
        namaKetua: '',
        noHp: '',
        email: '',
        alamatDomisili: '',
        masaKhidmat: '',
        statusPimpinan: 'Aktif',
        logoUrl: '',
        organisasi: 'IPNU',
        kecamatan: '',
        zona: '',
        koorzon: ''
      });
      setFormErrors({});
    } catch (error) {
      console.error('Error adding pimpinan:', error);
      handleFirestoreError(error, OperationType.CREATE, 'pimpinan', auth);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Hapus data pimpinan ini?')) {
      const pimpinanToDelete = pimpinan.find(p => p.id === id);
      try {
        await deleteDoc(doc(db, 'pimpinan', id));
        if (pimpinanToDelete?.jenis === 'PK' && pimpinanToDelete.pkDocId) {
          try {
            await deleteDoc(doc(db, 'pks', pimpinanToDelete.pkDocId));
          } catch (pkErr) {
            console.warn('Sync delete PK notice:', pkErr);
          }
        }
        await logActivity(user?.uid, user?.email, 'DELETE_PIMPINAN', 'Pimpinan', id, { namaLembaga: pimpinanToDelete?.namaLembaga });
        showToast('Data pimpinan berhasil dihapus', 'success');
      } catch (error) {
        console.error('Error deleting pimpinan:', error);
        handleFirestoreError(error, OperationType.DELETE, `pimpinan/${id}`, auth);
      }
    }
  };

  const filtered = pimpinan.filter(p => 
    p.namaLembaga.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.namaKetua.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn(
      "p-4 pb-24 min-h-screen font-sans transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]",
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pt-12">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
              <Sparkles size={11} /> Caruban CORE Pimpinan
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-[var(--text-main)]">Database Pimpinan</h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">PAC (Kecamatan), PR (Desa), PK (Komisariat)</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 active:scale-95 transition-all disabled:opacity-50"
            title="Sinkronkan basis data Anggota, Master PK, dan Database Pimpinan"
          >
            <RefreshCw size={16} className={cn("text-white", isSyncing && "animate-spin")} />
            <span>{isSyncing ? 'Menyingkronkan...' : 'Sinkronkan Basis Data'}</span>
          </button>

          {(role === 'admin' || role === 'PC' || role === 'developer') && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-5 py-3 bg-[var(--accent-primary)] rounded-2xl shadow-lg shadow-[var(--accent-primary)]/20 active:scale-95 transition-all flex items-center gap-2 text-white font-bold text-xs"
            >
              <Plus size={18} /> Tambah Pimpinan
            </button>
          )}
        </div>
      </div>

      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={20} />
        <input
          type="text"
          placeholder="Cari lembaga atau ketua..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={cn(
            "w-full border rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-[var(--accent-primary)] transition-all text-sm bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-main)] shadow-sm",
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((p) => (
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            key={p.id}
            className={cn(
              "border rounded-[32px] p-8 relative overflow-hidden hover:border-[var(--accent-primary)]/50 transition-all flex flex-col justify-between bg-[var(--bg-card)] border-[var(--border-main)] shadow-sm",
            )}
          >
            <div>
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-16 h-16 rounded-2xl flex items-center justify-center border shrink-0",
                    p.statusPimpinan === 'Aktif' ? 'bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20' : 
                    p.statusPimpinan === 'Vakum' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 
                    'bg-[var(--bg-app)] text-[var(--text-muted)] border-[var(--border-main)]'
                  )}>
                    <Building2 size={32} />
                  </div>
                  <div className="min-w-0">
                    <h3 className={cn(
                      "font-black text-xl leading-tight truncate transition-colors text-[var(--text-main)]",
                    )}>{p.namaLembaga} <span className="text-[var(--accent-primary)] text-xs">({p.jenis})</span></h3>
                    <p className="text-zinc-500 text-sm font-medium mt-1 truncate">{p.namaKetua}</p>
                  </div>
                </div>
                {(role === 'admin') && (
                  <button
                    onClick={() => handleDelete(p.id)}
                    className={cn(
                      "w-10 h-10 border rounded-xl flex items-center justify-center transition-all shrink-0 bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-rose-500",
                    )}
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                  <Phone size={14} className="text-[var(--accent-primary)]" /> {p.noHp}
                </div>
                {p.email && (
                  <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-widest truncate">
                    <Mail size={14} className="text-[var(--accent-primary)] shrink-0" /> <span className="truncate">{p.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                  <Calendar size={14} className="text-[var(--accent-primary)] shrink-0" /> {p.masaKhidmat}
                </div>
                <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                  <Users size={14} className="text-[var(--accent-primary)] shrink-0" /> {p.organisasi}
                </div>
                <div className="flex items-center gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-widest">
                  <Layers size={14} className="text-[var(--accent-primary)] shrink-0" /> {p.zona}
                </div>
              </div>

              <div className="flex items-start gap-3 text-zinc-400 text-[11px] font-bold uppercase tracking-widest mb-6">
                <MapPin size={14} className="text-[var(--accent-primary)] shrink-0 mt-0.5" /> 
                <span className="line-clamp-2">{p.kecamatan}, {p.alamatDomisili}</span>
              </div>

              <div className={cn(
                "rounded-2xl p-4 border mb-6 transition-colors",
                isDark ? "bg-zinc-950 border-zinc-800" : "bg-zinc-50 border-zinc-200"
              )}>
                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-widest mb-1">Koordinator Zona</p>
                <p className={cn(
                  "text-[10px] font-bold leading-tight transition-colors",
                  isDark ? "text-zinc-400" : "text-zinc-600"
                )}>{p.koorzon}</p>
              </div>
            </div>

            <div className={cn(
              "pt-6 border-t flex flex-wrap justify-between items-center gap-3 transition-colors",
              isDark ? "border-zinc-800" : "border-zinc-200"
            )}>
              <div className="flex items-center gap-2.5">
                <Activity size={15} className="text-zinc-500" />
                <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                  p.statusPimpinan === 'Aktif' ? 'text-[var(--accent-primary)]' : 
                  p.statusPimpinan === 'Vakum' ? 'text-rose-500' : 'text-zinc-500'
                }`}>
                  {p.statusPimpinan}
                </span>
                <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {p.jumlahAnggota || 0} Kader
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  to={`/members?search=${encodeURIComponent(p.namaLembaga)}`}
                  className="text-[10px] text-zinc-400 hover:text-emerald-400 flex items-center gap-1 font-bold hover:underline"
                  title="Lihat anggota terdaftar"
                >
                  <Users size={12} className="text-emerald-500" /> Anggota
                </Link>
                {p.jenis === 'PK' && (
                  <Link
                    to={`/master-pk?search=${encodeURIComponent(p.namaLembaga)}`}
                    className="text-[10px] text-teal-400 hover:text-teal-300 flex items-center gap-1 font-bold hover:underline bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20"
                    title="Buka data di Master PK"
                  >
                    Master PK <ArrowRight size={10} />
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        ))}
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
                "relative w-full max-w-lg rounded-t-[40px] sm:rounded-[40px] p-8 max-h-[90vh] overflow-y-auto no-scrollbar border shadow-2xl transition-colors",
                isDark ? "bg-zinc-950 border-zinc-900" : "bg-white border-zinc-200"
              )}
            >
              <div className={cn(
                "w-12 h-1.5 rounded-full mx-auto mb-8 sm:hidden transition-colors",
                isDark ? "bg-zinc-800" : "bg-zinc-200"
              )} />
              <h2 className={cn(
                "text-2xl font-black mb-8 transition-colors",
                isDark ? "text-white" : "text-zinc-900"
              )}>Tambah Pimpinan</h2>
              
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Logo URL</label>
                    <input
                      type="url"
                      placeholder="https://..."
                      value={formData.logoUrl}
                      onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Nama Lembaga</label>
                    <input
                      required
                      type="text"
                      placeholder="PAC / PK / Ranting..."
                      value={formData.namaLembaga}
                      onChange={(e) => setFormData({...formData, namaLembaga: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Organisasi</label>
                      <select
                        required
                        value={formData.organisasi}
                        onChange={(e) => {
                          const org = e.target.value as 'IPNU' | 'IPPNU';
                          setFormData({ ...formData, organisasi: org, kecamatan: '', zona: '', koorzon: '' });
                        }}
                        className={cn(
                          "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all appearance-none",
                          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"
                        )}
                      >
                        <option value="IPNU">IPNU</option>
                        <option value="IPPNU">IPPNU</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Kecamatan</label>
                      <select
                        required
                        value={formData.kecamatan}
                        onChange={(e) => handleKecamatanChange(e.target.value, formData.organisasi)}
                        className={cn(
                          "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all appearance-none",
                          isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"
                        )}
                      >
                        <option value="" disabled>Pilih Kecamatan</option>
                        {getAllKecamatan(formData.organisasi).map(kec => (
                          <option key={kec} value={kec}>{kec}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Zona</label>
                      <input
                        readOnly
                        type="text"
                        value={formData.zona}
                        className={cn(
                          "w-full border rounded-2xl p-4 text-sm",
                          isDark ? "bg-zinc-900/50 border-zinc-800 text-zinc-500" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                        )}
                        placeholder="Otomatis..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Koorzon</label>
                      <textarea
                        readOnly
                        value={formData.koorzon}
                        className={cn(
                          "w-full border rounded-2xl p-4 text-[10px] resize-none min-h-[60px]",
                          isDark ? "bg-zinc-900/50 border-zinc-800 text-zinc-500" : "bg-zinc-100 border-zinc-200 text-zinc-500"
                        )}
                        placeholder="Otomatis..."
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Jenis</label>
                    <select
                      value={formData.jenis}
                      onChange={(e) => setFormData({...formData, jenis: e.target.value as any})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all appearance-none",
                        isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"
                      )}
                    >
                      <option value="PAC">PAC</option>
                      <option value="PR">PR</option>
                      <option value="PK">PK</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Nama Ketua</label>
                    <input
                      required
                      type="text"
                      placeholder="Nama lengkap ketua..."
                      value={formData.namaKetua}
                      onChange={(e) => setFormData({...formData, namaKetua: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">No. HP</label>
                      <input
                        required
                        type="tel"
                        placeholder="08..."
                        value={formData.noHp}
                        onChange={(e) => {
                          setFormData({...formData, noHp: e.target.value});
                          if (formErrors.noHp) setFormErrors({...formErrors, noHp: ''});
                        }}
                        className={cn(
                          "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all",
                          isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900",
                          formErrors.noHp ? "border-rose-500" : ""
                        )}
                      />
                      {formErrors.noHp && <p className="text-rose-500 text-xs ml-4">{formErrors.noHp}</p>}
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Email</label>
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={(e) => {
                          setFormData({...formData, email: e.target.value});
                          if (formErrors.email) setFormErrors({...formErrors, email: ''});
                        }}
                        className={cn(
                          "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all",
                          isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900",
                          formErrors.email ? "border-rose-500" : ""
                        )}
                      />
                      {formErrors.email && <p className="text-rose-500 text-xs ml-4">{formErrors.email}</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Masa Khidmat</label>
                    <input
                      required
                      type="text"
                      placeholder="2024-2026"
                      value={formData.masaKhidmat}
                      onChange={(e) => setFormData({...formData, masaKhidmat: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Alamat Domisili</label>
                    <textarea
                      required
                      placeholder="Alamat lengkap sekretariat..."
                      value={formData.alamatDomisili}
                      onChange={(e) => setFormData({...formData, alamatDomisili: e.target.value})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all min-h-[100px] resize-none",
                        isDark ? "bg-zinc-900 border-zinc-800 text-white" : "bg-zinc-50 border-zinc-200 text-zinc-900"
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-4">Status</label>
                    <select
                      required
                      value={formData.statusPimpinan}
                      onChange={(e) => setFormData({...formData, statusPimpinan: e.target.value as any})}
                      className={cn(
                        "w-full border rounded-2xl p-4 text-sm outline-none focus:border-[var(--accent-primary)] transition-all appearance-none",
                        isDark ? "bg-zinc-900 border-zinc-800 text-zinc-400" : "bg-zinc-50 border-zinc-200 text-zinc-600"
                      )}
                    >
                      {STATUS_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
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
                    className="flex-1 bg-[var(--accent-primary)] text-white font-black py-4 rounded-2xl shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 transition-all"
                  >
                    SIMPAN DATA
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

export default DatabasePimpinan;
