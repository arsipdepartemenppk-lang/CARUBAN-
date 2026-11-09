import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Building2, Plus, Search, Filter, Download, Trash2, Edit2, 
  MapPin, Phone, Mail, Award, CheckCircle, X, ChevronRight, Eye, RefreshCw,
  BarChart3, PieChart as PieIcon, TrendingUp, Layers, Users, School, Sparkles, CheckCircle2
} from 'lucide-react';
import { onSnapshot, query, collection, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { pkService, MasterPK } from '../services/pkService';
import { syncAllData, SyncReport } from '../services/dataSyncService';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { IPNU_ZONES, IPPNU_ZONES } from '../constants/zones';
import { 
  ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, 
  Tooltip, Legend, XAxis, YAxis, CartesianGrid 
} from 'recharts';

const INITIAL_PK_DATA = {
  pkId: '',
  namaPK: '',
  alamat: '',
  zona: 'Zona 1',
  koorzon: 'Koorzon 1',
  status: 'Aktif' as const,
  organisasi: 'IPNU' as const,
  kecamatan: '',
  namaKetua: '',
  noHp: '',
  emailKomisariat: '',
  tanggalBerdiri: '2020-01-01',
  jumlahAnggota: 0,
  statusVisitasi: 'Unvisited' as const,
  priority: 'Medium' as const,
  taskType: 'Regular Visit' as const,
  lat: -6.7372,
  lng: 108.5507
};

export const DataMasterPK: React.FC = () => {
  const { user } = useFirebase();
  const { showToast } = useToast();
  
  const [pks, setPks] = useState<MasterPK[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedZona, setSelectedZona] = useState<string>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>(INITIAL_PK_DATA);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<SyncReport | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [members, setMembers] = useState<any[]>([]);
  const [chartView, setChartView] = useState<'bar' | 'pie' | 'zona'>('bar');
  const [selectedTingkatHover, setSelectedTingkatHover] = useState<string | null>(null);

  const handleSyncData = async () => {
    setIsSyncing(true);
    showToast('Menyelaraskan data Anggota, Master PK, dan Pimpinan...', 'info');
    try {
      const report = await syncAllData({ uid: user?.uid, email: user?.email || undefined });
      setSyncReport(report);
      setIsSyncModalOpen(true);
      showToast(`Sinkronisasi berhasil! Rekonsiliasi ${report.memberCountsUpdated} data kader.`, 'success');
    } catch (err: any) {
      console.error('Error synchronizing:', err);
      showToast('Gagal melakukan sinkronisasi: ' + err.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const q = pkService.getPKsQuery();
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MasterPK));
      setPks(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching PKs:', err);
      showToast('Gagal memuat data PK', 'error');
      setLoading(false);
    });

    const unsubMembers = onSnapshot(collection(db, 'members'), (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setMembers(data);
    }, (err) => {
      console.warn('Error fetching members for distribution chart:', err);
    });

    return () => {
      unsub();
      unsubMembers();
    };
  }, []);

  // Aggregated distribution data across tingkatan (PR / PK / PAC) - Purely from actual database
  const distributionData = useMemo(() => {
    // Count real members from members collection by tingkat / statusPimpinan
    const prMembersCount = members.filter(m => {
      const t = (m.statusPimpinan || m.tingkat || m.level || '').toUpperCase();
      return t === 'PR' || t === 'RANTING';
    }).length;

    const pkMembersCount = members.filter(m => {
      const t = (m.statusPimpinan || m.tingkat || m.level || '').toUpperCase();
      return t === 'PK' || t === 'KOMISARIAT';
    }).length;

    const pacMembersCount = members.filter(m => {
      const t = (m.statusPimpinan || m.tingkat || m.level || '').toUpperCase();
      return t === 'PAC' || t === 'ANAK CABANG';
    }).length;

    // Aggregate PK from Master PK database
    const pkFromMaster = pks.reduce((sum, p) => sum + (Number(p.jumlahAnggota) || 0), 0);
    const effectivePkCount = Math.max(pkMembersCount, pkFromMaster);
    const effectivePrCount = prMembersCount;
    const effectivePacCount = pacMembersCount;

    const total = effectivePrCount + effectivePkCount + effectivePacCount;

    const byTingkat = [
      {
        tingkat: 'PR',
        label: 'Pimpinan Ranting (Desa)',
        short: 'PR (Ranting)',
        jumlah: effectivePrCount,
        persentase: total > 0 ? Number(((effectivePrCount / total) * 100).toFixed(1)) : 0,
        color: '#f59e0b', // Amber
        badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      },
      {
        tingkat: 'PK',
        label: 'Pimpinan Komisariat (Sekolah/Pesantren)',
        short: 'PK (Komisariat)',
        jumlah: effectivePkCount,
        persentase: total > 0 ? Number(((effectivePkCount / total) * 100).toFixed(1)) : 0,
        color: '#14b8a6', // Teal
        badgeClass: 'bg-teal-500/10 text-teal-400 border-teal-500/20'
      },
      {
        tingkat: 'PAC',
        label: 'Pimpinan Anak Cabang (Kecamatan)',
        short: 'PAC (Anak Cabang)',
        jumlah: effectivePacCount,
        persentase: total > 0 ? Number(((effectivePacCount / total) * 100).toFixed(1)) : 0,
        color: '#3b82f6', // Blue
        badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
      }
    ];

    // Sebaran per 6 Zona Kabupaten Cirebon berdasarkan data aktual
    const byZona = ['Zona 1', 'Zona 2', 'Zona 3', 'Zona 4', 'Zona 5', 'Zona 6'].map((z) => {
      const zoneKecamatans = (IPNU_ZONES.find(iz => iz.zona === z)?.kecamatan || []).map(k => k.toLowerCase());

      const pksInZone = pks.filter(p => p.zona === z);
      const pkMasterZoneCount = pksInZone.reduce((sum, p) => sum + (Number(p.jumlahAnggota) || 0), 0);
      
      const pkMembersInZone = members.filter(m => {
        const t = (m.statusPimpinan || m.tingkat || m.level || '').toUpperCase();
        if (t !== 'PK' && t !== 'KOMISARIAT') return false;
        if (m.zona === z) return true;
        const kec = (m.kecamatan || '').toLowerCase();
        return kec ? zoneKecamatans.includes(kec) : false;
      }).length;
      const pkZoneCount = Math.max(pkMasterZoneCount, pkMembersInZone);

      const prZoneCount = members.filter(m => {
        const t = (m.statusPimpinan || m.tingkat || m.level || '').toUpperCase();
        if (t !== 'PR' && t !== 'RANTING') return false;
        if (m.zona === z) return true;
        const kec = (m.kecamatan || '').toLowerCase();
        return kec ? zoneKecamatans.includes(kec) : false;
      }).length;

      const pacZoneCount = members.filter(m => {
        const t = (m.statusPimpinan || m.tingkat || m.level || '').toUpperCase();
        if (t !== 'PAC' && t !== 'ANAK CABANG') return false;
        if (m.zona === z) return true;
        const kec = (m.kecamatan || '').toLowerCase();
        return kec ? zoneKecamatans.includes(kec) : false;
      }).length;

      return {
        zona: z,
        'PR (Ranting)': prZoneCount,
        'PK (Komisariat)': pkZoneCount,
        'PAC (Kecamatan)': pacZoneCount,
        Total: prZoneCount + pkZoneCount + pacZoneCount
      };
    });

    return {
      byTingkat,
      byZona,
      total,
      effectivePrCount,
      effectivePkCount,
      effectivePacCount
    };
  }, [members, pks]);

  const handleOpenAdd = async () => {
    setEditingId(null);
    setFormData(INITIAL_PK_DATA);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pk: MasterPK) => {
    setEditingId(pk.id);
    setFormData({
      pkId: pk.pkId || '',
      namaPK: pk.namaPK || '',
      alamat: pk.alamat || '',
      zona: pk.zona || 'Zona 1',
      koorzon: pk.koorzon || 'Koorzon 1',
      status: pk.status || 'Aktif',
      organisasi: pk.organisasi || 'IPNU',
      kecamatan: pk.kecamatan || '',
      namaKetua: pk.namaKetua || '',
      noHp: pk.noHp || '',
      emailKomisariat: pk.emailKomisariat || '',
      tanggalBerdiri: pk.tanggalBerdiri || '2020-01-01',
      jumlahAnggota: pk.jumlahAnggota || 0,
      statusVisitasi: pk.statusVisitasi || 'Unvisited',
      priority: pk.priority || 'Medium',
      taskType: pk.taskType || 'Regular Visit',
      lat: pk.lat || -6.7372,
      lng: pk.lng || 108.5507
    });
    setIsModalOpen(true);
  };

  const handleKecamatanChange = (kecamatan: string, organisasi: 'IPNU' | 'IPPNU') => {
    const zones = organisasi === 'IPNU' ? IPNU_ZONES : IPPNU_ZONES;
    const foundZone = zones.find(z => z.kecamatan.includes(kecamatan));
    
    if (foundZone) {
      setFormData((prev: any) => ({ 
        ...prev, 
        kecamatan, 
        organisasi,
        zona: foundZone.zona, 
        koorzon: foundZone.koorzon 
      }));
    } else {
      setFormData((prev: any) => ({ 
        ...prev, 
        kecamatan, 
        organisasi,
        zona: '', 
        koorzon: '' 
      }));
    }
  };

  const getAllKecamatan = (organisasi: 'IPNU' | 'IPPNU') => {
    const zones = organisasi === 'IPNU' ? IPNU_ZONES : IPPNU_ZONES;
    const allKec = zones.flatMap(z => z.kecamatan);
    return Array.from(new Set(allKec)).sort();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaPK.trim()) {
      showToast('Nama PK/Komisariat wajib diisi', 'error');
      return;
    }

    try {
      if (editingId) {
        await pkService.updatePK(editingId, formData, user?.uid || 'system');
        showToast('Data PK berhasil diperbarui', 'success');
      } else {
        let generatedId = formData.pkId;
        if (!generatedId) {
          generatedId = await pkService.generatePkId(formData.namaPK, formData.zona);
        }
        await pkService.addPK({ ...formData, pkId: generatedId }, user?.uid || 'system');
        showToast('Komisariat baru berhasil ditambahkan', 'success');
      }
      setIsModalOpen(false);
      setFormData(INITIAL_PK_DATA);
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await pkService.deletePK(deleteConfirmId);
      showToast('Komisariat berhasil dihapus', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const handleExportExcel = () => {
    const exportData = pks.map(p => ({
      'ID PK': p.pkId,
      'Nama Komisariat': p.namaPK,
      'Kecamatan': p.kecamatan,
      'Zona': p.zona,
      'Koordinator Zona': p.koorzon,
      'Nama Ketua': p.namaKetua,
      'No. Telepon / WA': p.noHp,
      'Status': p.status,
      'Status Visitasi': p.statusVisitasi,
      'Jumlah Anggota': p.jumlahAnggota || 0,
      'Alamat': p.alamat
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master PK');
    XLSX.writeFile(workbook, `Data_Master_PK_IPNU_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('File Excel Master PK berhasil diunduh', 'success');
  };

  const filteredPks = pks.filter(p => {
    const matchSearch = p.namaPK.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.kecamatan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        p.namaKetua.toLowerCase().includes(searchTerm.toLowerCase());
    const matchZona = selectedZona === 'Semua' || p.zona === selectedZona;
    const matchStatus = selectedStatus === 'Semua' || p.status === selectedStatus;
    return matchSearch && matchZona && matchStatus;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20">
              Direktori Lembaga
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Building2 className="text-teal-400" />
            Master Pimpinan Komisariat (PK)
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Basis data kelembagaan pimpinan komisariat sekolah, madrasah, dan pondok pesantren se-Kab. Cirebon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSyncData}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 active:scale-95 transition-all disabled:opacity-50"
            title="Sinkronkan basis data Anggota, Master PK, dan Database Pimpinan"
          >
            <RefreshCw size={15} className={cn("text-white", isSyncing && "animate-spin")} />
            <span>{isSyncing ? 'Menyingkronkan...' : 'Sinkronkan Basis Data'}</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <Download size={16} className="text-teal-400" />
            Export Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Tambah Komisariat
          </button>
        </div>
      </div>

      {/* Interactive Recharts Visualization: Distribusi Kader PR / PK / PAC */}
      <div className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center gap-1">
                <Sparkles size={11} /> Visualisasi Data Recharts
              </span>
              <span className="text-[10px] text-zinc-400 font-mono">
                Total: {distributionData.total.toLocaleString('id-ID')} Kader
              </span>
            </div>
            <h2 className="text-lg md:text-xl font-black text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp className="text-teal-400" size={20} />
              Distribusi Jumlah Anggota Berdasarkan Tingkatan (PR / PK / PAC)
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Perbandingan sebaran kader antara Pimpinan Ranting (Desa), Pimpinan Komisariat (Sekolah/Pesantren), dan Pimpinan Anak Cabang (Kecamatan).
            </p>
          </div>

          {/* Interactive Chart Mode Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)] shrink-0 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setChartView('bar')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                chartView === 'bar'
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <BarChart3 size={14} /> Batang
            </button>
            <button
              type="button"
              onClick={() => setChartView('pie')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                chartView === 'pie'
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <PieIcon size={14} /> Donut
            </button>
            <button
              type="button"
              onClick={() => setChartView('zona')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                chartView === 'zona'
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
              )}
            >
              <Layers size={14} /> Sebaran Zona
            </button>
          </div>
        </div>

        {/* 3 Interactive KPI Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {distributionData.byTingkat.map((item) => (
            <div
              key={item.tingkat}
              onMouseEnter={() => setSelectedTingkatHover(item.tingkat)}
              onMouseLeave={() => setSelectedTingkatHover(null)}
              className={cn(
                "p-4 rounded-2xl border transition-all cursor-pointer",
                selectedTingkatHover === item.tingkat
                  ? "border-teal-500 bg-teal-500/5 scale-[1.02]"
                  : "bg-[var(--bg-app)] border-[var(--border-main)] hover:border-zinc-700"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("px-2.5 py-0.5 rounded-md text-[10px] font-black border", item.badgeClass)}>
                  {item.short}
                </span>
                <span className="text-xs font-mono font-bold text-zinc-400">
                  {item.persentase}%
                </span>
              </div>
              <div className="text-2xl font-black text-[var(--text-main)] tracking-tight">
                {item.jumlah.toLocaleString('id-ID')}
                <span className="text-xs font-normal text-[var(--text-muted)] ml-1.5">Kader</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 truncate">
                {item.label}
              </p>
              {/* Progress bar */}
              <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden mt-3">
                <div 
                  className="h-full rounded-full transition-all duration-500" 
                  style={{ width: `${item.persentase}%`, backgroundColor: item.color }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Interactive Chart Container */}
        <div className="p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)]">
          {distributionData.total === 0 ? (
            <div className="h-64 sm:h-72 w-full flex flex-col items-center justify-center text-center p-6 bg-zinc-900/20 rounded-2xl border border-dashed border-zinc-800">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mb-3">
                <BarChart3 className="text-teal-400" size={24} />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-main)]">Data Distribusi Aktual: 0 Anggota Terdaftar</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-md mt-1">
                Data contoh/dummy distribusi telah dinonaktifkan. Grafik akan terisi secara otomatis saat kader baru didaftarkan atau jumlah anggota komisariat diisi pada database.
              </p>
            </div>
          ) : (
            <div className="h-64 sm:h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                {chartView === 'bar' ? (
                <BarChart data={distributionData.byTingkat} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                  <XAxis 
                    dataKey="short" 
                    tick={{ fill: '#888', fontSize: 11, fontWeight: 'bold' }} 
                    stroke="#555" 
                  />
                  <YAxis 
                    tick={{ fill: '#888', fontSize: 11 }} 
                    stroke="#555"
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '16px', 
                      color: '#fff', 
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)'
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('id-ID')} Anggota`, 'Jumlah Kader']}
                  />
                  <Bar dataKey="jumlah" radius={[12, 12, 0, 0]} maxBarSize={70}>
                    {distributionData.byTingkat.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              ) : chartView === 'pie' ? (
                <PieChart>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '16px', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }}
                    formatter={(value: any) => [`${Number(value).toLocaleString('id-ID')} Anggota`, 'Jumlah']}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(value) => <span className="text-xs text-zinc-300 font-bold mx-1">{value}</span>}
                  />
                  <Pie
                    data={distributionData.byTingkat}
                    dataKey="jumlah"
                    nameKey="short"
                    cx="50%"
                    cy="48%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={5}
                  >
                    {distributionData.byTingkat.map((entry, index) => (
                      <Cell key={`cell-pie-${index}`} fill={entry.color} stroke="#18181b" strokeWidth={2} />
                    ))}
                  </Pie>
                </PieChart>
              ) : (
                <BarChart data={distributionData.byZona} margin={{ top: 15, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.3} />
                  <XAxis dataKey="zona" tick={{ fill: '#888', fontSize: 11, fontWeight: 'bold' }} stroke="#555" />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} stroke="#555" tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '16px', 
                      color: '#fff', 
                      fontSize: '12px' 
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-zinc-300 font-bold mx-1">{value}</span>} />
                  <Bar dataKey="PR (Ranting)" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="PK (Komisariat)" stackId="a" fill="#14b8a6" />
                  <Bar dataKey="PAC (Kecamatan)" stackId="a" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
          )}
          <div className="flex flex-wrap items-center justify-between text-[11px] text-[var(--text-muted)] pt-3 border-t border-[var(--border-main)] mt-2">
            <span className="flex items-center gap-1.5">
              <Users size={13} className="text-teal-400" />
              Data terintegrasi real-time dengan database keanggotaan Caruban CORE
            </span>
            <span className="font-mono text-zinc-500">
              * Proporsi: PR (Ranting Desa), PK (Komisariat), PAC (Anak Cabang)
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari komisariat, kecamatan, ketua..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-teal-500/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <select
            value={selectedZona}
            onChange={(e) => setSelectedZona(e.target.value)}
            className="bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] focus:outline-none"
          >
            <option value="Semua">Semua Zona</option>
            {IPNU_ZONES.map(z => (
              <option key={z.zona} value={z.zona}>{z.zona}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] focus:outline-none"
          >
            <option value="Semua">Semua Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Non Aktif">Non Aktif</option>
            <option value="Vakum">Vakum</option>
          </select>
        </div>
      </div>

      {/* PK Table */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-[var(--bg-app)]/50 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                <th className="py-4 px-6">ID & Komisariat</th>
                <th className="py-4 px-6">Zona & Kecamatan</th>
                <th className="py-4 px-6">Ketua & Kontak</th>
                <th className="py-4 px-6">Status & Anggota</th>
                <th className="py-4 px-6 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat data Master PK...
                  </td>
                </tr>
              ) : filteredPks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[var(--text-muted)]">
                    Tidak ada data pimpinan komisariat yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredPks.map((p) => (
                  <tr key={p.id} className="hover:bg-[var(--bg-app)]/40 transition-colors group">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
                          <Building2 size={18} className="text-teal-400" />
                        </div>
                        <div>
                          <p className="font-bold text-[var(--text-main)] text-sm group-hover:text-teal-400 transition-colors">
                            {p.namaPK}
                          </p>
                          <span className="font-mono text-[10px] text-teal-400 bg-teal-500/10 px-1.5 py-0.5 rounded">
                            {p.pkId || '-'}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-[var(--text-main)]">{p.zona}</p>
                      <p className="text-[11px] text-[var(--text-muted)]">{p.kecamatan}</p>
                    </td>

                    <td className="py-4 px-6">
                      <p className="font-bold text-[var(--text-main)]">{p.namaKetua || '-'}</p>
                      <p className="text-[11px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                        <Phone size={11} /> {p.noHp || '-'}
                      </p>
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center gap-2">
                          <span className={cn(
                            "px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase",
                            p.status === 'Aktif' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                            p.status === 'Non Aktif' ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                            "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          )}>
                            {p.status}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-teal-400 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
                            {p.jumlahAnggota || 0} Kader
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Link
                            to={`/members?search=${encodeURIComponent(p.namaPK)}`}
                            className="text-[10px] text-zinc-400 hover:text-teal-400 flex items-center gap-1 font-medium hover:underline"
                            title="Buka data anggota di komisariat ini"
                          >
                            <Users size={11} className="text-teal-400" /> Lihat Anggota
                          </Link>
                          <span className="text-[9px] text-zinc-600">•</span>
                          <span className="text-[9px] text-emerald-500 flex items-center gap-0.5 font-medium">
                            <CheckCircle2 size={10} /> Pimpinan
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-2 rounded-xl bg-[var(--bg-app)] hover:bg-blue-500/20 text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(p.id)}
                          className="p-2 rounded-xl bg-[var(--bg-app)] hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Hapus"
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

      {/* Add / Edit PK Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl space-y-4 p-6 md:p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-[var(--border-main)]">
                <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <Building2 className="text-teal-400" />
                  {editingId ? 'Edit Pimpinan Komisariat' : 'Tambah Pimpinan Komisariat Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Nama Komisariat</label>
                    <input
                      type="text"
                      required
                      value={formData.namaPK}
                      onChange={(e) => setFormData({ ...formData, namaPK: e.target.value })}
                      placeholder="PK IPNU SMK Nahdlatul Ulama"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Badan Organisasi</label>
                    <select
                      value={formData.organisasi || 'IPNU'}
                      onChange={(e) => {
                        const org = e.target.value as 'IPNU' | 'IPPNU';
                        handleKecamatanChange(formData.kecamatan, org);
                      }}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500 font-bold"
                    >
                      <option value="IPNU">IPNU (Pelajar Putra)</option>
                      <option value="IPPNU">IPPNU (Pelajar Putri)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Kecamatan (Kab. Cirebon)</label>
                    <select
                      required
                      value={formData.kecamatan}
                      onChange={(e) => handleKecamatanChange(e.target.value, formData.organisasi || 'IPNU')}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">-- Pilih Kecamatan (40 Kecamatan) --</option>
                      {getAllKecamatan(formData.organisasi || 'IPNU').map(kec => (
                        <option key={kec} value={kec}>{kec}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Zona & Koorzon (Otomatis)</label>
                    <input
                      type="text"
                      readOnly
                      value={formData.zona ? `${formData.zona} (${formData.koorzon || 'Koorzon'})` : 'Pilih kecamatan terlebih dahulu'}
                      className="w-full bg-[var(--bg-app)]/60 border border-[var(--border-main)] rounded-xl p-2.5 text-xs font-bold text-teal-400 cursor-not-allowed focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Status Keaktifan</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Non Aktif">Non Aktif</option>
                      <option value="Vakum">Vakum</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Nama Ketua</label>
                    <input
                      type="text"
                      value={formData.namaKetua}
                      onChange={(e) => setFormData({ ...formData, namaKetua: e.target.value })}
                      placeholder="Nama Ketua PK"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">No. WhatsApp / HP</label>
                    <input
                      type="text"
                      value={formData.noHp}
                      onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Alamat Lengkap</label>
                  <textarea
                    rows={2}
                    value={formData.alamat}
                    onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                    placeholder="Alamat sekolah / sekretariat..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-main)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-600/20 active:scale-95"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sync Result Modal */}
      <AnimatePresence>
        {isSyncModalOpen && syncReport && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl p-6 md:p-8 space-y-6"
            >
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-main)]">Sinkronisasi Basis Data Selesai</h3>
                    <p className="text-xs text-[var(--text-muted)]">Data Anggota, Master PK, dan Database Pimpinan telah diselaraskan</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSyncModalOpen(false)}
                  className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* 3 Overview Stat Cards */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Total Anggota</p>
                  <p className="text-xl font-black text-emerald-400 mt-1">{syncReport.totalMembers}</p>
                </div>
                <div className="p-3 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Master PK</p>
                  <p className="text-xl font-black text-teal-400 mt-1">{syncReport.totalPKs}</p>
                </div>
                <div className="p-3 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] uppercase font-bold tracking-wider">Pimpinan</p>
                  <p className="text-xl font-black text-blue-400 mt-1">{syncReport.totalPimpinan}</p>
                </div>
              </div>

              {/* Synchronization Metrics */}
              <div className="space-y-2.5 bg-[var(--bg-app)] p-4 rounded-2xl border border-[var(--border-main)] text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    PK disinkronkan ke Database Pimpinan:
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">{syncReport.pksToPimpinanCount} entri</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-teal-400" />
                    Pimpinan PK disinkronkan ke Master PK:
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">{syncReport.pimpinanToPksCount} entri</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--text-muted)] flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-blue-400" />
                    Jumlah anggota direkonsiliasi:
                  </span>
                  <span className="font-bold text-[var(--text-main)] font-mono">{syncReport.memberCountsUpdated} lembaga</span>
                </div>
              </div>

              {/* Activity Details List */}
              {syncReport.details.length > 0 && (
                <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar p-3 bg-zinc-950/40 rounded-xl border border-zinc-800 text-[11px] text-zinc-400">
                  {syncReport.details.map((d, i) => (
                    <div key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{d}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsSyncModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-lg shadow-teal-600/20 active:scale-95 transition-all"
                >
                  Tutup & Terapkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Komisariat"
        message="Yakin ingin menghapus data komisariat ini dari master data?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default DataMasterPK;
