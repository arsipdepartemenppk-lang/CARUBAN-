import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, MapPin, Clock, CheckCircle2, ChevronLeft, Share2, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

export const EventSummary: React.FC = () => {
  const { agendaId, attendanceId } = useParams<{ agendaId: string; attendanceId: string }>();
  const [agenda, setAgenda] = useState<any>(null);
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!agendaId) return;
      try {
        const agendaDoc = await getDoc(doc(db, 'agendas', agendaId));
        if (agendaDoc.exists()) {
          setAgenda(agendaDoc.data());
        }

        if (attendanceId) {
          const attendanceDoc = await getDoc(doc(db, 'attendances', attendanceId));
          if (attendanceDoc.exists()) {
            setAttendance(attendanceDoc.data());
          }
        }
      } catch (err) {
        console.error('Error fetching event details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [agendaId, attendanceId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-[var(--bg-app)] flex flex-col items-center justify-center p-8 text-center">
        <Info size={48} className="text-zinc-500 mb-4" />
        <h1 className="text-xl font-black text-[var(--text-main)]">Agenda Tidak Ditemukan</h1>
        <p className="text-sm text-[var(--text-muted)] mt-2">Maaf, informasi agenda yang Anda cari tidak tersedia atau telah dihapus.</p>
        <Link to="/" className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">Kembali ke Beranda</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <Link to="/" className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all">
            <ChevronLeft size={20} />
          </Link>
          <h1 className="text-sm font-black uppercase tracking-widest text-emerald-400">Ringkasan Kegiatan</h1>
          <button 
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: agenda.title,
                  text: `Ayo hadiri ${agenda.title} di ${agenda.location} pada ${agenda.date}!`,
                  url: window.location.href
                });
              }
            }}
            className="p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all"
          >
            <Share2 size={18} />
          </button>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--bg-card)] rounded-[40px] border border-[var(--border-main)] overflow-hidden shadow-2xl"
        >
          <div className="bg-emerald-600 p-8 text-white">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-3 py-1 rounded-full bg-white/20 text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                {agenda.category}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">{agenda.title}</h2>
          </div>

          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Calendar size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Tanggal</p>
                  <p className="text-sm font-bold mt-0.5">{new Date(agenda.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Waktu</p>
                  <p className="text-sm font-bold mt-0.5">{agenda.startTime || agenda.time} WIB</p>
                </div>
              </div>

              <div className="flex items-start gap-4 md:col-span-2">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Lokasi / Venue</p>
                  <p className="text-sm font-bold mt-0.5">{agenda.location}</p>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-[var(--border-main)]">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Deskripsi Kegiatan</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">
                {agenda.description || 'Tidak ada deskripsi rincian untuk kegiatan ini.'}
              </p>
            </div>

            {attendance && (
              <div className="pt-6 border-t border-[var(--border-main)]">
                <div className="p-6 rounded-3xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Status Kehadiran</p>
                      <h4 className="text-base font-black text-white">Sudah Terdaftar</h4>
                      <p className="text-xs text-zinc-500">Terima kasih atas partisipasi Anda!</p>
                    </div>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-mono text-zinc-500">{new Date(attendance.scannedAt).toLocaleTimeString('id-ID')}</p>
                    <p className="text-[10px] font-mono text-zinc-500">{new Date(attendance.scannedAt).toLocaleDateString('id-ID')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <footer className="text-center pb-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            Caruban Core &copy; 2024 • PC IPNU IPPNU Kabupaten Cirebon
          </p>
        </footer>
      </div>
    </div>
  );
};

export default EventSummary;
