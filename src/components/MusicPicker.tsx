import React, { useState, useEffect } from 'react';
import { X, Search, Music, Play, Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface MusicPickerProps {
  onSelect: (music: { title: string; artist: string; previewUrl: string }) => void;
  onClose: () => void;
}

export default function MusicPicker({ onSelect, onClose }: MusicPickerProps) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMusic = async () => {
      if (!search) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(search)}&media=music&limit=20`);
        const data = await response.json();
        setResults(data.results.map((item: any) => ({
          id: item.trackId,
          title: item.trackName,
          artist: item.artistName,
          previewUrl: item.previewUrl
        })));
      } catch (error) {
        console.error('Error fetching music:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchMusic, 500);
    return () => clearTimeout(debounce);
  }, [search]);

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 z-[250] bg-black flex flex-col"
    >
      <div className="flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-900">
        <button onClick={onClose} className="p-2 text-white hover:bg-zinc-900 rounded-full">
          <X size={24} />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest">Pilih Musik</h2>
        <div className="w-10" />
      </div>

      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
          <input 
            type="text"
            placeholder="Cari lagu atau artis..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 text-white pl-10 pr-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && (
          <div className="flex justify-center p-4">
            <Loader2 className="animate-spin text-emerald-500" size={32} />
          </div>
        )}
        {!loading && results.map((music) => (
          <div 
            key={music.id}
            className="flex items-center justify-between p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Music size={20} />
              </div>
              <div>
                <p className="text-white text-sm font-bold">{music.title}</p>
                <p className="text-zinc-500 text-xs">{music.artist}</p>
              </div>
            </div>
            <button 
              onClick={() => onSelect(music)}
              className="p-2 text-emerald-500 hover:bg-emerald-500/10 rounded-full"
            >
              <Check size={20} />
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
