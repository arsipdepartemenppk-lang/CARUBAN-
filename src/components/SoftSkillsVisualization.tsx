import React, { useMemo } from 'react';
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

interface Log {
  id: string;
  title: string;
  content: string;
  createdAt: any;
}

interface Props {
  logs: Log[];
}

export const SoftSkillsVisualization: React.FC<Props> = ({ logs }) => {
  const eqData = useMemo(() => {
    return logs.map((log, index) => ({
      name: `Sesi ${index + 1}`,
      eq: Math.min(100, Math.max(40, (log.content?.length || 0) / 4 + Math.random() * 20)),
      resiliensi: Math.min(100, Math.max(30, (log.title?.length || 0) * 2 + Math.random() * 15))
    })).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  const wordCloudData = useMemo(() => {
    const words = logs.flatMap(log => log.content?.split(/\s+/) || []);
    const frequency: Record<string, number> = {};
    const stopWords = ['adalah', 'yang', 'untuk', 'dengan', 'dalam', 'saya', 'kami', 'kita', 'akan', 'bisa', 'pada', 'juga', 'dari', 'oleh'];
    
    words.forEach(word => {
      const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanWord.length > 3 && !stopWords.includes(cleanWord)) {
        frequency[cleanWord] = (frequency[cleanWord] || 0) + 1;
      }
    });

    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      ?.slice(0, 20)
      ?.map(([text, value]) => ({ text, value })) || [];
  }, [logs]);

  if (logs.length === 0) {
    return (
      <div className="bg-zinc-900/50 p-12 rounded-[32px] border border-zinc-800 text-center">
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Belum ada data untuk visualisasi</p>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-xl"
      >
        <div className="mb-6">
          <h3 className="text-xl font-black tracking-tighter text-emerald-400 uppercase">Tren Kecerdasan Emosional</h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Analisis EQ & Resiliensi Berbasis Jurnal</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={eqData}>
              <defs>
                <linearGradient id="colorEq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis dataKey="name" stroke="#52525b" fontSize={10} fontWeight="bold" />
              <YAxis stroke="#52525b" fontSize={10} fontWeight="bold" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', border: '1px solid #27272a', borderRadius: '16px' }}
                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="eq" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEq)" name="EQ Score" />
              <Area type="monotone" dataKey="resiliensi" stroke="#3b82f6" strokeWidth={3} fillOpacity={0} name="Resiliensi" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-zinc-900 p-8 rounded-[32px] border border-zinc-800 shadow-xl"
      >
        <div className="mb-6">
          <h3 className="text-xl font-black tracking-tighter text-emerald-400 uppercase">Awan Kata Adaptabilitas</h3>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Pola Pikir & Fokus Mingguan</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-center items-center h-64 overflow-hidden p-4">
          {wordCloudData.map((word, i) => (
            <motion.span 
              key={i}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{ 
                fontSize: `${Math.min(32, Math.max(12, word.value * 8))}px`,
                opacity: Math.min(1, 0.4 + (word.value / 5))
              }} 
              className={cn(
                "font-black uppercase tracking-tighter transition-all hover:text-white cursor-default",
                i % 3 === 0 ? "text-emerald-500" : i % 3 === 1 ? "text-emerald-400" : "text-emerald-600"
              )}
            >
              {word.text}
            </motion.span>
          ))}
        </div>
      </motion.div>
    </div>
  );
};
