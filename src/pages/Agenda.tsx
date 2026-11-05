import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, Plus, Search, MapPin, Clock, 
  Trash2, Edit2, Users, CheckCircle, X, ChevronLeft, ChevronRight, Share2, QrCode, Bell, BellOff, ExternalLink
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
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-lg shadow-orange-600/20 active:scale-95 transition-all"
        >
          <Plus size={16} /> Tambah Agenda
        </button>
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
                <button
                  onClick={() => {
                    if (!user) return;
                    showToast('Menghubungkan ke Google Calendar...', 'info');
                    fetch(`/api/auth/google/url?uid=${user.uid}`)
                      .then(res => res.json())
                      .then(data => {
                        if (data.url) {
                          const width = 600, height = 700;
                          const left = window.innerWidth / 2 - width / 2;
                          const top = window.innerHeight / 2 - height / 2;
                          window.open(data.url, 'googleAuth', `width=${width},height=${height},left=${left},top=${top}`);
                        }
                      });

                    const handleSync = () => {
                      fetch('/api/calendar/sync', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          uid: user.uid,
                          event: {
                            title: item.title,
                            description: item.description || 'Agenda Organisasi',
                            date: `${item.date}T${item.startTime || item.time.split(' - ')[0] || '19:30'}:00`
                          }
                        })
                      }).then(res => res.json()).then(resData => {
                        if (resData.success) {
                          showToast('Agenda berhasil diekspor ke Google Calendar', 'success');
                        } else {
                          showToast('Gagal ekspor: Hubungkan kalender di Pengaturan', 'error');
                        }
                      }).catch(() => showToast('Gagal ekspor ke kalender', 'error'));
                    };

                    const messageListener = (event: MessageEvent) => {
                      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
                        handleSync();
                        window.removeEventListener('message', messageListener);
                      }
                    };
                    window.addEventListener('message', messageListener);
                    
                    // If already tokens exist, just sync
                    if (userData?.googleCalendarTokens) handleSync();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <CalendarIcon size={12} /> + Google Calendar
                </button>

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
    </div>
  );
};

export default Agenda;
