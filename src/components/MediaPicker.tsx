import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Image as ImageIcon, Video, Send, Check, Music } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MusicPicker from './MusicPicker';

interface MediaPickerProps {
  onSelect: (file: File | null, type: 'image' | 'video' | 'audio', music?: { title: string; artist: string; previewUrl: string }) => void;
  onClose: () => void;
}

export default function MediaPicker({ onSelect, onClose }: MediaPickerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'audio' | null>(null);
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState<{ title: string; artist: string; previewUrl: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      let type: 'image' | 'video' | 'audio' | null = null;
      if (file.type.startsWith('image/')) type = 'image';
      else if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      
      if (!type) {
        alert('Format file tidak didukung');
        return;
      }
      
      setSelectedFile(file);
      setMediaType(type);
      setSelectedMusic(null);
      
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleConfirm = async () => {
    if (!mediaType) {
      alert('Pilih media terlebih dahulu');
      return;
    }
    try {
      await onSelect(selectedFile, mediaType, selectedMusic || undefined);
    } catch (error) {
      console.error('Media selection error:', error);
    }
  };

  return (
    <motion.div 
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      className="fixed inset-0 z-[200] bg-black flex flex-col"
    >
      <AnimatePresence>
        {showMusicPicker && (
          <MusicPicker 
            onClose={() => setShowMusicPicker(false)}
            onSelect={(music) => {
              setSelectedMusic(music);
              setMediaType('audio');
              setSelectedFile(null);
              setPreviewUrl(null);
              setShowMusicPicker(false);
            }}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between p-4 bg-zinc-950/50 backdrop-blur-md border-b border-zinc-900">
        <button onClick={onClose} className="p-2 text-white hover:bg-zinc-900 rounded-full transition">
          <X size={24} />
        </button>
        <h2 className="text-sm font-black uppercase tracking-widest">Kirim Media</h2>
        <div className="w-10" />
      </div>

      <div className="flex-1 relative bg-zinc-950 flex items-center justify-center overflow-hidden">
        {previewUrl ? (
          mediaType === 'image' ? (
            <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
          ) : mediaType === 'video' ? (
            <video src={previewUrl} controls className="max-w-full max-h-full" />
          ) : (
            <div className="flex flex-col items-center gap-4 text-emerald-500">
              <div className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20">
                <Music size={64} className="animate-pulse" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest">{selectedFile?.name}</p>
              <audio src={previewUrl} controls className="w-64" />
            </div>
          )
        ) : selectedMusic ? (
          <div className="flex flex-col items-center gap-4 text-emerald-500">
            <div className="w-32 h-32 rounded-full bg-emerald-500/10 flex items-center justify-center border-2 border-emerald-500/20">
              <Music size={64} className="animate-pulse" />
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{selectedMusic.title}</p>
            <p className="text-xs text-zinc-500">{selectedMusic.artist}</p>
            <audio src={selectedMusic.previewUrl} controls className="w-64" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-zinc-700">
            <div className="w-24 h-24 rounded-full bg-zinc-900 flex items-center justify-center">
              <Camera size={48} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest">Pilih dari Galeri atau Kamera</p>
          </div>
        )}
      </div>

      <div className="p-8 bg-zinc-950 border-t border-zinc-900 pb-12">
        <div className="flex items-center justify-around gap-4">
          <button 
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.accept = "image/*,video/*,audio/*";
                fileInputRef.current.removeAttribute('capture');
                fileInputRef.current.click();
              }
            }}
            className="flex flex-col items-center gap-3 text-zinc-500 hover:text-emerald-500 transition group"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
              <ImageIcon size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Galeri</span>
          </button>

          <button 
            onClick={() => {
              if (cameraInputRef.current) {
                cameraInputRef.current.click();
              }
            }}
            className="flex flex-col items-center gap-3 text-zinc-500 hover:text-emerald-500 transition group"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
              <Camera size={28} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Kamera</span>
          </button>

          <button 
            onClick={() => setShowMusicPicker(true)}
            className="flex flex-col items-center gap-3 text-zinc-500 hover:text-emerald-500 transition group"
          >
            <div className="w-14 h-14 rounded-2xl bg-zinc-900 flex items-center justify-center group-hover:bg-emerald-500/10 transition-colors">
              <Music size={28} className="text-emerald-500" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest">Studio</span>
          </button>

          <button 
            onClick={handleConfirm}
            disabled={!selectedFile && !selectedMusic}
            className="w-20 h-20 bg-emerald-600 disabled:opacity-50 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-900/40 active:scale-90 transition-all"
          >
            <Check size={40} strokeWidth={3} />
          </button>
        </div>

        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
        <input 
          type="file" 
          ref={cameraInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>
    </motion.div>
  );
}
