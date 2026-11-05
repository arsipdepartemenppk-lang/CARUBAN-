import React, { useState, useEffect, useMemo } from 'react';
import { X, Music, Check, Loader2, Clock, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicPicker from './MusicPicker';
import { cn } from '../lib/utils';

interface StoryEditorProps {
  file: File;
  type: 'image' | 'video';
  onShare: (file: File, type: 'image' | 'video', music?: { title: string; artist: string; previewUrl: string }, scheduledAt?: string) => Promise<void>;
  onClose: () => void;
}

export default function StoryEditor({ file, type, onShare, onClose }: StoryEditorProps) {
  const [music, setMusic] = useState<{ title: string; artist: string; previewUrl: string } | undefined>();
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showSchedulePicker, setShowSchedulePicker] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');

  const mediaUrl = useMemo(() => {
    if (!file) return '';
    try {
      return URL.createObjectURL(file);
    } catch (e) {
      console.error('Error creating object URL:', e);
      return '';
    }
  }, [file]);

  useEffect(() => {
    return () => {
      if (mediaUrl) {
        URL.revokeObjectURL(mediaUrl);
      }
    };
  }, [mediaUrl]);

  const handleShare = async () => {
    if (!file) return;
    setIsUploading(true);
    try {
      await onShare(file, type, music, scheduledAt);
      onClose();
    } catch (error) {
      console.error('Share error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!file) return null;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between z-10">
        <button onClick={onClose} className="p-2 text-white bg-black/50 rounded-full transition hover:bg-black/70">
          <X size={24} />
        </button>
        <button 
          onClick={handleShare}
          disabled={isUploading || !mediaUrl}
          className="px-6 py-2 bg-emerald-600 text-white rounded-full font-bold flex items-center gap-2 transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
          Bagikan
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        {type === 'image' ? (
          <img src={mediaUrl} alt="Story preview" className="max-h-full max-w-full object-contain" />
        ) : (
          <video src={mediaUrl} className="max-h-full max-w-full" controls autoPlay loop muted />
        )}
      </div>

      <div className="absolute bottom-8 left-4 right-4 flex flex-col items-center gap-4">
        <div className="flex gap-3">
          <button 
            onClick={() => setShowMusicPicker(true)}
            className="flex items-center gap-2 px-6 py-3 bg-black/60 text-white rounded-full backdrop-blur-xl border border-white/10 shadow-2xl transition hover:bg-black/80"
          >
            <Music size={20} className="text-emerald-400" />
            <span className="text-sm font-bold truncate max-w-[150px]">
              {music ? `${music.title} - ${music.artist}` : 'Musik'}
            </span>
          </button>
          <button 
            onClick={() => setShowSchedulePicker(true)}
            className={cn(
              "flex items-center gap-2 px-6 py-3 bg-black/60 text-white rounded-full backdrop-blur-xl border border-white/10 shadow-2xl transition hover:bg-black/80",
              scheduledAt && "border-amber-500 text-amber-500"
            )}
          >
            <Clock size={20} className={scheduledAt ? "text-amber-500" : "text-emerald-400"} />
            <span className="text-sm font-bold">
              {scheduledAt ? new Date(scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Jadwal'}
            </span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showSchedulePicker && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSchedulePicker(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 shadow-2xl"
            >
              <div className="w-16 h-16 bg-amber-500/10 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-6">
                <Calendar size={32} />
              </div>
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2 text-center text-white">Jadwalkan Cerita</h3>
              <p className="text-xs text-neutral-500 mb-8 text-center">Cerita Anda akan dibagikan secara otomatis pada waktu yang ditentukan.</p>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-neutral-500 ml-1">Pilih Waktu</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    min={new Date()?.toISOString()?.slice(0, 16) || ''}
                    className="w-full p-4 rounded-2xl border border-neutral-800 bg-black/40 text-white outline-none focus:border-amber-500 transition-all font-bold"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowSchedulePicker(false);
                      setScheduledAt('');
                    }}
                    className="flex-1 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all bg-neutral-800 text-white hover:bg-neutral-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={() => setShowSchedulePicker(false)}
                    className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showMusicPicker && (
        <MusicPicker 
          onSelect={(m) => { setMusic(m); setShowMusicPicker(false); }}
          onClose={() => setShowMusicPicker(false)}
        />
      )}
    </motion.div>
  );
}
