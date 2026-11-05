import React, { useState, useEffect } from 'react';
import { 
  Users, Building2, FileText, Compass, Award, Calendar, 
  ArrowUpRight, Plus, MapPin, Sparkles, TrendingUp, CheckCircle, 
  Clock, Shield, BookOpen, ChevronRight, Activity, Bell
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { PRAYER_SCHEDULE } from '../data/sholatData';

import { syncQueue } from '../services/syncQueue';
import { RefreshCw, CloudOff, CloudCheck } from 'lucide-react';
import { toJSDate, formatDisplayDate } from '../utils/dateUtils';

export const Beranda: React.FC = () => {
  const { user, userData, role } = useFirebase();
  const [stats, setStats] = useState({
    members: 0,
    pks: 0,
    visitasis: 0,
    letters: 0,
    coreEvaluations: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [nextPrayer, setNextPrayer] = useState({ name: 'Dzuhur', time: '11:52' });
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    if (!user) return;

    // 1. Members count
    const unsubMembers = onSnapshot(collection(db, 'members'), (s) => {
      setStats(prev => ({ ...prev, members: s.size }));
    }, (err) => {
      console.warn('Members listener error:', err);
    });

    // 2. PKs count
    const unsubPks = onSnapshot(collection(db, 'pks'), (s) => {
      setStats(prev => ({ ...prev, pks: s.size }));
    }, (err) => {
      console.warn('PKs listener error:', err);
    });

    // 3. Visitasis count
    const unsubVisitasis = onSnapshot(collection(db, 'visitasis'), (s) => {
      setStats(prev => ({ ...prev, visitasis: s.size }));
    }, (err) => {
      console.warn('Visitasis listener error:', err);
    });

    // 4. Letters count
    const unsubSurat = onSnapshot(collection(db, 'suratMasuk'), (s1) => {
      setStats(prev => ({ ...prev, letters: s1.size }));
    }, (err) => {
      console.warn('Letters listener error:', err);
    });

    // 5. Recent Activities
    const actQuery = query(collection(db, 'activity_logs'), orderBy('timestamp', 'desc'), limit(5));
    const unsubAct = onSnapshot(actQuery, (s) => {
      const data = s.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecentActivities(data);
    }, (error) => {
      console.warn('Activity logs listener error:', error);
    });

    // Calculate prayer time
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcoming = PRAYER_SCHEDULE.find(p => p.time > currentTimeStr) || PRAYER_SCHEDULE[0];
    if (upcoming) {
      setNextPrayer({ name: upcoming.name, time: upcoming.time });
    }

    // 6. Sync Queue monitor
    const checkSync = async () => {
      const q = await syncQueue.getQueue();
      setPendingSyncCount(q.length);
    };
    const syncInterval = setInterval(checkSync, 5000);
    checkSync();

    const handleOnlineEvent = () => setIsOnline(true);
    const handleOfflineEvent = () => setIsOnline(false);
    window.addEventListener('online', handleOnlineEvent);
    window.addEventListener('offline', handleOfflineEvent);

    return () => {
      unsubMembers();
      unsubPks();
      unsubVisitasis();
      unsubSurat();
      unsubAct();
      clearInterval(syncInterval);
      window.removeEventListener('online', handleOnlineEvent);
      window.removeEventListener('offline', handleOfflineEvent);
    };
  }, [user]);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        const registration = await navigator.serviceWorker.ready;
        await (registration as any).sync.register('sync-offline-data');
      }
      setTimeout(async () => {
        await syncQueue.clearQueue();
        setPendingSyncCount(0);
        setIsSyncing(false);
      }, 1500);
    } catch (err) {
      console.error('Sync failed:', err);
      setIsSyncing(false);
    }
  };

  const getActivityText = (act: any): string => {
    if (!act) return 'Aktivitas sistem';

    const actionMap: Record<string, string> = {
      'LOGIN': 'Masuk ke sistem',
      'LOGOUT': 'Keluar dari sistem',
      'REGISTER': 'Pendaftaran akun baru',
      'GUEST_LOGIN': 'Masuk sebagai Tamu',
      'BIOMETRIC_LOGIN': 'Masuk dengan Biometrik',
      'GOOGLE_LOGIN': 'Masuk dengan Google',
      'ADD_MEMBER': 'Menambah anggota',
      'UPDATE_MEMBER': 'Memperbarui anggota',
      'CREATE_PIMPINAN': 'Menambah pimpinan',
      'DELETE_PIMPINAN': 'Menghapus pimpinan',
      'CREATE': 'Menambah data CORE',
      'UPDATE': 'Memperbarui data CORE',
      'DELETE': 'Menghapus data CORE',
      'VERIFY': 'Verifikasi data CORE',
      'UPDATE_PROFILE': 'Memperbarui profil',
      'UPDATE_PROFILE_PHOTO': 'Mengubah foto profil',
      'REQUEST_PERMISSION': 'Permintaan hak akses',
      'UPDATE_NOTIFICATION_PREFS': 'Memperbarui notifikasi',
    };

    const actionName = actionMap[act.action] || act.action || 'Aktivitas';

    if (!act.details) {
      return actionName;
    }

    if (typeof act.details === 'string') {
      return `${actionName}: ${act.details}`;
    }

    if (typeof act.details === 'object') {
      const name = act.details.nama || act.details.namaLengkap || act.details.namaLembaga || act.details.entityName || act.details.namaPK;
      if (name && typeof name === 'string') {
        return `${actionName} (${name})`;
      }
      try {
        const vals = Object.values(act.details).filter(v => typeof v === 'string' || typeof v === 'number');
        if (vals.length > 0) {
          return `${actionName} (${vals[0]})`;
        }
      } catch {
        // fallback
      }
    }

    return actionName;
  };

  const statCards = [
    {
      title: 'Total Anggota',
      count: stats.members,
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      link: '/anggota'
    },
    {
      title: 'Pimpinan PK / PAC',
      count: stats.pks,
      icon: Building2,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      link: '/master-pk'
    },
    {
      title: 'Visitasi Lapangan',
      count: stats.visitasis,
      icon: Compass,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      link: '/visitasi'
    },
    {
      title: 'Arsip Surat',
      count: stats.letters,
      icon: FileText,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/20',
      link: '/administrasi'
    }
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-8">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-950 border border-emerald-500/20 p-6 md:p-10 text-white shadow-2xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-400 to-transparent" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
              <Sparkles size={14} /> CARUBAN CORE PLATFORM
            </div>
            <h1 className="text-2xl md:text-4xl font-black tracking-tight text-white leading-tight">
              Selamat Datang, {userData?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Kader Pelajar'}!
            </h1>
            <p className="text-sm text-emerald-100/70 leading-relaxed">
              Pusat komando digital PC IPNU IPPNU Kabupaten Cirebon. Kelola keanggotaan, akreditasi komisariat, dan pemetaan wilayah secara real-time.
            </p>
          </div>

          {/* Quick Info Widget: Next Sholat & Active Status */}
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-2xl md:w-72 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <Clock size={14} /> Sholat Berikutnya
              </span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                Cirebon
              </span>
            </div>
            <div>
              <p className="text-2xl font-black text-white">{nextPrayer.time} WIB</p>
              <p className="text-xs text-white/70">Waktu Sholat {nextPrayer.name}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sync Status Bar */}
      {pendingSyncCount > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-500">
              <CloudOff size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-500 leading-none">Menunggu Sinkronisasi</p>
              <p className="text-[10px] text-amber-500/70 mt-1">{pendingSyncCount} data tersimpan secara offline</p>
            </div>
          </div>
          <button
            onClick={handleManualSync}
            disabled={isSyncing || !isOnline}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2",
              isOnline ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-zinc-500/20 text-zinc-500 cursor-not-allowed"
            )}
          >
            <RefreshCw size={14} className={cn(isSyncing && "animate-spin")} />
            {isSyncing ? 'Sinkronisasi...' : 'Sinkron Sekarang'}
          </button>
        </motion.div>
      )}

      {/* Quick Actions Horizontal Scroll */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-sm font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Quick Actions</h3>
        </div>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-2 px-2">
          {[
            { label: 'Log Attendance', icon: CheckCircle, path: '/presensi', color: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' },
            { label: 'Create Surat', icon: FileText, path: '/templates', color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
            { label: 'Visitasi Check-in', icon: MapPin, path: '/visitasi', color: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
            { label: 'Registrasi Anggota', icon: Plus, path: '/anggota', color: 'bg-rose-500', shadow: 'shadow-rose-500/20' },
          ].map((action, i) => (
            <Link
              key={i}
              to={action.path}
              className={cn(
                "flex-none w-40 p-4 rounded-2xl border bg-[var(--bg-card)] border-[var(--border-main)] hover:border-[var(--accent-primary)] transition-all group relative overflow-hidden",
                action.shadow
              )}
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white mb-3 transition-transform group-hover:scale-110", action.color)}>
                <action.icon size={20} />
              </div>
              <p className="font-bold text-sm text-[var(--text-main)] group-hover:text-[var(--accent-primary)] transition-colors leading-tight">
                {action.label}
              </p>
              <div className="absolute -right-4 -bottom-4 opacity-5 transition-transform group-hover:scale-125">
                <action.icon size={80} />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link
              key={idx}
              to={card.link}
              className={cn(
                "p-5 rounded-3xl border transition-all duration-300 bg-[var(--bg-card)] hover:shadow-xl group",
                card.border
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", card.bg, card.color)}>
                  <Icon size={22} />
                </div>
                <ArrowUpRight size={18} className="text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors" />
              </div>
              <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">{card.title}</p>
              <h3 className="text-2xl md:text-3xl font-black text-[var(--text-main)] mt-1 tracking-tight">
                {card.count}
              </h3>
            </Link>
          );
        })}
      </div>

      {/* Main Grid: Quick Navigation & Activity Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Quick Features & Shortcuts */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" />
              Layanan Utama & Akses Cepat
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <Link
              to="/alquran"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-emerald-500/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BookOpen size={20} />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-emerald-400 transition-colors">
                Al-Qur'an Digital
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">30 Juz lengkap dengan audio murottal & terjemahan</p>
            </Link>

            <Link
              to="/amaliah"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-teal-500/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Sparkles size={20} />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-teal-400 transition-colors">
                Amaliah NU
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">Tahlil, Diba', Barzanji, Ratib, dan doa harian</p>
            </Link>

            <Link
              to="/templates"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-pink-500/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-pink-500/10 text-pink-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText size={20} />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-pink-400 transition-colors">
                Generator Surat
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">Buat surat rekomendasi, mandat, dan SK resmi</p>
            </Link>

            <Link
              to="/maps"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-rose-500/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <MapPin size={20} />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-rose-400 transition-colors">
                Peta Sebaran
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">Geospasial komisariat & kader se-Kab. Cirebon</p>
            </Link>

            <Link
              to="/perpustakaan"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-blue-500/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <BookOpen size={20} />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-blue-400 transition-colors">
                Perpustakaan AI
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">Koleksi kitab, modul kaderisasi & tanya jawab AI</p>
            </Link>

            <Link
              to="/chat"
              className="p-5 rounded-3xl bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-indigo-500/50 transition-all group"
            >
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Shield size={20} />
              </div>
              <h4 className="font-bold text-sm text-[var(--text-main)] group-hover:text-indigo-400 transition-colors">
                Komunikasi Terenkripsi
              </h4>
              <p className="text-xs text-[var(--text-muted)] mt-1">Saluran pesan rahasia aman E2EE antar pimpinan</p>
            </Link>
          </div>
        </div>

        {/* Right Column: Recent Activities */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black tracking-tight text-[var(--text-main)] flex items-center gap-2">
              <Activity size={18} className="text-emerald-500" />
              Aktivitas Terkini
            </h3>
          </div>

          <div className="bg-[var(--bg-card)] p-5 rounded-3xl border border-[var(--border-main)] shadow-sm space-y-4">
            {recentActivities.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--text-muted)]">
                Belum ada catatan aktivitas sistem terbaru.
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="flex items-start gap-3 pb-3 border-b border-[var(--border-main)] last:border-0 last:pb-0">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle size={14} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[var(--text-main)] truncate max-w-[220px] sm:max-w-xs">{getActivityText(act)}</p>
                    <span className="text-[10px] text-[var(--text-muted)]">{formatDisplayDate(act.timestamp) || 'Baru saja'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Beranda;
