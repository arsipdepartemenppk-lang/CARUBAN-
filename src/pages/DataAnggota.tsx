import React, { useState, useEffect } from 'react';
import { 
  Users, UserPlus, Search, Filter, Download, Upload, MapPin, 
  Trash2, Edit, Eye, QrCode, Phone, Mail, Award, School, Map as MapIcon, 
  List, RefreshCw, X, Check, ShieldCheck, Wifi, WifiOff, HardDrive, Database, Loader2, Activity
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { MemberForm } from '../components/MemberForm';
import MemberMap from '../components/MemberMap';
import { CSVImportModal } from '../components/CSVImportModal';
import { MemberQRModal } from '../components/MemberQRModal';
import QRCode from 'react-qr-code';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { logActivity } from '../utils/activityLogger';
import { cacheCriticalMemberData, getCachedMemberData, getOfflineCacheStatus } from '../utils/offlineMemberCache';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Cell, AreaChart, Area 
} from 'recharts';
import { where, getDocs, limit as firestoreLimit } from 'firebase/firestore';
import { generateAutomaticNIA } from '../utils/niaGenerator';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { auth } from '../firebase';

export interface Member {
  id: string;
  namaLengkap: string;
  nomorIndukAnggota: string;
  noHp: string;
  email: string;
  namaSekolah: string;
  alamatSekolah: string;
  alamatLengkap: string;
  statusPimpinan: 'PAC' | 'PR' | 'PK' | 'PC' | 'Anggota';
  organisasi?: 'IPNU' | 'IPPNU';
  jenjangKaderisasi?: 'MAKESTA' | 'LAKMUD' | 'LAKUT' | 'LATIN' | 'Belum Kaderisasi';
  waktuKaderisasi?: string;
  tempatKaderisasi?: string;
  riwayatKaderisasi?: Record<string, { diikuti?: boolean; waktu?: string; tempat?: string }>;
  kelasTingkat: string;
  tanggalLahir: string;
  minatBakat?: string[];
  foto?: string;
  lat?: number;
  lng?: number;
  statusKeanggotaan?: 'Aktif' | 'Alumni' | 'Pengurus';
  createdAt?: string;
}

const INITIAL_FORM_DATA = {
  namaLengkap: '',
  nomorIndukAnggota: '',
  noHp: '',
  email: '',
  namaSekolah: '',
  alamatSekolah: '',
  alamatLengkap: '',
  statusPimpinan: 'PK' as const,
  organisasi: 'IPNU' as 'IPNU' | 'IPPNU',
  jenjangKaderisasi: 'Belum Kaderisasi' as 'MAKESTA' | 'LAKMUD' | 'LAKUT' | 'LATIN' | 'Belum Kaderisasi',
  waktuKaderisasi: '',
  tempatKaderisasi: '',
  riwayatKaderisasi: {
    makesta: { diikuti: false, waktu: '', tempat: '' },
    lakmud: { diikuti: false, waktu: '', tempat: '' },
    lakut: { diikuti: false, waktu: '', tempat: '' },
    latin: { diikuti: false, waktu: '', tempat: '' }
  },
  kelasTingkat: '',
  tanggalLahir: '',
  minatBakat: ['Jurnalistik'],
  foto: '',
  lat: -6.7372,
  lng: 108.5507,
  statusKeanggotaan: 'Aktif'
};

export const DataAnggota: React.FC = () => {
  const { user, role } = useFirebase();
  const { showToast } = useToast();
  
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [filterOrg, setFilterOrg] = useState<string>('Semua');
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  
  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(INITIAL_FORM_DATA);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [offlineCacheCount, setOfflineCacheCount] = useState<number>(0);
  const [activeDetailTab, setActiveDetailTab] = useState<'kta' | 'aktivitas'>('kta');
  const [activityData, setActivityData] = useState<any[]>([]);
  const [isActivityLoading, setIsActivityLoading] = useState(false);

  useEffect(() => {
    if (isDetailOpen && selectedMember) {
      fetchMemberActivity(selectedMember.id);
    } else {
      setActiveDetailTab('kta');
    }
  }, [isDetailOpen, selectedMember]);

  const fetchMemberActivity = async (memberId: string) => {
    setIsActivityLoading(true);
    try {
      const q = query(
        collection(db, 'attendances'), 
        where('memberId', '==', memberId),
        orderBy('createdAt', 'desc'),
        firestoreLimit(20)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Group by month/year for chart
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
      const currentYear = new Date().getFullYear();
      const initialData = months.map(m => ({ name: m, count: 0 }));
      
      docs.forEach((doc: any) => {
        const date = doc.createdAt ? new Date(doc.createdAt) : new Date();
        if (date.getFullYear() === currentYear) {
          initialData[date.getMonth()].count += 1;
        }
      });
      
      setActivityData(initialData);
    } catch (err) {
      console.error('Failed to fetch member activity:', err);
    } finally {
      setIsActivityLoading(false);
    }
  };

  useEffect(() => {
    // Check initial offline cache status
    getOfflineCacheStatus().then(status => {
      setOfflineCacheCount(status.count);
    });

    const handleOnline = () => setIsOfflineMode(false);
    const handleOffline = () => {
      setIsOfflineMode(true);
      loadOfflineFallback();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!user) return;

    const loadOfflineFallback = async () => {
      const cached = await getCachedMemberData();
      if (cached.members.length > 0) {
        setMembers(cached.members as Member[]);
        setOfflineCacheCount(cached.members.length);
        setIsOfflineMode(true);
        setLoading(false);
        showToast(`Memuat ${cached.members.length} data anggota dari cache offline`, 'info');
      }
    };

    const q = query(collection(db, 'members'), orderBy('namaLengkap', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));
        setMembers(data);
        cacheCriticalMemberData(data).then(() => {
          setOfflineCacheCount(data.length);
        });
      } else {
        setMembers([]);
      }
      setLoading(false);
    }, async (error) => {
      console.warn('Network / permission issue fetching members, loading offline cache:', error);
      await loadOfflineFallback();
    });

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const handleManualOfflineSync = async () => {
    if (members.length === 0) {
      showToast('Tidak ada data anggota untuk disimpan offline', 'info');
      return;
    }
    const success = await cacheCriticalMemberData(members);
    if (success) {
      setOfflineCacheCount(members.length);
      showToast(`${members.length} data anggota tersimpan di memori offline untuk visitasi`, 'success');
      
      // Attempt to register background sync if supported
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          await (registration as any).sync.register('sync-members');
          console.log('Background sync registered');
        } catch (err) {
          console.warn('Background sync registration failed', err);
        }
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      setUploading(true);
      reader.onload = (uploadEvent) => {
        setFormData({ ...formData, foto: uploadEvent.target?.result as string });
        setUploading(false);
        showToast('Foto profil berhasil diunggah', 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenAddForm = () => {
    const autoNia = generateAutomaticNIA({
      statusPimpinan: 'PK',
      existingNias: members.map(m => m.nomorIndukAnggota)
    });
    setEditingId(null);
    setFormData({
      ...INITIAL_FORM_DATA,
      nomorIndukAnggota: autoNia
    });
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Pastikan foto profil tersimpan konsisten
      const photoValue = formData.foto || formData.fotoUrl || '';
      const cleanedData = {
        ...formData,
        foto: photoValue,
        fotoUrl: photoValue,
      };

      if (editingId) {
        await updateDoc(doc(db, 'members', editingId), {
          ...cleanedData,
          updatedAt: new Date().toISOString(),
          updatedBy: user?.uid || 'system'
        });
        showToast('Data anggota berhasil diperbarui', 'success');
        logActivity(user?.uid, user?.email, 'UPDATE_MEMBER', 'members', editingId, { nama: formData.namaLengkap });
      } else {
        const docRef = await addDoc(collection(db, 'members'), {
          ...cleanedData,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || 'system'
        });
        showToast('Anggota baru berhasil ditambahkan dengan NIA ' + (cleanedData.nomorIndukAnggota || ''), 'success');
        logActivity(user?.uid, user?.email, 'ADD_MEMBER', 'members', docRef.id, { nama: formData.namaLengkap });
      }
      setIsFormOpen(false);
      setEditingId(null);
      setFormData(INITIAL_FORM_DATA);
    } catch (err: any) {
      console.error('Error saving member:', err);
      try {
        handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'members', auth);
      } catch (fErr: any) {
        const msg = (fErr.message && fErr.message.startsWith('{')) ? (JSON.parse(fErr.message)?.userFriendlyMessage || err.message) : err.message;
        showToast('Gagal menyimpan anggota: ' + msg, 'error');
      }
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'members', deleteConfirmId));
      showToast('Data anggota telah dihapus', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const handleBatchImport = async (importedList: any[]) => {
    try {
      let count = 0;
      const currentNias = [...members.map(m => m.nomorIndukAnggota)];
      for (const item of importedList) {
        if (item.namaLengkap || item.Nama) {
          const pimpinan = item.statusPimpinan || 'PK';
          const memberNia = item.nomorIndukAnggota || item.NIA || generateAutomaticNIA({
            statusPimpinan: pimpinan,
            existingNias: currentNias
          });
          currentNias.push(memberNia);

          await addDoc(collection(db, 'members'), {
            namaLengkap: item.namaLengkap || item.Nama || 'Anggota',
            nomorIndukAnggota: memberNia,
            noHp: item.noHp || item.Telepon || item.HP || '',
            email: item.email || item.Email || '',
            namaSekolah: item.namaSekolah || item.Sekolah || 'Sekolah/Pesantren',
            alamatSekolah: item.alamatSekolah || '',
            alamatLengkap: item.alamatLengkap || item.Alamat || 'Kabupaten Cirebon',
            statusPimpinan: pimpinan,
            kelasTingkat: item.kelasTingkat || 'X',
            tanggalLahir: item.tanggalLahir || '2005-01-01',
            minatBakat: item.minatBakat ? String(item.minatBakat).split(',') : ['Organisasi'],
            foto: item.foto || item.fotoUrl || '',
            fotoUrl: item.foto || item.fotoUrl || '',
            lat: item.lat || -6.7372,
            lng: item.lng || 108.5507,
            statusKeanggotaan: 'Aktif',
            createdAt: new Date().toISOString()
          });
          count++;
        }
      }
      showToast(`Berhasil mengimpor ${count} data anggota`, 'success');
      setIsImportOpen(false);
    } catch (err: any) {
      showToast('Gagal import: ' + err.message, 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = members.map(m => ({
      'Nama Lengkap': m.namaLengkap,
      'Organisasi': m.organisasi || 'IPNU',
      'Nomor Induk Anggota (NIA)': m.nomorIndukAnggota,
      'Jenjang Kaderisasi': m.jenjangKaderisasi || 'Belum Kaderisasi',
      'Waktu Pelaksanaan': m.waktuKaderisasi || '-',
      'Tempat Pelaksanaan': m.tempatKaderisasi || '-',
      'No. Telepon / WA': m.noHp,
      'Email': m.email,
      'Sekolah / Madrasah / Pesantren': m.namaSekolah,
      'Tingkat / Kelas': m.kelasTingkat,
      'Status Pimpinan': m.statusPimpinan,
      'Alamat Domisili': m.alamatLengkap,
      'Minat & Bakat': (m.minatBakat || []).join(', '),
      'Status': m.statusKeanggotaan || 'Aktif'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Anggota');
    XLSX.writeFile(workbook, `Data_Kader_IPNU_IPPNU_Kab_Cirebon_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('File Excel berhasil diunduh', 'success');
  };

  const filteredMembers = members.filter(m => {
    const queryMatch = 
      m.namaLengkap.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.nomorIndukAnggota.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.namaSekolah.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = filterStatus === 'Semua' || m.statusPimpinan === filterStatus;
    const orgMatch = filterOrg === 'Semua' || (m.organisasi || 'IPNU') === filterOrg;
    return queryMatch && statusMatch && orgMatch;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Database Kaderisasi
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Users className="text-emerald-500" />
            Data Anggota & Kader Pelajar
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Total {members.length} anggota terdaftar di seluruh PAC dan PK se-Kabupaten Cirebon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleManualOfflineSync}
            title="Simpan data anggota ke memori PWA offline untuk kunjungan ke pelosok tanpa sinyal"
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-emerald-500/30 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all shadow-sm"
          >
            <HardDrive size={15} />
            <span>Cache Offline ({offlineCacheCount})</span>
          </button>

          <button
            onClick={() => setViewMode(viewMode === 'table' ? 'map' : 'table')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            {viewMode === 'table' ? <MapIcon size={16} className="text-emerald-400" /> : <List size={16} className="text-blue-400" />}
            {viewMode === 'table' ? 'Peta Sebaran' : 'Tampilan Tabel'}
          </button>

          <button
            onClick={() => setIsImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <Upload size={16} className="text-indigo-400" />
            Import CSV
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <Download size={16} className="text-teal-400" />
            Export Excel
          </button>

          <button
            onClick={handleOpenAddForm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
          >
            <UserPlus size={16} /> Tambah Anggota
          </button>
        </div>
      </div>

      {/* Sync Center Banner */}
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-[32px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <Database className="text-emerald-500" size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-[var(--text-main)] flex items-center gap-2">
              Sync Center PWA
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                isOfflineMode ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              )}>
                {isOfflineMode ? 'Offline Mode' : 'Online'}
              </span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xl">
              Gunakan fitur ini untuk menyimpan data anggota ke memori perangkat sebelum melakukan visitasi ke area minim sinyal. 
              Data yang tersimpan memungkinkan pencarian dan verifikasi NIA tetap berjalan tanpa koneksi internet.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-500 uppercase tracking-wider">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {offlineCacheCount} Data Tersimpan
              </div>
              <div className="text-[10px] text-[var(--text-muted)] font-medium">
                Update Terakhir: {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleManualOfflineSync}
          disabled={loading}
          className="flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/20 active:scale-95 shrink-0"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          Sinkronisasi Data Sekarang
        </button>
      </div>


      {/* Offline Status Alert Banner */}
      {isOfflineMode && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between text-xs text-amber-300">
          <div className="flex items-center gap-3">
            <WifiOff size={18} className="text-amber-400 shrink-0" />
            <div>
              <p className="font-bold">Mode Offline Kunjungan Aktif</p>
              <p className="text-amber-300/80 text-[11px]">
                Aplikasi sedang menggunakan data anggota yang dicache oleh Service Worker PWA ({offlineCacheCount} data). Anda tetap dapat melihat biodata, nomor NIA, dan peta sekolah secara offline.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-[10px] font-mono font-bold uppercase shrink-0">
            PWA Offline
          </span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari nama, NIA, atau nama sekolah..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none flex-wrap sm:flex-nowrap">
          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap">
            Organisasi:
          </span>
          {['Semua', 'IPNU', 'IPPNU'].map((org) => (
            <button
              key={org}
              onClick={() => setFilterOrg(org)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                filterOrg === org
                  ? (org === 'IPPNU' ? "bg-teal-600 text-white shadow-md shadow-teal-600/20" : "bg-emerald-600 text-white shadow-md shadow-emerald-600/20")
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
              )}
            >
              {org}
            </button>
          ))}

          <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider whitespace-nowrap ml-2">
            Tingkatan:
          </span>
          {['Semua', 'PC', 'PAC', 'PK', 'PR', 'Anggota'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                filterStatus === st
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
              )}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Content View */}
      {viewMode === 'map' ? (
        <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-lg overflow-hidden">
          <MemberMap members={filteredMembers} />
        </div>
      ) : (
        <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--border-main)] bg-[var(--bg-app)]/50 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                  <th className="py-4 px-6">Anggota / Pelajar</th>
                  <th className="py-4 px-6">NIA & Organisasi</th>
                  <th className="py-4 px-6">Sekolah & Kaderisasi</th>
                  <th className="py-4 px-6">Tingkatan</th>
                  <th className="py-4 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-main)] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Memuat data anggota...
                    </td>
                  </tr>
                ) : filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                      Tidak ada data anggota yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-app)]/40 transition-colors group">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 overflow-hidden flex items-center justify-center shrink-0">
                            {m.foto ? (
                              <img src={m.foto} alt={m.namaLengkap} className="w-full h-full object-cover" />
                            ) : (
                              <Users size={18} className="text-emerald-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-[var(--text-main)] text-sm group-hover:text-emerald-400 transition-colors">
                              {m.namaLengkap}
                            </p>
                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-1">{m.alamatLengkap}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md text-[11px]">
                            {m.nomorIndukAnggota || '-'}
                          </span>
                          <span className={cn(
                            "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                            (m.organisasi || 'IPNU') === 'IPPNU' 
                              ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          )}>
                            {m.organisasi || 'IPNU'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--text-muted)] mt-1 flex items-center gap-1">
                          <Phone size={11} /> {m.noHp || '-'}
                        </p>
                      </td>

                      <td className="py-4 px-6">
                        <p className="font-bold text-[var(--text-main)]">{m.namaSekolah}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[10px] text-[var(--text-muted)]">{m.kelasTingkat || '-'}</span>
                          {m.jenjangKaderisasi && m.jenjangKaderisasi !== 'Belum Kaderisasi' && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold">
                              {m.jenjangKaderisasi}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider",
                          m.statusPimpinan === 'PC' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                          m.statusPimpinan === 'PAC' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          m.statusPimpinan === 'PK' ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                          m.statusPimpinan === 'PR' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        )}>
                          {m.statusPimpinan}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedMember(m);
                              setIsDetailOpen(true);
                            }}
                            className="p-2 rounded-xl bg-[var(--bg-app)] hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            title="Lihat KTA Digital"
                          >
                            <QrCode size={15} />
                          </button>
                          <button
                            onClick={() => {
                              setEditingId(m.id);
                              setFormData({
                                namaLengkap: m.namaLengkap,
                                nomorIndukAnggota: m.nomorIndukAnggota,
                                noHp: m.noHp,
                                email: m.email,
                                namaSekolah: m.namaSekolah,
                                alamatSekolah: m.alamatSekolah,
                                alamatLengkap: m.alamatLengkap,
                                statusPimpinan: m.statusPimpinan,
                                organisasi: m.organisasi || 'IPNU',
                                jenjangKaderisasi: m.jenjangKaderisasi || 'Belum Kaderisasi',
                                waktuKaderisasi: m.waktuKaderisasi || '',
                                tempatKaderisasi: m.tempatKaderisasi || '',
                                riwayatKaderisasi: m.riwayatKaderisasi || {
                                  makesta: { diikuti: m.jenjangKaderisasi === 'MAKESTA', waktu: m.waktuKaderisasi || '', tempat: m.tempatKaderisasi || '' },
                                  lakmud: { diikuti: m.jenjangKaderisasi === 'LAKMUD', waktu: '', tempat: '' },
                                  lakut: { diikuti: m.jenjangKaderisasi === 'LAKUT', waktu: '', tempat: '' },
                                  latin: { diikuti: m.jenjangKaderisasi === 'LATIN', waktu: '', tempat: '' }
                                },
                                kelasTingkat: m.kelasTingkat,
                                tanggalLahir: m.tanggalLahir,
                                minatBakat: m.minatBakat || ['Organisasi'],
                                foto: m.foto || '',
                                lat: m.lat || -6.7372,
                                lng: m.lng || 108.5507,
                                statusKeanggotaan: m.statusKeanggotaan || 'Aktif'
                              });
                              setIsFormOpen(true);
                            }}
                            className="p-2 rounded-xl bg-[var(--bg-app)] hover:bg-blue-500/20 text-blue-400 transition-colors"
                            title="Edit Data"
                          >
                            <Edit size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(m.id)}
                            className="p-2 rounded-xl bg-[var(--bg-app)] hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Hapus Data"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal (Add / Edit) */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-3xl my-8 overflow-hidden shadow-2xl"
            >
              <div className="flex justify-between items-center p-6 border-b border-[var(--border-main)]">
                <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <UserPlus className="text-emerald-500" />
                  {editingId ? 'Edit Data Anggota' : 'Registrasi Anggota Baru'}
                </h3>
                <button onClick={() => setIsFormOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                <MemberForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={handleFormSubmit}
                  onCancel={() => {
                    setIsFormOpen(false);
                    setEditingId(null);
                  }}
                  resetForm={() => {
                    setFormData(INITIAL_FORM_DATA);
                    setEditingId(null);
                  }}
                  uploading={uploading}
                  handleFileChange={handleFileChange}
                  existingNias={members.map(m => m.nomorIndukAnggota)}
                  membersList={members}
                  editingId={editingId}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* KTA / Detail Member Modal */}
      <AnimatePresence>
        {isDetailOpen && selectedMember && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl space-y-4"
            >
              <div className="flex justify-between items-center p-5 border-b border-[var(--border-main)]">
                <h3 className="font-black text-sm text-[var(--text-main)] flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-400" />
                  KTA Digital Pelajar NU
                </h3>
                <button onClick={() => setIsDetailOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={18} />
                </button>
              </div>

              {/* Tabs for Detail */}
              <div className="flex px-6 pt-2 border-b border-[var(--border-main)]">
                <button
                  onClick={() => setActiveDetailTab('kta')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                    activeDetailTab === 'kta' ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-muted)]"
                  )}
                >
                  KTA Digital
                </button>
                <button
                  onClick={() => setActiveDetailTab('aktivitas')}
                  className={cn(
                    "flex-1 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                    activeDetailTab === 'aktivitas' ? "border-emerald-500 text-emerald-400" : "border-transparent text-[var(--text-muted)]"
                  )}
                >
                  Aktivitas & Partisipasi
                </button>
              </div>

              {/* Content Based on Tab */}
              <div className="p-6">
                {activeDetailTab === 'kta' ? (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-br from-emerald-900 via-teal-950 to-slate-950 p-6 rounded-3xl border border-emerald-500/30 text-white shadow-xl relative overflow-hidden">
                      <div className="flex items-center justify-between border-b border-white/20 pb-4 mb-4">
                        <div>
                          <h4 className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">KARTU TANDA ANGGOTA DIGITAL</h4>
                          <h2 className="text-base font-black tracking-tight">
                            {selectedMember.organisasi === 'IPPNU' ? 'PC IPPNU KAB. CIREBON' : 'PC IPNU KAB. CIREBON'}
                          </h2>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/10 p-1 flex items-center justify-center">
                          <img 
                            src="https://res.cloudinary.com/dxsbefd16/image/upload/q_auto/f_auto/v1775730419/Logo_CARUBAN_CORE_dengan_motif_Mega_Mendung-removebg-preview_gszxaq.png" 
                            alt="Logo" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      <div className="flex gap-4 items-center">
                        <div className="w-20 h-24 rounded-2xl bg-white/10 border border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
                          {selectedMember.foto ? (
                            <img src={selectedMember.foto} alt={selectedMember.namaLengkap} className="w-full h-full object-cover" />
                          ) : (
                            <Users size={32} className="text-white/40" />
                          )}
                        </div>

                        <div className="space-y-1 text-xs">
                          <h3 className="font-black text-sm text-white">{selectedMember.namaLengkap}</h3>
                          <p className="font-mono text-emerald-300 font-bold text-[11px]">{selectedMember.nomorIndukAnggota}</p>
                          <p className="text-white/80 text-[11px]">{selectedMember.namaSekolah}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-bold uppercase">
                              {selectedMember.organisasi || 'IPNU'} • {selectedMember.statusPimpinan}
                            </span>
                            {selectedMember.riwayatKaderisasi && Object.values(selectedMember.riwayatKaderisasi).some((v: any) => v?.diikuti) ? (
                              Object.entries(selectedMember.riwayatKaderisasi)
                                .filter(([_, v]: any) => v?.diikuti)
                                .map(([k, v]: any) => (
                                  <span key={k} className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase" title={`${v.waktu || ''} ${v.tempat || ''}`}>
                                    {k.toUpperCase()}
                                  </span>
                                ))
                            ) : selectedMember.jenjangKaderisasi && selectedMember.jenjangKaderisasi !== 'Belum Kaderisasi' ? (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[9px] font-bold uppercase">
                                {selectedMember.jenjangKaderisasi}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-white/20 flex items-center justify-between">
                        <div className="text-[9px] text-white/60">
                          <p>Berlaku Selama Menjadi Pelajar</p>
                          <p>Sistem Digital Caruban Core</p>
                        </div>
                        <div 
                          onClick={() => setIsQRModalOpen(true)}
                          className="bg-white p-1.5 rounded-xl cursor-pointer hover:scale-105 transition-transform shadow-md group relative"
                          title="Klik untuk memperbesar QR Code & simpan foto"
                        >
                          <QRCode value={`${selectedMember.organisasi || 'IPNU'}:${selectedMember.nomorIndukAnggota}:${selectedMember.namaLengkap}`} size={48} />
                          <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-bold">
                            Perbesar
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        onClick={() => setIsQRModalOpen(true)}
                        className="py-2.5 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-emerald-400 font-bold text-xs border border-zinc-700 flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm"
                      >
                        <QrCode size={14} /> Perbesar QR
                      </button>
                      <button
                        onClick={() => window.print()}
                        className="py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                      >
                        Cetak KTA
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-main)]">
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Statistik Kehadiran Bulanan</h4>
                      <div className="h-40 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityData}>
                            <defs>
                              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                            <XAxis dataKey="name" stroke="#52525b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                            />
                            <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Riwayat Aktivitas Terakhir</h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                        {isActivityLoading ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="animate-spin text-emerald-500" size={20} />
                          </div>
                        ) : activityData.some(d => d.count > 0) ? (
                          <div className="space-y-2">
                             <p className="text-[10px] text-zinc-400 text-center py-4 bg-zinc-900/50 rounded-xl border border-zinc-800 italic">
                               Anggota ini aktif dalam beberapa kegiatan terbaru.
                             </p>
                          </div>
                        ) : (
                          <div className="text-center py-8 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
                            <Activity size={24} className="mx-auto text-zinc-700 mb-2 opacity-20" />
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Belum ada riwayat tercatat</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <CSVImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onImport={handleBatchImport}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Data Anggota"
        message="Apakah Anda yakin ingin menghapus data anggota ini secara permanen?"
        onConfirm={handleDeleteMember}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* High-Resolution Member QR Code Modal */}
      <MemberQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        member={selectedMember}
      />
    </div>
  );
};

export default DataAnggota;
