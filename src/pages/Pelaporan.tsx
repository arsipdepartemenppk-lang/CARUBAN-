import React, { useState, useEffect } from 'react';
import { useFirebase } from '../components/FirebaseProvider';
import { useTheme } from '../components/ThemeProvider';
import { collection, onSnapshot } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { auth } from '../firebase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, LineChart, Line, AreaChart, Area, CartesianGrid,
  ComposedChart, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Area as ComposedArea, Legend
} from 'recharts';
import { 
  Users, FileText, Compass, Activity, Database, Trophy, Medal, Wifi, WifiOff,
  TrendingUp, Calendar, CheckCircle2, Clock, AlertTriangle, BarChart3, Filter, Sparkles
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { addBrandedHeader } from '../utils/pdfUtils';
import { getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { toJSDate, formatDisplayDate } from '../utils/dateUtils';

const Pelaporan: React.FC = () => {
  const { db } = useFirebase();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [stats, setStats] = useState([
    { name: 'Anggota', count: 0, color: '#10b981', icon: Users, coll: 'members' },
    { name: 'S. Masuk', count: 0, color: '#6366f1', icon: FileText, coll: 'suratMasuk' },
    { name: 'S. Keluar', count: 0, color: '#f43f5e', icon: FileText, coll: 'suratKeluar' },
    { name: 'Visitasi', count: 0, color: '#f59e0b', icon: Compass, coll: 'visitasis' },
    { name: 'Pimpinan', count: 0, color: '#8b5cf6', icon: Users, coll: 'pimpinan' },
    { name: 'Master PK', count: 0, color: '#0ea5e9', icon: Database, coll: 'pks' },
  ]);
  const [pks, setPks] = useState<any[]>([]);
  const [visitasis, setVisitasis] = useState<any[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!db || !auth.currentUser) return;
    const unsubscribes = stats.map((stat, index) => {
      return onSnapshot(collection(db, stat.coll), (snapshot) => {
        setStats(prev => {
          return prev.map((s, i) => {
            if (i === index) {
              return { ...s, count: snapshot.size };
            }
            return s;
          });
        });
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, stat.coll, auth);
      });
    });

    const unsubPks = onSnapshot(collection(db, 'pks'), (snapshot) => {
      setPks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pks', auth);
    });
    
    const unsubVisitasis = onSnapshot(collection(db, 'visitasis'), (snapshot) => {
      setVisitasis(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'visitasis', auth);
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
      unsubPks();
      unsubVisitasis();
    };
  }, [db, auth.currentUser]);

  const leaderboard = pks.map(pk => {
    const pkVisitasis = visitasis.filter(v => v.idPK === pk.id);
    let totalScore = 0;
    let latestVisitasiDate = null;
    if (pkVisitasis.length > 0) {
      const latestVisitasi = pkVisitasis.sort((a, b) => toJSDate(b.tglVisitasi).getTime() - toJSDate(a.tglVisitasi).getTime())[0];
      totalScore = (latestVisitasi.skorAdministrasi || 0) + 
                   (latestVisitasi.skorKaderisasi || 0) + 
                   (latestVisitasi.skorKeuangan || 0) + 
                   (latestVisitasi.skorInovasi || 0);
      latestVisitasiDate = latestVisitasi.tglVisitasi;
    }
    return {
      ...pk,
      totalScore,
      latestVisitasiDate
    };
  }).sort((a, b) => b.totalScore - a.totalScore);

  const zoneScores: Record<string, { totalScore: number; count: number }> = {};
  visitasis.forEach(v => {
    if (v.zona && v.skor !== undefined) {
      if (!zoneScores[v.zona]) {
        zoneScores[v.zona] = { totalScore: 0, count: 0 };
      }
      zoneScores[v.zona].totalScore += v.skor;
      zoneScores[v.zona].count += 1;
    }
  });

  const averageScorePerZone = Object.keys(zoneScores).map(zona => ({
    zona,
    rataRataSkor: Number((zoneScores[zona].totalScore / zoneScores[zona].count).toFixed(2))
  })).sort((a, b) => b.rataRataSkor - a.rataRataSkor);

  // --- Visit Statistics Over Time Computation ---
  const [timeFilter, setTimeFilter] = useState<'6M' | '1Y' | 'ALL'>('6M');
  const [chartMode, setChartMode] = useState<'trend' | 'status' | 'cumulative'>('trend');

  // Month names in Indonesian
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

  // Generate 8-month timeline ending at current month
  const visitStatsOverTime = React.useMemo(() => {
    const now = new Date();
    const monthsToInclude = timeFilter === '6M' ? 6 : timeFilter === '1Y' ? 12 : 12;
    const timeline: { 
      key: string; 
      label: string; 
      selesai: number; 
      terjadwal: number; 
      tertunda: number; 
      total: number;
      cumulative: number;
      avgScore: number;
    }[] = [];

    // Pre-populate months backwards
    for (let i = monthsToInclude - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      timeline.push({
        key,
        label,
        selesai: 0,
        terjadwal: 0,
        tertunda: 0,
        total: 0,
        cumulative: 0,
        avgScore: 0
      });
    }

    // Aggregate real visitasis data into timeline
    let runningCumulative = 0;
    const scoresPerMonth: Record<string, number[]> = {};

    visitasis.forEach(v => {
      const dateStr = v.tanggalVisitasi || v.tglVisitasi || v.createdAt;
      if (!dateStr) return;
      const vDate = toJSDate(dateStr);
      if (isNaN(vDate.getTime())) return;
      const key = `${vDate.getFullYear()}-${String(vDate.getMonth() + 1).padStart(2, '0')}`;
      
      const item = timeline.find(t => t.key === key);
      const status = (v.status || '').toLowerCase();

      if (item) {
        item.total += 1;
        if (status.includes('selesai') || status === 'visited') {
          item.selesai += 1;
        } else if (status.includes('tunda')) {
          item.tertunda += 1;
        } else {
          item.terjadwal += 1;
        }

        const score = v.skor || v.skorAdministrasi || v.skorKaderisasi;
        if (score) {
          if (!scoresPerMonth[key]) scoresPerMonth[key] = [];
          scoresPerMonth[key].push(score);
        }
      }
    });

    timeline.forEach(t => {
      const scores = scoresPerMonth[t.key] || [];
      t.avgScore = scores.length > 0 
        ? parseFloat((scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1))
        : 0;
    });

    // Compute cumulative
    timeline.forEach(t => {
      runningCumulative += t.selesai;
      t.cumulative = runningCumulative;
    });

    return timeline;
  }, [visitasis, timeFilter]);

  // Overall visit KPI calculations
  const totalVisits = visitStatsOverTime.reduce((sum, item) => sum + item.total, 0);
  const totalCompleted = visitStatsOverTime.reduce((sum, item) => sum + item.selesai, 0);
  const completionRate = totalVisits > 0 ? Math.round((totalCompleted / totalVisits) * 100) : 0;
  const peakMonth = [...visitStatsOverTime].sort((a, b) => b.total - a.total)[0];
  const monthlyAverage = (totalVisits / (visitStatsOverTime.length || 1)).toFixed(1);

  const handleExportCSV = () => {
    const data = [
      ['Statistik Bulanan Caruban Core'],
      ['Tanggal Laporan', new Date().toLocaleDateString('id-ID')],
      [],
      ['Kategori', 'Jumlah'],
      ...stats.map(s => [s.name, s.count]),
      [],
      ['Analitik Kunjungan per Bulan'],
      ['Bulan', 'Selesai', 'Terjadwal', 'Tertunda', 'Total', 'Skor Rata-rata'],
      ...visitStatsOverTime.map(t => [t.label, t.selesai, t.terjadwal, t.tertunda, t.total, t.avgScore]),
      [],
      ['Leaderboard Komisariat'],
      ['Rank', 'Nama PK', 'Skor Total', 'Visitasi Terakhir'],
      ...leaderboard.map((pk, idx) => [idx + 1, pk.namaPK || pk.nama, pk.totalScore, pk.latestVisitasiDate || '-'])
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Organisasi");
    XLSX.writeFile(wb, `Laporan_Caruban_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    const dateStr = now.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const startY = addBrandedHeader(doc, {
      title: 'LAPORAN BULANAN CARUBAN CORE',
      subtitle: 'Analisis Pertumbuhan & Supervisi Organisasi',
      date: dateStr
    });

    // Overview Section
    doc.setFontSize(14);
    doc.setTextColor(16, 185, 129); // Emerald-500
    doc.text('Ringkasan Eksekutif', 14, startY + 10);
    
    const overviewData = stats.map(s => [s.name, s.count]);
    (doc as any).autoTable({
      startY: startY + 15,
      head: [['Kategori', 'Total']],
      body: overviewData,
      theme: 'grid',
      headStyles: { fillColor: [16, 185, 129] },
      styles: { fontSize: 10 }
    });

    const nextY = (doc as any).lastAutoTable.finalY + 15;

    // Leaderboard Table
    doc.setFontSize(14);
    doc.setTextColor(245, 158, 11); // Amber-500
    doc.text('Peringkat Pimpinan Komisariat (Leaderboard)', 14, nextY);

    const leaderboardData = leaderboard.map((pk, idx) => [
      idx + 1,
      pk.namaPK || pk.nama,
      pk.totalScore,
      pk.latestVisitasiDate ? formatDisplayDate(pk.latestVisitasiDate, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Belum'
    ]);

    (doc as any).autoTable({
      startY: nextY + 5,
      head: [['Rank', 'Nama PK', 'Skor Total', 'Visitasi Terakhir']],
      body: leaderboardData,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] },
      styles: { fontSize: 10 }
    });

    // Visit Statistics Table
    doc.addPage();
    addBrandedHeader(doc, {
      title: 'STATISTIK KUNJUNGAN & TREN',
      subtitle: 'Detail Performa Bulanan',
      date: dateStr
    });

    const statsData = visitStatsOverTime.map(t => [
      t.label,
      t.selesai,
      t.terjadwal,
      t.tertunda,
      t.total,
      t.avgScore
    ]);

    (doc as any).autoTable({
      startY: 50,
      head: [['Bulan', 'Selesai', 'Terjadwal', 'Tertunda', 'Total', 'Avg Skor']],
      body: statsData,
      theme: 'striped',
      headStyles: { fillColor: [99, 102, 241] }, // Indigo-500
      styles: { fontSize: 10 }
    });

    doc.save(`Laporan_Caruban_Core_${now.toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className={cn(
      "p-4 pb-24 min-h-screen font-sans transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]",
    )}>
      <div className="mb-12 pt-12 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">PELAPORAN & ANALITIK</h1>
          <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Visualisasi Data & Statistik Real-time</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-[var(--bg-app)] p-1 rounded-2xl border border-[var(--border-main)] mr-2">
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 transition-all"
              title="Export PDF Summary"
            >
              <FileText size={14} />
              Quick PDF
            </button>
          </div>

          <button
            onClick={() => {
              fetch('/api/notifications/reminders')
                .then(res => res.json())
                .then(data => {
                  if (data.success) {
                    alert(`Berhasil mengirim ${data.remindersSent} pengingat visitasi.`);
                  }
                });
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
          >
            <AlertTriangle size={14} />
            Reminders
          </button>
          
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
          >
            <Database size={14} />
            CSV
          </button>
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-widest transition-all",
            isOnline 
              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-500 border-rose-500/20 animate-pulse"
          )}>
            {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Main KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {stats.map((stat) => (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            key={stat.name}
            className={cn(
              "border rounded-[32px] p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group transition-all bg-[var(--bg-card)] border-[var(--border-main)] shadow-sm",
            )}
          >
            <div 
              className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity"
              style={{ backgroundColor: stat.color }}
            />
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 border border-white/5"
              style={{ backgroundColor: `${stat.color}20`, color: stat.color }}
            >
              <stat.icon size={24} />
            </div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.name}</p>
            <p className="text-3xl font-black tabular-nums tracking-tighter">{stat.count}</p>
          </motion.div>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* NEW DASHBOARD SECTION: STATISTIK VISITASI SEPANJANG WAKTU (VISITS OVER TIME) */}
      {/* ========================================================================= */}
      <div className={cn(
        "border rounded-[40px] p-6 md:p-8 mb-12 transition-all bg-[var(--bg-card)] border-[var(--border-main)] shadow-lg"
      )}>
        {/* Section Header with Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8 pb-6 border-b border-[var(--border-main)]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                <Compass size={13} /> Analitika Supervisi
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400">
                Live Data
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-2">
              <TrendingUp className="text-amber-400" size={26} />
              Statistik Kunjungan Visitasi Sepanjang Waktu
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Tren frekuensi supervisi komisariat (PK) & anak cabang (PAC) per bulan, capaian kumulatif, dan rasio penyelesaian.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-[var(--bg-app)] p-1 rounded-2xl border border-[var(--border-main)]">
              <button
                onClick={() => setChartMode('trend')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  chartMode === 'trend'
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                Tren & Status
              </button>
              <button
                onClick={() => setChartMode('cumulative')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  chartMode === 'cumulative'
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                Kumulatif
              </button>
              <button
                onClick={() => setChartMode('status')}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                  chartMode === 'status'
                    ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
                    : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                )}
              >
                Distribusi Batang
              </button>
            </div>

            {/* Time Filter Toggle */}
            <div className="flex items-center bg-[var(--bg-app)] p-1 rounded-2xl border border-[var(--border-main)]">
              {(['6M', '1Y'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTimeFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold transition-all",
                    timeFilter === f
                      ? "bg-zinc-800 text-white dark:bg-zinc-700"
                      : "text-[var(--text-muted)] hover:text-[var(--text-main)]"
                  )}
                >
                  {f === '6M' ? '6 Bulan' : '1 Tahun'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Highlight KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] p-4 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">
              <span>Total Kunjungan</span>
              <Compass size={14} className="text-amber-400" />
            </div>
            <p className="text-2xl font-black text-[var(--text-main)]">{totalVisits}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Seluruh agenda tercatat</p>
          </div>

          <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] p-4 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">
              <span>Tingkat Penyelesaian</span>
              <CheckCircle2 size={14} className="text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400">{completionRate}%</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{totalCompleted} visitasi tuntas</p>
          </div>

          <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] p-4 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">
              <span>Rata-Rata Bulanan</span>
              <BarChart3 size={14} className="text-teal-400" />
            </div>
            <p className="text-2xl font-black text-[var(--text-main)]">{monthlyAverage}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">Kunjungan per bulan</p>
          </div>

          <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] p-4 rounded-2xl">
            <div className="flex items-center justify-between text-zinc-500 text-[10px] font-black uppercase tracking-wider mb-1">
              <span>Puncak Supervisi</span>
              <Sparkles size={14} className="text-purple-400" />
            </div>
            <p className="text-2xl font-black text-purple-400">{peakMonth?.label || '-'}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{peakMonth?.total || 0} agenda visitasi</p>
          </div>
        </div>

        {/* Main Recharts Container for Visits Over Time */}
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            {chartMode === 'trend' ? (
              <AreaChart data={visitStatsOverTime} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.05}/>
                  </linearGradient>
                  <linearGradient id="colorTerjadwal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#f4f4f5"} vertical={false} />
                <XAxis 
                  dataKey="label" 
                  stroke={isDark ? "#71717a" : "#a1a1aa"} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke={isDark ? "#71717a" : "#a1a1aa"} 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderRadius: '16px',
                    border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(val: any, name: any) => {
                    const labelMap: Record<string, string> = {
                      selesai: 'Visitasi Selesai',
                      terjadwal: 'Visitasi Terjadwal',
                      tertunda: 'Tertunda'
                    };
                    return [`${val} Kunjungan`, labelMap[name] || name];
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '15px' }}
                  formatter={(value) => {
                    const labelMap: Record<string, string> = {
                      selesai: 'Visitasi Selesai',
                      terjadwal: 'Visitasi Terjadwal',
                      tertunda: 'Tertunda'
                    };
                    return <span className="text-xs font-bold text-zinc-400">{labelMap[value] || value}</span>;
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="selesai" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorSelesai)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="terjadwal" 
                  stroke="#f59e0b" 
                  strokeWidth={2} 
                  fillOpacity={1} 
                  fill="url(#colorTerjadwal)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="tertunda" 
                  stroke="#f43f5e" 
                  strokeWidth={2} 
                  dot={{ r: 3 }} 
                />
              </AreaChart>
            ) : chartMode === 'cumulative' ? (
              <AreaChart data={visitStatsOverTime} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#f4f4f5"} vertical={false} />
                <XAxis dataKey="label" stroke={isDark ? "#71717a" : "#a1a1aa"} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? "#71717a" : "#a1a1aa"} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderRadius: '16px',
                    border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                  formatter={(val: any) => [`${val} Total Akumulasi`, 'Kumulatif Selesai']}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulative" 
                  name="Total Kumulatif Selesai" 
                  stroke="#0ea5e9" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorCumulative)" 
                />
              </AreaChart>
            ) : (
              <BarChart data={visitStatsOverTime} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#f4f4f5"} vertical={false} />
                <XAxis dataKey="label" stroke={isDark ? "#71717a" : "#a1a1aa"} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={isDark ? "#71717a" : "#a1a1aa"} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderRadius: '16px',
                    border: isDark ? '1px solid #27272a' : '1px solid #e4e4e7'
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '15px' }}
                  formatter={(value) => <span className="text-xs font-bold text-zinc-400 uppercase">{value}</span>}
                />
                <Bar dataKey="selesai" name="Selesai" fill="#10b981" radius={[6, 6, 0, 0]} stackId="a" />
                <Bar dataKey="terjadwal" name="Terjadwal" fill="#f59e0b" radius={[0, 0, 0, 0]} stackId="a" />
                <Bar dataKey="tertunda" name="Tertunda" fill="#f43f5e" radius={[6, 6, 0, 0]} stackId="a" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* NEW DASHBOARD SECTION: ANALISIS KUALITAS VISITASI (QUALITY TREND) */}
        <div className="mt-12 pt-12 border-t border-[var(--border-main)]">
          <div className="flex items-center gap-2 mb-6">
            <Activity className="text-emerald-400" size={24} />
            <h3 className="text-lg font-black text-[var(--text-main)] uppercase tracking-tight">Tren Kualitas & Efektivitas Visitasi</h3>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitStatsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#27272a" : "#f4f4f5"} vertical={false} />
                <XAxis dataKey="label" stroke={isDark ? "#71717a" : "#a1a1aa"} fontSize={10} tickLine={false} axisLine={false} />
                <YAxis domain={[0, 5]} stroke={isDark ? "#71717a" : "#a1a1aa"} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#18181b' : '#ffffff',
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Line 
                  type="stepAfter" 
                  dataKey="avgScore" 
                  name="Rata-rata Skor" 
                  stroke="#10b981" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-zinc-500 mt-4 italic font-medium">
            * Skor didasarkan pada akumulasi indikator Administrasi, Kaderisasi, Keuangan, dan Inovasi (Skala 1-5).
          </p>
        </div>
      </div>

      {/* Leaderboard and Mini Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className={cn(
          "lg:col-span-1 border rounded-[40px] p-8 relative overflow-hidden transition-all flex flex-col bg-[var(--bg-card)] border-[var(--border-main)] shadow-sm",
        )}>
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
              <Trophy className="text-amber-500" size={24} />
              Leaderboard CORE
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 space-y-4 no-scrollbar">
            {leaderboard.length > 0 ? leaderboard.map((pk, index) => (
              <div 
                key={pk.id} 
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border transition-all",
                  index === 0 ? (isDark ? "bg-amber-500/10 border-amber-500/30" : "bg-amber-50 border-amber-200") :
                  index === 1 ? (isDark ? "bg-zinc-300/10 border-zinc-300/30" : "bg-zinc-100 border-zinc-300") :
                  index === 2 ? (isDark ? "bg-orange-500/10 border-orange-500/30" : "bg-orange-50 border-orange-200") :
                  "bg-[var(--bg-app)] border-[var(--border-main)]"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center font-black text-sm",
                    index === 0 ? "bg-amber-500 text-white" :
                    index === 1 ? "bg-zinc-400 text-white" :
                    index === 2 ? "bg-orange-500 text-white" :
                    "bg-[var(--bg-card)] text-[var(--text-muted)]"
                  )}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-bold text-sm">{typeof pk.namaPK === 'string' ? pk.namaPK : (typeof pk.nama === 'string' ? pk.nama : (pk.nama?.nama || 'Pimpinan'))}</p>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                      {pk.latestVisitasiDate ? `Visitasi: ${formatDisplayDate(pk.latestVisitasiDate)}` : 'Belum divisitasi'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black tabular-nums">{pk.totalScore}</p>
                  <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Poin</p>
                </div>
              </div>
            )) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                <Medal size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-bold">Belum ada data visitasi</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <div key={stat.name} className={cn(
              "border rounded-[32px] p-6 transition-all",
              isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
            )}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black uppercase tracking-widest">{stat.name}</h3>
                <stat.icon size={20} style={{ color: stat.color }} />
              </div>
              <div className="h-[150px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {stat.name === 'Anggota' ? (
                    <BarChart data={[stat]}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Bar dataKey="count" fill={stat.color} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  ) : stat.name === 'S. Masuk' ? (
                    <PieChart>
                      <Pie data={[stat]} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={50} fill={stat.color} />
                      <Tooltip />
                    </PieChart>
                  ) : stat.name === 'S. Keluar' ? (
                    <LineChart data={[stat]}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Line type="monotone" dataKey="count" stroke={stat.color} strokeWidth={3} />
                    </LineChart>
                  ) : stat.name === 'Visitasi' ? (
                    <AreaChart data={[stat]}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <Area type="monotone" dataKey="count" stroke={stat.color} fill={stat.color} />
                    </AreaChart>
                  ) : stat.name === 'Pimpinan' ? (
                    <ComposedChart data={[stat]}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip cursor={{ fill: 'transparent' }} />
                      <ComposedArea type="monotone" dataKey="count" fill={stat.color} stroke={stat.color} />
                    </ComposedChart>
                  ) : (
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={[stat]}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="name" />
                      <PolarRadiusAxis angle={30} domain={[0, stat.count + 5]} />
                      <Radar name={stat.name} dataKey="count" stroke={stat.color} fill={stat.color} fillOpacity={0.6} />
                    </RadarChart>
                  )}
                </ResponsiveContainer>
              </div>
              <p className="text-2xl font-black tabular-nums mt-4">{stat.count}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={cn(
        "border rounded-[40px] p-8 mb-12 transition-all",
        isDark ? "bg-zinc-900/30 border-zinc-800" : "bg-white border-zinc-200 shadow-sm"
      )}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <Activity className="text-emerald-500" size={24} />
            Rata-rata Skor Visitasi per Zona
          </h2>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={averageScorePerZone} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#3f3f46" : "#e4e4e7"} vertical={false} />
              <XAxis dataKey="zona" stroke={isDark ? "#a1a1aa" : "#71717a"} fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke={isDark ? "#a1a1aa" : "#71717a"} fontSize={12} tickLine={false} axisLine={false} domain={[0, 5]} />
              <Tooltip 
                cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }}
                contentStyle={{ backgroundColor: isDark ? '#18181b' : '#ffffff', borderRadius: '16px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              <Bar dataKey="rataRataSkor" name="Rata-rata Skor" fill="#10b981" radius={[8, 8, 0, 0]}>
                {averageScorePerZone.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.rataRataSkor < 3 ? '#f43f5e' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Pelaporan;
