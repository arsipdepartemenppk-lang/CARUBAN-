import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Search, MapPin, Clock, 
  Trash2, Edit2, Users, CheckCircle, X, ChevronLeft, ChevronRight, Share2, QrCode, 
  Bell, BellOff, ExternalLink, Sparkles, Download, Wand2, FileDown, Check
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { EventQRModal } from '../components/EventQRModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { toJSDate, formatDisplayDate } from '../utils/dateUtils';

export interface AgendaItem {
  id: string;
  title: string;
  category: 'Kaderisasi' | 'Rapat' | 'PHBI' | 'Konferensi' | 'Umum';
  date: string;
  time: string; // Keep for legacy/compat
  startTime?: string;
  endTime?: string;
  location: string;
  description?: string;
  organizer: string;
  targetParticipants?: string;
  status: 'Akan Datang' | 'Berlangsung' | 'Selesai';
  createdAt?: string;
}

export const createGoogleCalendarUrl = (item: AgendaItem) => {
  const title = encodeURIComponent(item.title);
  const details = encodeURIComponent(
    `${item.description || 'Agenda Resmi IPNU-IPPNU'}\n\nKategori: ${item.category}\nPenyelenggara: ${item.organizer}\nLokasi: ${item.location}\nPresensi: ${window.location.origin}/presensi/public/${item.id}`
  );
  const loc = encodeURIComponent(item.location);

  const dateClean = (item.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
  const startParts = (item.startTime || item.time?.split(' - ')[0] || '08:00').replace(':', '').trim();
  const endParts = (item.endTime || item.time?.split(' - ')[1] || '10:00').replace(':', '').trim();

  const startStr = `${dateClean}T${startParts.padEnd(4, '0')}00`;
  const endStr = `${dateClean}T${endParts.padEnd(4, '0')}00`;

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startStr}/${endStr}&details=${details}&location=${loc}`;
};

export const downloadCalendarIcs = (items: AgendaItem[], filename = 'agenda_ipnu_ippnu.ics') => {
  if (items.length === 0) return;
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Caruban CORE//IPNU IPPNU Kabupaten Cirebon//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  items.forEach((item, index) => {
    const dateClean = (item.date || new Date().toISOString().slice(0, 10)).replace(/-/g, '');
    const startParts = (item.startTime || item.time?.split(' - ')[0] || '08:00').replace(':', '').trim();
    const endParts = (item.endTime || item.time?.split(' - ')[1] || '10:00').replace(':', '').trim();
    const startStr = `${dateClean}T${startParts.padEnd(4, '0')}00`;
    const endStr = `${dateClean}T${endParts.padEnd(4, '0')}00`;
    const uid = `${item.id || index}-${Date.now()}@carubancore.or.id`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`);
    lines.push(`DTSTART:${startStr}`);
    lines.push(`DTEND:${endStr}`);
    lines.push(`SUMMARY:${item.title.replace(/\n/g, ' ')}`);
    lines.push(`DESCRIPTION:${(item.description || 'Agenda Resmi IPNU-IPPNU').replace(/\n/g, '\\n')}`);
    lines.push(`LOCATION:${item.location.replace(/\n/g, ' ')}`);
    lines.push(`STATUS:CONFIRMED`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');

  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const Agenda: React.FC = () => {
  const { user, role, userData } = useFirebase();
  const { showToast } = useToast();
  const [agendas, setAgendas] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [reminders, setReminders] = useState<string[]>(JSON.parse(localStorage.getItem('agenda_reminders') || '[]'));
  const [selectedQRItem, setSelectedQRItem] = useState<AgendaItem | null>(null);

  useEffect(() => {
    localStorage.setItem('agenda_reminders', JSON.stringify(reminders));
    
    // Simple scheduling for active reminders if they are within today's range
    const timers: any[] = [];
    reminders.forEach(id => {
      const agenda = agendas.find(a => a.id === id);
      if (!agenda) return;

      const eventTime = new Date(`${agenda.date}T${agenda.startTime || '00:00'}:00`).getTime();
      const remindTime = eventTime - (30 * 60 * 1000); // 30 minutes before
      const now = Date.now();

      if (remindTime > now) {
        const timeout = setTimeout(() => {
          if (Notification.permission === 'granted') {
            new Notification(`Pengingat Agenda: ${agenda.title}`, {
              body: `Kegiatan akan dimulai dalam 30 menit di ${agenda.location}.`,
              icon: '/icon.png'
            });
          }
        }, remindTime - now);
        timers.push(timeout);
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [reminders, agendas]);

  const toggleReminder = async (id: string) => {
    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Izin notifikasi ditolak', 'error');
        return;
      }
    }

    setReminders(prev => {
      const isReminded = prev.includes(id);
      if (isReminded) {
        showToast('Pengingat dihapus', 'info');
        return prev.filter(r => r !== id);
      } else {
        showToast('Pengingat 30 menit sebelum acara aktif', 'success');
        return [...prev, id];
      }
    });
  };

  const handleShare = (item: AgendaItem) => {
    const shareText = `*AGENDA KEGIATAN*\n\n📌 *${item.title}*\n🗓️ ${formatDisplayDate(item.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n⏰ ${item.startTime || item.time} WIB\n📍 ${item.location}\n\n_${item.description || 'Tidak ada deskripsi rinci.'}_\n\nPresensi Kehadiran: ${window.location.origin}/presensi/public/${item.id}`;

    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: shareText,
        url: `${window.location.origin}/event-summary/${item.id}`
      }).catch(err => console.warn('Share error:', err));
    } else {
      navigator.clipboard.writeText(shareText);
      showToast('Ringkasan agenda disalin ke papan klip', 'success');
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    category: AgendaItem['category'];
    date: string;
    startTime: string;
    endTime: string;
    location: string;
    description: string;
    organizer: string;
    targetParticipants: string;
    status: AgendaItem['status'];
  }>({
    title: '',
    category: 'Rapat',
    date: new Date().toISOString().slice(0, 10),
    startTime: '19:30',
    endTime: '22:00',
    location: 'Gedung PCNU Kab. Cirebon',
    description: '',
    organizer: 'PC IPNU Kab. Cirebon',
    targetParticipants: 'Pengurus Harian & Lembaga',
    status: 'Akan Datang'
  });

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'agendas'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AgendaItem));
      setAgendas(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching agendas:', err);
      showToast('Gagal memuat agenda', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Judul agenda wajib diisi', 'error');
      return;
    }

    try {
      const submissionData = {
        ...formData,
        time: `${formData.startTime} - ${formData.endTime}`,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        await updateDoc(doc(db, 'agendas', editingId), submissionData);
        showToast('Agenda berhasil diperbarui', 'success');
      } else {
        await addDoc(collection(db, 'agendas'), {
          ...submissionData,
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || 'system'
        });
        showToast('Agenda baru berhasil ditambahkan', 'success');
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
      await deleteDoc(doc(db, 'agendas', deleteConfirmId));
      showToast('Agenda dihapus', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  // AI Agenda Automation States
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isAIGenerating, setIsAIGenerating] = useState(false);
  const [aiForm, setAiForm] = useState({
    templatePreset: 'MAKESTA',
    namaKegiatan: 'Masa Kesetiaan Anggota (MAKESTA)',
    tingkat: 'PAC' as 'PC' | 'PAC' | 'PR' | 'PK',
    wilayah: 'Kecamatan Palimanan',
    organisasi: 'BERSAMA' as 'IPNU' | 'IPPNU' | 'BERSAMA',
    tanggalMulai: new Date().toISOString().slice(0, 10),
    durasiHari: 2,
    lokasi: 'Gedung MWC NU Palimanan',
    targetPeserta: 'Calon Anggota Pelajar & Santri',
    catatanKhusus: 'Mencakup materi Ke-Aswaja-an, Ke-NU-an, Ke-IPNU-IPPNU-an, Pembaiatan, dan RTL'
  });
  const [aiGeneratedSchedule, setAiGeneratedSchedule] = useState<{
    ringkasanAcara?: string;
    totalSesi?: number;
    items: any[];
  } | null>(null);

  const applyAIPreset = (preset: string) => {
    if (preset === 'MAKESTA') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'MAKESTA',
        namaKegiatan: 'Masa Kesetiaan Anggota (MAKESTA)',
        durasiHari: 2,
        lokasi: 'Gedung MWC NU / Madrasah',
        targetPeserta: 'Calon Anggota Pelajar & Santri',
        catatanKhusus: 'Wajib mencakup Ke-Aswaja-an, Ke-NU-an, Ke-IPNU-IPPNU-an, Kepemimpinan, Sholat Berjamaah, Pembaiatan, dan RTL'
      }));
    } else if (preset === 'LAKMUD') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'LAKMUD',
        namaKegiatan: 'Latihan Kader Muda (LAKMUD)',
        durasiHari: 3,
        lokasi: 'Pondok Pesantren / Balai Diklat',
        targetPeserta: 'Alumni Makesta yang aktif',
        catatanKhusus: 'Materi Analisis Sosial (Ansos), Manajemen Konflik, Komunikasi Efektif, Scientific Problem Solving, Sidang Pleno, RTL'
      }));
    } else if (preset === 'DIKLATAMA') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'DIKLATAMA',
        namaKegiatan: 'Pendidikan dan Pelatihan Pertama (DIKLATAMA CBP-KPP)',
        durasiHari: 3,
        lokasi: 'Bumi Perkemahan / Lapangan Terbuka',
        targetPeserta: 'Anggota CBP & KPP',
        catatanKhusus: 'Materi Kepanduan, SAR Dasar, Kedisiplinan PBB, Survival, Pengamanan Acara, Baiat Komando'
      }));
    } else if (preset === 'KONFERANCAB') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'KONFERANCAB',
        namaKegiatan: 'Konferensi Anak Cabang (KONFERANCAB)',
        durasiHari: 1,
        lokasi: 'Aula Kecamatan / MWC NU',
        targetPeserta: 'Delegasi Resmi PR & PK se-Kecamatan',
        catatanKhusus: 'Sidang Tatib, Laporan Pertanggungjawaban (LPJ), Sidang Komisi Organisasi, Pemilihan Ketua IPNU & IPPNU'
      }));
    } else if (preset === 'RAKER') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'RAKER',
        namaKegiatan: 'Rapat Kerja Pengurus (RAKER)',
        durasiHari: 1,
        lokasi: 'Sekretariat Pimpinan',
        targetPeserta: 'Seluruh Pengurus Harian & Departemen',
        catatanKhusus: 'Penyusunan Program Kerja Tahunan, Anggaran, Kalender Kegiatan, dan Target Capaian'
      }));
    } else if (preset === 'PELANTIKAN') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'PELANTIKAN',
        namaKegiatan: 'Pelantikan & Upgrading Pengurus',
        durasiHari: 1,
        lokasi: 'Gedung Serbaguna',
        targetPeserta: 'Pengurus Terpilih, Banom NU & Tamu Undangan',
        catatanKhusus: 'Prosesi Baiat Pelantikan, Sambutan-sambutan, Materi Upgrading Tata Kelola Organisasi'
      }));
    } else if (preset === 'HARLAH') {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'HARLAH',
        namaKegiatan: 'Peringatan Harlah IPNU-IPPNU & Cirebon Bersholawat',
        durasiHari: 1,
        lokasi: 'Halaman Gedung PCNU / Masjid Agung',
        targetPeserta: 'Kader, Alumni, dan Masyarakat Umum',
        catatanKhusus: 'Khatmil Quran, Istighotsah, Santunan Yatim, Tausiyah Kebangsaan, Mahalul Qiyam'
      }));
    } else {
      setAiForm(prev => ({
        ...prev,
        templatePreset: 'CUSTOM'
      }));
    }
  };

  const handleGenerateAISchedule = async () => {
    if (!aiForm.namaKegiatan.trim()) {
      showToast('Nama kegiatan wajib diisi', 'error');
      return;
    }

    setIsAIGenerating(true);
    try {
      const res = await fetch('/api/gemini/generate-agenda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiForm)
      });

      if (!res.ok) {
        throw new Error(`Server returned status ${res.status}`);
      }

      const data = await res.json();
      if (!data.items || data.items.length === 0) {
        throw new Error('Draf jadwal tidak berhasil dihasilkan');
      }

      setAiGeneratedSchedule(data);
      showToast(`Berhasil menyusun draf jadwal (${data.items.length} sesi kegiatan)`, 'success');
    } catch (err: any) {
      console.error('Error generate AI schedule:', err);
      showToast('Gagal menghasilkan jadwal AI: ' + err.message, 'error');
    } finally {
      setIsAIGenerating(false);
    }
  };

  const handleSaveAllAIToAgenda = async () => {
    if (!aiGeneratedSchedule?.items || aiGeneratedSchedule.items.length === 0) return;

    try {
      let savedCount = 0;
      for (const item of aiGeneratedSchedule.items) {
        await addDoc(collection(db, 'agendas'), {
          title: item.title,
          category: item.category || 'Kaderisasi',
          date: item.date,
          startTime: item.startTime || '08:00',
          endTime: item.endTime || '10:00',
          time: `${item.startTime || '08:00'} - ${item.endTime || '10:00'}`,
          location: item.location || aiForm.lokasi,
          description: item.description || '',
          organizer: item.organizer || `${aiForm.tingkat} ${aiForm.organisasi} ${aiForm.wilayah}`,
          targetParticipants: item.targetParticipants || aiForm.targetPeserta,
          status: 'Akan Datang',
          createdAt: new Date().toISOString(),
          createdBy: user?.uid || 'ai-system'
        });
        savedCount++;
      }

      showToast(`Sukses! ${savedCount} sesi agenda kegiatan telah tersimpan ke sistem`, 'success');
      setIsAIModalOpen(false);
      setAiGeneratedSchedule(null);
    } catch (err: any) {
      showToast('Gagal menyimpan sebagian agenda: ' + err.message, 'error');
    }
  };

  const filteredAgendas = agendas.filter(a => {
    const matchSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        a.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = selectedCategory === 'Semua' || a.category === selectedCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/10 text-orange-400 border border-orange-500/20">
              Jadwal Organisasi
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <CalendarIcon className="text-orange-400" />
            Agenda & Kalender Kegiatan
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Seluruh agenda kaderisasi, rapat koordinasi, dan kegiatan cabang se-Kabupaten Cirebon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              applyAIPreset('MAKESTA');
              setIsAIModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-xs shadow-lg shadow-orange-950/40 active:scale-95 transition-all"
          >
            <Sparkles size={16} className="text-yellow-200 animate-pulse" />
            <span>Draf AI Jadwal Kegiatan</span>
          </button>

          <button
            type="button"
            onClick={() => {
              downloadCalendarIcs(filteredAgendas, `agenda_ipnu_ippnu_cirebon_${new Date().toISOString().slice(0, 10)}.ics`);
              showToast(`File kalender .ics (${filteredAgendas.length} agenda) berhasil diunduh`, 'success');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-orange-500/50 text-[var(--text-main)] font-bold text-xs shadow-sm transition-all"
            title="Ekspor seluruh agenda ke file .ics untuk kalender Google / Outlook"
          >
            <CalendarIcon size={15} className="text-orange-400" />
            <span>Ekspor Kalender (.ics)</span>
          </button>

          <button
            onClick={() => {
              setEditingId(null);
              setFormData({
                title: '',
                category: 'Rapat',
                date: new Date().toISOString().slice(0, 10),
                startTime: '19:30',
                endTime: '22:00',
                location: 'Gedung PCNU Kab. Cirebon',
                description: '',
                organizer: 'PC IPNU Kab. Cirebon',
                targetParticipants: 'Pengurus Harian & Lembaga',
                status: 'Akan Datang'
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> Tambah Manual
          </button>
        </div>
      </div>

      {/* Filter and Category Pills */}
      <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari agenda atau lokasi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-orange-500/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          {['Semua', 'Kaderisasi', 'Rapat', 'PHBI', 'Konferensi'].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCategory(c)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                selectedCategory === c
                  ? "bg-orange-600 text-white"
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
              )}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Agendas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--text-muted)]">
            <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Memuat agenda kegiatan...
          </div>
        ) : filteredAgendas.length === 0 ? (
          <div className="col-span-full py-16 text-center text-xs text-[var(--text-muted)]">
            Tidak ada agenda kegiatan yang ditemukan.
          </div>
        ) : (
          filteredAgendas.map((item) => (
            <div
              key={item.id}
              className="bg-[var(--bg-card)] p-6 rounded-3xl border border-[var(--border-main)] hover:border-orange-500/30 transition-all shadow-md space-y-4"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  {item.category}
                </span>

                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-md",
                  item.status === 'Berlangsung' ? "bg-emerald-500/10 text-emerald-400 animate-pulse" :
                  item.status === 'Selesai' ? "bg-zinc-500/10 text-zinc-400" :
                  "bg-orange-500/10 text-orange-400"
                )}>
                  {item.status}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-base text-[var(--text-main)]">{item.title}</h3>
                <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{item.description || 'Tidak ada deskripsi rinci.'}</p>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--text-muted)] pt-3 border-t border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <CalendarIcon size={13} className="text-orange-400" />
                  <span>{formatDisplayDate(item.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={13} className="text-orange-400" />
                  <span>{item.startTime || item.time.split(' - ')[0] || item.time} - {item.endTime || item.time.split(' - ')[1] || ''} WIB</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={13} className="text-orange-400" />
                  <span className="font-bold text-orange-400/90 truncate">Venue: {item.location}</span>
                </div>
                {item.description && (
                  <p className="text-[11px] bg-zinc-950/50 p-2.5 rounded-xl border border-zinc-800/50 mt-2 italic line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-main)]">
                <div className="flex items-center gap-1.5">
                  <a
                    href={createGoogleCalendarUrl(item)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-black uppercase tracking-wider transition-all border border-blue-500/20 active:scale-95"
                    title="Buka langsung di Google Calendar"
                  >
                    <CalendarIcon size={12} className="text-blue-400" />
                    <span>+ Google Calendar</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      downloadCalendarIcs([item], `${item.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
                      showToast('File kalender (.ics) berhasil diunduh', 'success');
                    }}
                    className="p-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-all text-[10px] font-bold"
                    title="Unduh file .ics"
                  >
                    <Download size={12} />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleReminder(item.id)}
                    className={cn(
                      "p-2 rounded-xl transition-all flex items-center gap-1.5 text-[10px] font-bold",
                      reminders.includes(item.id) 
                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/30" 
                        : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-amber-400"
                    )}
                    title="Ingatkan saya 30 menit sebelum"
                  >
                    {reminders.includes(item.id) ? <Bell size={14} /> : <BellOff size={14} />}
                    {reminders.includes(item.id) ? 'Aktif' : 'Ingatkan'}
                  </button>

                  <button
                    onClick={() => setSelectedQRItem(item)}
                    className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all active:scale-95 flex items-center gap-1"
                    title="Tampilkan & Unduh QR Code Presensi"
                  >
                    <QrCode size={14} />
                    <span className="text-[10px] font-bold hidden sm:inline">QR Presensi</span>
                  </button>

                  <button
                    onClick={() => handleShare(item)}
                    className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-emerald-400 text-[var(--text-muted)] transition-colors"
                    title="Bagikan Agenda"
                  >
                    <Share2 size={14} />
                  </button>
                  
                  <Link
                    to={`/event-summary/${item.id}`}
                    className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-blue-400 text-[var(--text-muted)] transition-colors"
                    title="Lihat Summary"
                  >
                    <ExternalLink size={14} />
                  </Link>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-main)]">
                <button
                  onClick={() => {
                    setEditingId(item.id);
                    setFormData({
                      title: item.title,
                      category: item.category,
                      date: item.date,
                      startTime: item.startTime || item.time.split(' - ')[0] || '19:30',
                      endTime: item.endTime || item.time.split(' - ')[1] || '21:00',
                      location: item.location,
                      description: item.description || '',
                      organizer: item.organizer || 'PC IPNU',
                      targetParticipants: item.targetParticipants || '',
                      status: item.status
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-orange-400 text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5 transition-colors"
                >
                  <Edit2 size={13} /> Edit
                </button>
                <button
                  onClick={() => setDeleteConfirmId(item.id)}
                  className="p-2 rounded-xl bg-[var(--bg-app)] hover:text-rose-400 text-xs font-bold text-[var(--text-muted)] flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 size={13} /> Hapus
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
                  <CalendarIcon className="text-orange-400" />
                  {editingId ? 'Edit Agenda' : 'Tambah Agenda Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Nama / Judul Agenda</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Contoh: Rapat Pleno Cabang I"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Kategori</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="Rapat">Rapat</option>
                      <option value="Kaderisasi">Kaderisasi</option>
                      <option value="PHBI">PHBI</option>
                      <option value="Konferensi">Konferensi</option>
                      <option value="Umum">Umum</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    >
                      <option value="Akan Datang">Akan Datang</option>
                      <option value="Berlangsung">Berlangsung</option>
                      <option value="Selesai">Selesai</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Tanggal</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Jam Mulai</label>
                    <input
                      type="time"
                      required
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Jam Selesai</label>
                    <input
                      type="time"
                      required
                      value={formData.endTime}
                      onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                      className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Venue / Tempat Pelaksanaan</label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Contoh: Gedung PCNU Kab. Cirebon"
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[var(--text-muted)] block mb-1">Deskripsi & Detail Acara</label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Agenda pembahasan, dresscode, dan perlengkapan yang wajib dibawa..."
                    className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                    className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold shadow-md shadow-orange-600/20 active:scale-95"
                  >
                    Simpan Agenda
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Agenda"
        message="Yakin ingin menghapus agenda kegiatan ini?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {/* QR Code Presensi Acara Modal */}
      <EventQRModal
        isOpen={!!selectedQRItem}
        onClose={() => setSelectedQRItem(null)}
        agendaId={selectedQRItem?.id || ''}
        agendaTitle={selectedQRItem?.title || ''}
        agendaDate={selectedQRItem?.date}
        agendaLocation={selectedQRItem?.location}
      />

      {/* Modal Otomatisasi AI Jadwal Kegiatan Organisasi */}
      <AnimatePresence>
        {isAIModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-3xl bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl overflow-hidden shadow-2xl my-8 flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-4 sm:p-5 bg-gradient-to-r from-orange-950/60 to-amber-950/40 border-b border-[var(--border-main)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-main)] flex items-center gap-2">
                      Draf Otomatisasi Jadwal Kegiatan (Gemini AI)
                    </h3>
                    <p className="text-[11px] text-[var(--text-muted)]">
                      Hasilkan rundown kegiatan terstandarisasi (MAKESTA, LAKMUD, Konferensi, Raker) siap ekspor ke Google Calendar
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAIModalOpen(false)}
                  className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Form & Result Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs">
                {/* 1. Pilih Template Acara Resmi */}
                <div>
                  <label className="text-[11px] font-bold text-zinc-300 block mb-1.5">
                    Pilih Template Acara Resmi IPNU & IPPNU:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'MAKESTA', label: 'MAKESTA (2 Hari)' },
                      { id: 'LAKMUD', label: 'LAKMUD (3 Hari)' },
                      { id: 'DIKLATAMA', label: 'DIKLATAMA (3 Hari)' },
                      { id: 'KONFERANCAB', label: 'KONFERANCAB' },
                      { id: 'RAKER', label: 'RAPAT KERJA' },
                      { id: 'PELANTIKAN', label: 'PELANTIKAN' },
                      { id: 'HARLAH', label: 'HARLAH & SHOLAWAT' },
                      { id: 'CUSTOM', label: 'KUSTOM / LAINNYA' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyAIPreset(preset.id)}
                        className={cn(
                          "px-2.5 py-2 rounded-xl border text-[11px] font-bold text-center transition-all",
                          aiForm.templatePreset === preset.id
                            ? "bg-orange-600 border-orange-500 text-white shadow-sm"
                            : "bg-[var(--bg-app)] border-[var(--border-main)] text-zinc-300 hover:border-orange-500/40"
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Form Konfigurasi Acara */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)]">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nama Kegiatan</label>
                    <input
                      type="text"
                      value={aiForm.namaKegiatan}
                      onChange={(e) => setAiForm({ ...aiForm, namaKegiatan: e.target.value })}
                      placeholder="Masa Kesetiaan Anggota (MAKESTA)"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs font-bold text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tingkatan & Organisasi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select
                        value={aiForm.tingkat}
                        onChange={(e) => setAiForm({ ...aiForm, tingkat: e.target.value as any })}
                        className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-2.5 py-2 text-xs font-bold text-[var(--text-main)]"
                      >
                        <option value="PAC">PAC (Kecamatan)</option>
                        <option value="PR">PR (Ranting Desa)</option>
                        <option value="PK">PK (Sekolah/Pesantren)</option>
                        <option value="PC">PC (Cabang)</option>
                      </select>
                      <select
                        value={aiForm.organisasi}
                        onChange={(e) => setAiForm({ ...aiForm, organisasi: e.target.value as any })}
                        className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-2.5 py-2 text-xs font-bold text-[var(--text-main)]"
                      >
                        <option value="BERSAMA">BERSAMA (IPNU & IPPNU)</option>
                        <option value="IPNU">IPNU Saja</option>
                        <option value="IPPNU">IPPNU Saja</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Nama Wilayah / Lembaga</label>
                    <input
                      type="text"
                      value={aiForm.wilayah}
                      onChange={(e) => setAiForm({ ...aiForm, wilayah: e.target.value })}
                      placeholder="Kecamatan Palimanan / SMK Bina Insan Mulia"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Tanggal Mulai & Durasi</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={aiForm.tanggalMulai}
                        onChange={(e) => setAiForm({ ...aiForm, tanggalMulai: e.target.value })}
                        className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-2.5 py-2 text-xs font-mono text-[var(--text-main)]"
                      />
                      <select
                        value={aiForm.durasiHari}
                        onChange={(e) => setAiForm({ ...aiForm, durasiHari: Number(e.target.value) })}
                        className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-2.5 py-2 text-xs font-bold text-[var(--text-main)]"
                      >
                        <option value={1}>1 Hari</option>
                        <option value={2}>2 Hari (1 Malam)</option>
                        <option value={3}>3 Hari (2 Malam)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Lokasi Venue Kegiatan</label>
                    <input
                      type="text"
                      value={aiForm.lokasi}
                      onChange={(e) => setAiForm({ ...aiForm, lokasi: e.target.value })}
                      placeholder="Gedung MWC NU / Balai Desa / Pondok Pesantren"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 block mb-1">Sasaran / Target Peserta</label>
                    <input
                      type="text"
                      value={aiForm.targetPeserta}
                      onChange={(e) => setAiForm({ ...aiForm, targetPeserta: e.target.value })}
                      placeholder="Pelajar SLTP/SLTA, Santri, dan Pemuda Desa"
                      className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleGenerateAISchedule}
                    disabled={isAIGenerating}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black shadow-lg transition-all",
                      isAIGenerating
                        ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white shadow-orange-950 active:scale-95"
                    )}
                  >
                    <Wand2 size={16} className={isAIGenerating ? "animate-spin" : ""} />
                    <span>{isAIGenerating ? 'Sedang Menyusun Jadwal Organisasi...' : 'Hasilkan Draf Jadwal AI'}</span>
                  </button>
                </div>

                {/* Hasil Rundown AI */}
                {aiGeneratedSchedule && (
                  <div className="space-y-4 pt-4 border-t border-[var(--border-main)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                      <div>
                        <h4 className="font-black text-xs text-orange-400">
                          {aiGeneratedSchedule.items?.length || 0} Sesi Kegiatan Telah Terstruktur
                        </h4>
                        <p className="text-[11px] text-zinc-300 mt-0.5">
                          {aiGeneratedSchedule.ringkasanAcara || 'Rundown kegiatan lengkap siap dimasukkan ke sistem dan diekspor ke Google Calendar.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            downloadCalendarIcs(aiGeneratedSchedule.items, `jadwal_${aiForm.namaKegiatan.toLowerCase().replace(/[^a-z0-9]/g, '_')}.ics`);
                            showToast('File Google Calendar (.ics) berhasil diunduh', 'success');
                          }}
                          className="px-3 py-1.5 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all"
                        >
                          <CalendarIcon size={13} /> Ekspor .ICS
                        </button>

                        <button
                          type="button"
                          onClick={handleSaveAllAIToAgenda}
                          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black shadow flex items-center gap-1.5 transition-all"
                        >
                          <Check size={14} /> Simpan Semua ke Agenda
                        </button>
                      </div>
                    </div>

                    {/* Sesi List */}
                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
                      {aiGeneratedSchedule.items?.map((sesi: any, sIdx: number) => (
                        <div
                          key={sIdx}
                          className="p-3 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">
                                {sesi.startTime} - {sesi.endTime} WIB
                              </span>
                              <span className="text-[10px] text-zinc-400 font-mono">
                                {sesi.date}
                              </span>
                              <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                                {sesi.category}
                              </span>
                            </div>
                            <h5 className="font-bold text-xs text-[var(--text-main)]">
                              {sesi.title}
                            </h5>
                            <p className="text-[11px] text-[var(--text-muted)] line-clamp-2">
                              {sesi.description}
                            </p>
                          </div>

                          <a
                            href={createGoogleCalendarUrl(sesi)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/20 shrink-0"
                            title="Tambahkan sesi ini ke Google Calendar"
                          >
                            <CalendarIcon size={14} />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Agenda;
