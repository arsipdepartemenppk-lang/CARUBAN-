import React, { useState, useEffect } from 'react';
import { 
  Compass, Plus, Search, Calendar, MapPin, CheckCircle, Clock, 
  AlertCircle, Trash2, Edit2, Camera, Download, X, Eye, FileText,
  ExternalLink, Share2, Check
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { syncQueue } from '../services/syncQueue';
import { addBrandedHeader } from '../utils/pdfUtils';

export interface Visitasi {
  id: string;
  targetLembaga: string;
  zona: string;
  tanggalVisitasi: string;
  waktu: string;
  status: 'Terjadwal' | 'Selesai' | 'Tertunda';
  timVisitasi: string[];
  catatanKaderisasi?: string;
  catatanAdministrasi?: string;
  rekomendasi?: string;
  dokumentasiUrl?: string;
  createdBy?: string;
  createdAt?: string;
}

export const getGoogleCalendarUrl = (v: Visitasi) => {
  const title = `Visitasi: ${v.targetLembaga}`;
  const details = `Supervisi & Kunjungan Lapangan PC IPNU IPPNU Kabupaten Cirebon\nSasaran: ${v.targetLembaga}\nZona: ${v.zona}\nTim: ${Array.isArray(v.timVisitasi) ? v.timVisitasi.join(', ') : v.timVisitasi}\nStatus: ${v.status}\nCatatan: ${v.rekomendasi || v.catatanKaderisasi || '-'}`;
  const location = `${v.targetLembaga}, Kabupaten Cirebon`;

  const dateStr = (v.tanggalVisitasi || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const timeClean = (v.waktu || '09:00').replace(':', '');
  const startIso = `${dateStr}T${timeClean}00`;
  const endHour = String(Math.min(23, Number((v.waktu || '09:00').split(':')[0]) + 2)).padStart(2, '0');
  const endMin = (v.waktu || '09:00').split(':')[1] || '00';
  const endIso = `${dateStr}T${endHour}${endMin}00`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startIso}/${endIso}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(location)}`;
};

export const downloadIcsCalendar = (items: Visitasi[], filename = 'Jadwal_Visitasi_IPNU_IPPNU_Cirebon.ics') => {
  if (items.length === 0) return;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PC IPNU IPPNU Kab Cirebon//Caruban Core//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Jadwal Visitasi PC IPNU IPPNU Kab. Cirebon',
    'X-WR-TIMEZONE:Asia/Jakarta'
  ];

  items.forEach(v => {
    const dateStr = (v.tanggalVisitasi || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const timeClean = (v.waktu || '09:00').replace(':', '');
    const startIso = `${dateStr}T${timeClean}00`;
    const endHour = String(Math.min(23, Number((v.waktu || '09:00').split(':')[0]) + 2)).padStart(2, '0');
    const endMin = (v.waktu || '09:00').split(':')[1] || '00';
    const endIso = `${dateStr}T${endHour}${endMin}00`;
    const tim = Array.isArray(v.timVisitasi) ? v.timVisitasi.join(', ') : v.timVisitasi;

    lines.push(
      'BEGIN:VEVENT',
      `UID:visitasi-${v.id}-${dateStr}@carubancore.ipnucirebon.or.id`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:Visitasi: ${v.targetLembaga}`,
      `DESCRIPTION:Kunjungan PC IPNU IPPNU Kab Cirebon | Zona: ${v.zona} | Tim: ${tim}`,
      `LOCATION:${v.targetLembaga}, Kabupaten Cirebon`,
      'STATUS:CONFIRMED',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const DataVisitasi: React.FC = () => {
  const { user } = useFirebase();
  const { showToast } = useToast();
  const [visitasis, setVisitasis] = useState<Visitasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const [formData, setFormData] = useState<{
    targetLembaga: string;
    zona: string;
    tanggalVisitasi: string;
    waktu: string;
    status: Visitasi['status'];
    timVisitasi: string;
    catatanKaderisasi: string;
    catatanAdministrasi: string;
    rekomendasi: string;
    dokumentasiUrl: string;
  }>({
    targetLembaga: '',
    zona: 'Zona 1',
    tanggalVisitasi: new Date().toISOString().slice(0, 10),
    waktu: '09:00',
    status: 'Terjadwal',
    timVisitasi: 'Departemen Organisasi, Departemen Kaderisasi',
    catatanKaderisasi: '',
    catatanAdministrasi: '',
    rekomendasi: '',
    dokumentasiUrl: ''
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'visitasis'), orderBy('tanggalVisitasi', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Visitasi));
      setVisitasis(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching visitasis:', err);
      showToast('Gagal memuat data visitasi', 'error');
      setLoading(false);
    });

    const handleOnline = () => {
      setIsOffline(false);
      processSyncQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial queue check
    updatePendingCount();

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [user]);

  const updatePendingCount = async () => {
    try {
      const queue = await syncQueue.getQueue();
      setPendingSyncCount(queue.filter(i => i.type === 'visitasi').length);
    } catch (err) {
      console.error('Error updating pending count:', err);
    }
  };

  const processSyncQueue = async () => {
    const queue = await syncQueue.getQueue();
    const visitasiQueue = queue.filter(item => item.type === 'visitasi');
    if (visitasiQueue.length === 0) return;

    showToast(`Sinkronisasi ${visitasiQueue.length} data tertunda...`, 'info');
    
    for (const item of visitasiQueue) {
      try {
        await addDoc(collection(db, 'visitasis'), {
          ...item.data,
          createdAt: new Date(item.timestamp).toISOString(),
          syncedAt: new Date().toISOString()
        });
        await syncQueue.removeFromQueue(item.id!);
      } catch (err) {
        console.error('Sync error:', err);
      }
    }
    
    updatePendingCount();
    showToast('Sinkronisasi visitasi selesai', 'success');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.targetLembaga.trim()) {
      showToast('Target lembaga wajib diisi', 'error');
      return;
    }

    try {
      const payload = {
        ...formData,
        timVisitasi: formData.timVisitasi.split(',').map(s => s.trim()).filter(Boolean)
      };

      let visitasiId = editingId;
      if (editingId) {
        await updateDoc(doc(db, 'visitasis', visitasiId), {
          ...payload,
          updatedAt: new Date().toISOString()
        });
        showToast('Data visitasi diperbarui', 'success');
      } else {
        if (!navigator.onLine) {
          await syncQueue.addToQueue({
            ...payload,
            createdBy: user?.uid || 'system'
          }, 'visitasi');
          updatePendingCount();
          showToast('Mode Offline: Data disimpan di antrean sinkronisasi', 'info');
        } else {
          const docRef = await addDoc(collection(db, 'visitasis'), {
            ...payload,
            createdAt: new Date().toISOString(),
            createdBy: user?.uid || 'system'
          });
          visitasiId = docRef.id;
          showToast('Jadwal visitasi baru berhasil dibuat', 'success');
          
          // Push Notification for new visitasi
          fetch('/api/notifications/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Jadwal Visitasi Baru 📅',
              body: `Visitasi ke ${formData.targetLembaga} dijadwalkan pada ${formData.tanggalVisitasi}`,
              url: '/visitasi'
            })
          }).catch(err => console.warn('Failed to send notification:', err));
        }
      }

      // Sync with Google Calendar
      if (user) {
        fetch('/api/calendar/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: user.uid,
            event: {
              title: `Visitasi: ${formData.targetLembaga}`,
              description: `Tim: ${formData.timVisitasi}. Zona: ${formData.zona}.`,
              date: `${formData.tanggalVisitasi}T${formData.waktu}:00`
            }
          })
        }).then(res => res.json()).then(data => {
          if (data.success) {
            showToast('Sinkronisasi Google Calendar berhasil', 'success');
          }
        }).catch(err => console.warn('Calendar sync error:', err));
      }

      setIsModalOpen(false);
      setEditingId(null);
    } catch (err: any) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'visitasis', deleteConfirmId));
      showToast('Visitasi dihapus', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };


  const handleExport = () => {
    const exportData = visitasis.map(v => ({
      'Lembaga / Komisariat': v.targetLembaga,
      'Zona': v.zona,
      'Tanggal': v.tanggalVisitasi,
      'Waktu': v.waktu,
      'Status': v.status,
      'Tim Delegasi': Array.isArray(v.timVisitasi) ? v.timVisitasi.join(', ') : v.timVisitasi,
      'Catatan': v.catatanKaderisasi || v.rekomendasi || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Visitasi');
    XLSX.writeFile(wb, `Data_Visitasi_${new Date().toISOString().slice(0, 10)}.xlsx`);
    showToast('File Excel visitasi diunduh', 'success');
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    
    const startY = addBrandedHeader(doc, {
      title: 'DAFTAR KUNJUNGAN VISITASI CABANG',
      subtitle: 'PC IPNU Kabupaten Cirebon',
      date: now.toLocaleDateString('id-ID')
    });
    
    const tableData = visitasis.map(v => [
      v.targetLembaga,
      v.zona,
      v.tanggalVisitasi,
      v.status,
    ]);

    (doc as any).autoTable({
      startY: startY,
      head: [['Lembaga', 'Zona', 'Tanggal', 'Status', 'Tim Delegasi']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105] },
      styles: { fontSize: 8 }
    });

    doc.save(`Data_Visitasi_${now.toISOString().slice(0, 10)}.pdf`);
    showToast('File PDF visitasi diunduh', 'success');
  };

  const filteredVisitasis = visitasis.filter(v => {
    const matchSearch = v.targetLembaga.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        v.zona.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedStatus === 'Semua' || v.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Monitoring Lapangan
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <Compass className="text-amber-400" />
            Data Visitasi & Supervisi Cabang
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Pendampingan langsung PC IPNU & IPPNU Kabupaten Cirebon ke Pimpinan Anak Cabang dan Pimpinan Komisariat.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <Download size={16} className="text-amber-400" />
            Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-app)] transition-all shadow-sm"
          >
            <FileText size={16} className="text-amber-400" />
            PDF
          </button>

          <button
            onClick={() => setIsCalendarModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600/10 border border-blue-600/20 text-xs font-bold text-blue-400 hover:bg-blue-600/20 transition-all shadow-sm"
          >
            <Calendar size={16} />
            Hubungkan Kalender
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                targetLembaga: '',
                zona: 'Zona 1',
                tanggalVisitasi: new Date().toISOString().slice(0, 10),
                waktu: '09:00',
                status: 'Terjadwal',
                timVisitasi: 'Departemen Organisasi, Departemen Kaderisasi',
                catatanKaderisasi: '',
                catatanAdministrasi: '',
                rekomendasi: '',
                dokumentasiUrl: ''
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Jadwalkan Visitasi
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari lembaga atau zona..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          {['Semua', 'Terjadwal', 'Selesai', 'Tertunda'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all",
                selectedStatus === st
                  ? "bg-amber-600 text-white"
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
              )}
            >
              {st}
            </button>
          ))}
        </div>

        {pendingSyncCount > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse">
            <Clock size={14} />
            <span className="text-[10px] font-black uppercase tracking-widest">{pendingSyncCount} Data Menunggu Sinkronisasi</span>
          </div>
        )}
      </div>

      {/* Grid of Visitasis */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--text-muted)]">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat data visitasi...
          </div>
        ) : filteredVisitasis.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--text-muted)]">
            Tidak ada agenda visitasi yang ditemukan.
          </div>
        ) : (
          filteredVisitasis.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] hover:border-amber-500/30 transition-all shadow-md space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Compass size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)] line-clamp-1">{item.targetLembaga}</h3>
                    <span className="text-[11px] text-[var(--text-muted)]">{item.zona}</span>
                  </div>
                </div>

                <span className={cn(
                  "px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase",
                  item.status === 'Selesai' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                  item.status === 'Terjadwal' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                  "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                )}>
                  {item.status}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--text-muted)] pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-amber-400" />
                  <span>{item.tanggalVisitasi} ({item.waktu} WIB)</span>
                </div>
                <div className="text-[11px] line-clamp-2">
                  <strong>Tim:</strong> {Array.isArray(item.timVisitasi) ? item.timVisitasi.join(', ') : item.timVisitasi}
                </div>
                {item.rekomendasi && (
                  <p className="text-[11px] text-amber-300/80 bg-amber-500/10 p-2 rounded-xl mt-2">
                    💡 {item.rekomendasi}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-main)] flex-wrap">
                <a
                  href={getGoogleCalendarUrl(item)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Buka & Tambahkan ke Google Calendar"
                >
                  <Calendar size={13} /> Kalender
                </a>
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setFormData({
                      targetLembaga: item.targetLembaga,
                      zona: item.zona,
                      tanggalVisitasi: item.tanggalVisitasi,
                      waktu: item.waktu,
                      status: item.status,
                      timVisitasi: Array.isArray(item.timVisitasi) ? item.timVisitasi.join(', ') : item.timVisitasi,
                      catatanKaderisasi: item.catatanKaderisasi || '',
                      catatanAdministrasi: item.catatanAdministrasi || '',
                      rekomendasi: item.rekomendasi || '',
                      dokumentasiUrl: item.dokumentasiUrl || ''
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-amber-400 text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 size={14} /> Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-rose-400 text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={14} /> Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add / Edit */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-xl p-6 md:p-8 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-main)]">
                <h3 className="text-lg font-black text-[var(--text-main)] flex items-center gap-2">
                  <Compass className="text-amber-400" />
                  {editingId ? 'Edit Data Visitasi' : 'Jadwalkan Visitasi Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Target Lembaga / PK / PAC</label>
                  <input
                    type="text"
                    required
                    value={formData.targetLembaga}
                    onChange={(e) => setFormData({ ...formData, targetLembaga: e.target.value })}
                    placeholder="Contoh: PK IPNU MAN 1 Cirebon"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={formData.tanggalVisitasi}
                      onChange={(e) => setFormData({ ...formData, tanggalVisitasi: e.target.value })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Waktu (WIB)</label>
                    <input
                      type="text"
                      value={formData.waktu}
                      onChange={(e) => setFormData({ ...formData, waktu: e.target.value })}
                      placeholder="09:00"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Zona</label>
                    <input
                      type="text"
                      value={formData.zona}
                      onChange={(e) => setFormData({ ...formData, zona: e.target.value })}
                      placeholder="Zona 1"
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="Terjadwal">Terjadwal</option>
                      <option value="Selesai">Selesai</option>
                      <option value="Tertunda">Tertunda</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Tim Delegasi Cabang</label>
                  <input
                    type="text"
                    value={formData.timVisitasi}
                    onChange={(e) => setFormData({ ...formData, timVisitasi: e.target.value })}
                    placeholder="Pisahkan dengan koma"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Catatan & Rekomendasi</label>
                  <textarea
                    rows={3}
                    value={formData.rekomendasi}
                    onChange={(e) => setFormData({ ...formData, rekomendasi: e.target.value })}
                    placeholder="Hasil supervisi dan tindak lanjut..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-main)]">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-600/20 active:scale-95"
                  >
                    Simpan Visitasi
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Integrasi Kalender */}
      <AnimatePresence>
        {isCalendarModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="p-5 border-b border-[var(--border-main)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-[var(--text-main)]">Integrasi & Sinkronisasi Kalender</h3>
                    <p className="text-[11px] text-[var(--text-muted)]">Hubungkan jadwal visitasi ke Google Calendar & HP</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCalendarModalOpen(false)}
                  className="p-2 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar">
                {/* Opsi 1: Unduh Berkas iCalendar (.ics) */}
                <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-blue-400">Unduh Format Kalender Universal (.ics)</h4>
                      <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        Dapat dibuka dan disinkronkan langsung dengan Google Calendar, Apple Calendar, Microsoft Outlook, dan kalender bawaan Android.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      downloadIcsCalendar(visitasis);
                      showToast(`Berhasil mengunduh ${visitasis.length} jadwal visitasi (.ics)`, 'success');
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 active:scale-95"
                  >
                    <Download size={14} />
                    <span>Unduh Semua Jadwal Visitasi ({visitasis.length} Kegiatan)</span>
                  </button>
                </div>

                {/* Opsi 2: Buka Jadwal ke Google Calendar Web */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)]">
                      Daftar Jadwal & Tambah ke Google Calendar
                    </h4>
                    <span className="text-[10px] text-[var(--text-muted)]">1-Klik ke Akun Google</span>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                    {visitasis.length === 0 ? (
                      <p className="text-center py-6 text-xs text-[var(--text-muted)]">Belum ada agenda visitasi tercatat.</p>
                    ) : (
                      visitasis.map((v) => (
                        <div 
                          key={v.id} 
                          className="p-3 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)] flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[var(--text-main)] truncate">{v.targetLembaga}</p>
                            <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-2 mt-0.5">
                              <span>📅 {v.tanggalVisitasi}</span>
                              <span>⏰ {v.waktu} WIB</span>
                              <span className="text-amber-400">{v.zona}</span>
                            </p>
                          </div>
                          <a
                            href={getGoogleCalendarUrl(v)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-[11px] font-bold transition-all flex items-center gap-1.5"
                          >
                            <span>Google Calendar</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Petunjuk Penggunaan */}
                <div className="p-3.5 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)] space-y-1.5 text-[11px] text-[var(--text-muted)]">
                  <p className="font-bold text-[var(--text-main)]">💡 Tips Sinkronisasi Otomatis:</p>
                  <p>1. Buka <strong>Google Calendar</strong> (calendar.google.com) di browser atau aplikasi HP.</p>
                  <p>2. Klik <em>Setelan (Gear)</em> &gt; <em>Impor & Ekspor</em> &gt; Pilih berkas <strong>.ics</strong> yang baru saja Anda unduh.</p>
                  <p>3. Seluruh agenda visitasi akan otomatis terdaftar dan mengingatkan pengurus 30 menit sebelum acara.</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Visitasi"
        message="Yakin ingin menghapus catatan visitasi ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default DataVisitasi;
