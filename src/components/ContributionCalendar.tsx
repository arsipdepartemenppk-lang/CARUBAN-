import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

interface ContributionCalendarProps {
  userId: string;
}

export const ContributionCalendar: React.FC<ContributionCalendarProps> = ({ userId }) => {
  const [activities, setActivities] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; count: number } | null>(null);

  useEffect(() => {
    const fetchActivity = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const sources = [
        { name: 'attendances', dateField: 'createdAt' },
        { name: 'activity_logs', dateField: 'timestamp' },
        { name: 'visitasis', dateField: 'tanggalVisitasi' },
        { name: 'activities', dateField: 'createdAt' },
        { name: 'visitations', dateField: 'createdAt' }
      ];
      const activityMap: { [key: string]: number } = {};
      
      const now = new Date();
      const sixtyDaysAgo = subDays(now, 60);

      for (const src of sources) {
        try {
          // Query by userId without orderBy to avoid requiring custom composite indexes
          const q = query(
            collection(db, src.name),
            where('userId', '==', userId)
          );
          const snapshot = await getDocs(q);
          snapshot.forEach(doc => {
            const data = doc.data();
            const rawDate = data[src.dateField] || data.createdAt || data.timestamp || data.tanggalVisitasi;
            if (!rawDate) return;
            
            const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate);
            if (!isNaN(date.getTime()) && date >= sixtyDaysAgo) {
              const dateStr = format(date, 'yyyy-MM-dd');
              activityMap[dateStr] = (activityMap[dateStr] || 0) + 1;
            }
          });
        } catch (error) {
          // Non-fatal warning if an optional collection is unindexed or empty
          console.warn(`Optional activity query skipped for ${src.name}:`, error);
        }
      }

      const activityList = Object.entries(activityMap).map(([date, count]) => ({ date, count }));
      setActivities(activityList);
      setLoading(false);
    };

    if (userId) {
      fetchActivity();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const days = eachDayOfInterval({
    start: subDays(new Date(), 55),
    end: new Date()
  });

  const getIntensity = (count: number) => {
    if (count === 0) return 'bg-zinc-900';
    if (count <= 2) return 'bg-emerald-900';
    if (count <= 5) return 'bg-emerald-700';
    if (count <= 10) return 'bg-emerald-500';
    return 'bg-emerald-400';
  };

  if (loading) {
    return (
      <div className="w-full h-32 bg-zinc-900/50 rounded-3xl animate-pulse flex items-center justify-center">
        <span className="text-[10px] font-black text-zinc-700 uppercase tracking-widest">Memuat Kontribusi...</span>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-[32px] p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Heatmap Aktivitas (60 Hari Terakhir)</h3>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-zinc-600 uppercase font-black mr-1">Less</span>
          {[0, 2, 5, 10, 15].map(v => (
            <div key={v} className={`w-2 h-2 rounded-[2px] ${getIntensity(v)}`} />
          ))}
          <span className="text-[8px] text-zinc-600 uppercase font-black ml-1">More</span>
        </div>
      </div>

      <div className="grid grid-flow-col grid-rows-7 gap-1.5 overflow-x-auto pb-2 custom-scrollbar">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const activity = activities.find(a => a.date === dateStr);
          const count = activity?.count || 0;

          return (
            <motion.div
              key={dateStr}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onHoverStart={() => setHoveredDay({ date: dateStr, count })}
              onHoverEnd={() => setHoveredDay(null)}
              className={`w-3 h-3 rounded-[3px] transition-all cursor-crosshair relative group ${getIntensity(count)}`}
            >
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-zinc-900 text-[8px] text-white font-black rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10 border border-zinc-800">
                {count} Aksi • {format(day, 'dd MMM')}
              </div>
            </motion.div>
          );
        })}
      </div>
      
      <div className="mt-4 flex items-center justify-between border-t border-zinc-900/50 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <span className="text-emerald-500 font-black text-xs">{activities.reduce((acc, curr) => acc + curr.count, 0)}</span>
          </div>
          <div>
            <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest leading-none">Total Aktivitas</p>
            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">Dalam 2 bulan terakhir</p>
          </div>
        </div>
        
        {hoveredDay && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-right">
            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest leading-none">{hoveredDay.count} Aktivitas</p>
            <p className="text-[8px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{format(new Date(hoveredDay.date), 'EEEE, dd MMMM yyyy')}</p>
          </motion.div>
        )}
      </div>
    </div>
  );
};
