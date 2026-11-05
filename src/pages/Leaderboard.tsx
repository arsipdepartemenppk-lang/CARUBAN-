import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Medal, Map as MapIcon, Star, Loader2, ArrowUpDown, UserPlus } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface PK {
  id: string;
  namaPK: string;
  zona?: string;
  organisasi?: string;
  excellentRating?: number;
  status?: string;
}

interface ZoneScore {
  zona: string;
  averageScore: number;
  pkCount: number;
}

const Leaderboard: React.FC = () => {
  const [pks, setPks] = useState<PK[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [zones, setZones] = useState<ZoneScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewType, setViewType] = useState<'pk' | 'zone' | 'user'>('pk');
  const [filterZona, setFilterZona] = useState<string>('Semua');
  const [filterOrganisasi, setFilterOrganisasi] = useState<string>('Semua');

  useEffect(() => {
    const qPks = query(collection(db, 'pks'));
    const qUsers = query(collection(db, 'users'));
    
    const unsubPks = onSnapshot(qPks, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PK));
      setPks(data);
      
      const zoneMap = new Map<string, { totalScore: number; count: number }>();
      data.forEach(pk => {
        const zona = pk.zona || 'Tanpa Zona';
        const rating = pk.excellentRating || 0;
        
        if (!zoneMap.has(zona)) {
          zoneMap.set(zona, { totalScore: 0, count: 0 });
        }
        
        const current = zoneMap.get(zona)!;
        current.totalScore += rating;
        current.count += 1;
      });

      const zoneScores: ZoneScore[] = Array.from(zoneMap.entries()).map(([zona, stats]) => ({
        zona,
        averageScore: stats.count > 0 ? stats.totalScore / stats.count : 0,
        pkCount: stats.count
      }));

      setZones(zoneScores);
      setLoading(false);
    });

    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });

    return () => {
      unsubPks();
      unsubUsers();
    };
  }, []);

  const sortedData = useMemo(() => {
    if (viewType === 'zone') {
      return [...zones].sort((a, b) => {
        return sortOrder === 'desc' ? b.averageScore - a.averageScore : a.averageScore - b.averageScore;
      });
    } else if (viewType === 'user') {
      return [...users].sort((a, b) => {
        const scoreA = a.poinSkill || 0;
        const scoreB = b.poinSkill || 0;
        return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
      });
    } else {
      return pks
        .filter(pk => (filterZona === 'Semua' || pk.zona === filterZona))
        .filter(pk => (filterOrganisasi === 'Semua' || pk.organisasi === filterOrganisasi))
        .sort((a, b) => {
          const scoreA = a.excellentRating || 0;
          const scoreB = b.excellentRating || 0;
          return sortOrder === 'desc' ? scoreB - scoreA : scoreA - scoreB;
        });
    }
  }, [pks, users, zones, sortOrder, viewType, filterZona, filterOrganisasi]);

  const uniqueZonas = useMemo(() => ['Semua', ...Array.from(new Set(pks.map(pk => pk.zona).filter(Boolean)))], [pks]);
  const uniqueOrgs = useMemo(() => ['Semua', ...Array.from(new Set(pks.map(pk => pk.organisasi).filter(Boolean)))], [pks]);

  const getRankIcon = (index: number, isDesc: boolean) => {
    if (!isDesc) return <span className="text-zinc-500 font-black">{index + 1}</span>;
    switch (index) {
      case 0: return <Trophy className="text-amber-400" size={24} />;
      case 1: return <Medal className="text-zinc-400" size={24} />;
      case 2: return <Medal className="text-amber-700" size={24} />;
      default: return <span className="text-zinc-500 font-black">{index + 1}</span>;
    }
  };

  return (
    <div className="p-4 pb-24 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] font-sans">
      <div className="pt-12 mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">Leaderboard</h1>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.3em]">Peringkat Performa Terbaik</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-main)] flex">
            <button
              onClick={() => setViewType('pk')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                viewType === 'pk' ? "bg-emerald-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Komisariat
            </button>
            <button
              onClick={() => setViewType('zone')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                viewType === 'zone' ? "bg-emerald-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Zona
            </button>
            <button
              onClick={() => setViewType('user')}
              className={cn(
                "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                viewType === 'user' ? "bg-emerald-600 text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Anggota
            </button>
          </div>
          <button
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-card)] hover:opacity-80 rounded-xl border border-[var(--border-main)] transition-colors"
          >
            <ArrowUpDown size={16} className="text-zinc-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-300">
              {sortOrder === 'desc' ? 'Top' : 'Bottom'}
            </span>
          </button>
        </div>
      </div>

      {viewType === 'pk' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Filter Zona</label>
            <select
              value={filterZona}
              onChange={(e) => setFilterZona(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all appearance-none text-[var(--text-muted)]"
            >
              {uniqueZonas.map(z => <option key={z} value={z}>{z}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Filter Organisasi</label>
            <select
              value={filterOrganisasi}
              onChange={(e) => setFilterOrganisasi(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-3 text-xs font-bold outline-none focus:border-emerald-500 transition-all appearance-none text-[var(--text-muted)]"
            >
              {uniqueOrgs.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-emerald-500" size={40} /></div>
      ) : (
        <div className="space-y-4">
          {sortedData.map((item, index) => {
            const isZone = viewType === 'zone';
            const isUser = viewType === 'user';
            const title = isZone ? (item as ZoneScore).zona : isUser ? (item as any).displayName : (item as PK).namaPK;
            const subTitle = isZone ? `${(item as ZoneScore).pkCount} Komisariat` : isUser ? (item as any).role : (item as PK).zona;
            const score = isZone ? (item as ZoneScore).averageScore : isUser ? (item as any).poinSkill || 0 : (item as PK).excellentRating || 0;
            const org = !isZone && !isUser ? (item as PK).organisasi : null;

            return (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                key={isZone ? (item as ZoneScore).zona : (item as any).id}
                className={cn(
                  "relative overflow-hidden bg-[var(--bg-card)] border p-6 rounded-[32px] flex items-center justify-between transition-all",
                  index === 0 && sortOrder === 'desc' ? "border-amber-500/50 bg-amber-500/5 shadow-[0_0_30px_rgba(245,158,11,0.05)]" : "border-[var(--border-main)]"
                )}
              >
                <div className="flex items-center gap-6 relative z-10">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center border",
                    index === 0 && sortOrder === 'desc' ? "bg-amber-500/10 border-amber-500/20" : "bg-[var(--bg-app)] border-[var(--border-main)]"
                  )}>
                    {getRankIcon(index, sortOrder === 'desc')}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-zinc-500",
                      org === 'IPNU' ? "bg-emerald-500/10 text-emerald-500" : org === 'IPPNU' ? "bg-blue-500/10 text-blue-500" : "bg-zinc-950"
                    )}>
                      {isZone ? <MapIcon size={20} /> : isUser ? <UserPlus size={20} /> : <Star size={20} />}
                    </div>
                    <div>
                      <h3 className="font-black text-lg tracking-tight leading-none mb-1">{title}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                          {subTitle}
                        </span>
                        {org && (
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            org === 'IPNU' ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
                          )}>
                            {org}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right relative z-10">
                  <div className={cn(
                    "text-3xl font-black tracking-tighter",
                    isUser ? "text-emerald-500" : score >= 4.5 ? "text-emerald-500" : score >= 3.5 ? "text-blue-500" : score >= 2.5 ? "text-amber-500" : "text-rose-500"
                  )}>
                    {isUser ? score : score.toFixed(1)}
                  </div>
                  <div className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                    {isUser ? 'Poin' : 'Excellent Rating'}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
