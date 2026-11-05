import React, { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Camera, X, Check, RotateCcw, Image as ImageIcon, Upload, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (blob: Blob) => void;
  title?: string;
}

export const DocumentScanner: React.FC<DocumentScannerProps> = ({ 
  isOpen, 
  onClose, 
  onUpload,
  title = "Scan Dokumen & Foto"
}) => {
  const { showToast } = useToast();
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      if (!navigator?.mediaDevices?.getUserMedia) {
        showToast("Akses kamera tidak didukung di lingkungan browser ini. Silakan gunakan opsi unggah foto.", "info");
        setIsCapturing(false);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.warn("Document scanner camera notice:", err);
      const msg = String(err?.message || err?.name || err);
      if (msg.includes('Timeout') || err?.name === 'AbortError') {
        showToast("Koneksi kamera timeout. Anda dapat menggunakan opsi unggah file foto.", "info");
      } else if (err?.name === 'NotAllowedError') {
        showToast("Izin kamera ditolak. Harap izinkan akses kamera di peramban.", "error");
      } else {
        showToast("Gagal mengakses kamera. Silakan gunakan opsi unggah file foto.", "info");
      }
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      try {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      } catch {}
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  React.useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setImage(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImage(reader.result as string));
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const generateCroppedImage = async () => {
    if (!image || !croppedAreaPixels) return;

    try {
      const img = new Image();
      img.src = image;
      await new Promise((resolve) => (img.onload = resolve));

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      canvas.width = croppedAreaPixels.width;
      canvas.height = croppedAreaPixels.height;

      if (ctx) {
        ctx.drawImage(
          img,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );

        canvas.toBlob((blob) => {
          if (blob) {
            onUpload(blob);
            resetScanner();
            onClose();
            showToast("Gambar berhasil diproses dan diunggah", "success");
          }
        }, 'image/jpeg', 0.9);
      }
    } catch (e) {
      console.error(e);
      showToast("Gagal memproses gambar", "error");
    }
  };

  const resetScanner = () => {
    setImage(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setIsCapturing(false);
    stopCamera();
  };

  const handleClose = () => {
    resetScanner();
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-[40px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                  <Camera size={20} />
                </div>
                <h3 className="text-lg font-black text-white uppercase tracking-tighter">{title}</h3>
              </div>
              <button onClick={handleClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 relative bg-black min-h-[300px] flex items-center justify-center">
              {!image && !isCapturing && (
                <div className="text-center space-y-6 p-8">
                  <div className="w-24 h-24 rounded-[32px] bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-700">
                    <ImageIcon size={48} />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-black text-white uppercase tracking-tighter">Pilih Sumber Gambar</h4>
                    <p className="text-zinc-500 text-sm max-w-xs mx-auto">Ambil foto dokumen menggunakan kamera atau unggah file gambar yang sudah ada.</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      onClick={startCamera}
                      className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Camera size={18} /> Buka Kamera
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full sm:w-auto px-8 py-4 rounded-3xl bg-zinc-900 border border-zinc-800 text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center justify-center gap-2"
                    >
                      <Upload size={18} /> Unggah File
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleFileUpload}
                    />
                  </div>
                </div>
              )}

              {isCapturing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-10 flex items-center gap-6">
                    <button
                      onClick={stopCamera}
                      className="w-14 h-14 rounded-full bg-zinc-900/80 text-white flex items-center justify-center border border-zinc-800 hover:bg-zinc-800 transition-all"
                    >
                      <X size={24} />
                    </button>
                    <button
                      onClick={capturePhoto}
                      className="w-20 h-24 rounded-[32px] bg-white text-zinc-950 flex items-center justify-center shadow-2xl active:scale-95 transition-all"
                    >
                      <div className="w-12 h-12 rounded-full border-4 border-zinc-950" />
                    </button>
                    <button
                      onClick={startCamera} // Rotate camera logic could be added
                      className="w-14 h-14 rounded-full bg-zinc-900/80 text-white flex items-center justify-center border border-zinc-800 hover:bg-zinc-800 transition-all"
                    >
                      <RotateCcw size={24} />
                    </button>
                  </div>
                </div>
              )}

              {image && (
                <div className="absolute inset-0">
                  <Cropper
                    image={image}
                    crop={crop}
                    zoom={zoom}
                    aspect={4 / 3}
                    onCropChange={setCrop}
                    onCropComplete={onCropComplete}
                    onZoomChange={setZoom}
                  />
                </div>
              )}
            </div>

            {/* Footer / Controls */}
            {image && (
              <div className="p-6 bg-zinc-950 border-t border-zinc-800 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest shrink-0">Zoom</span>
                  <input
                    type="range"
                    value={zoom}
                    min={1}
                    max={3}
                    step={0.1}
                    aria-labelledby="Zoom"
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="flex-1 h-1 bg-zinc-800 rounded-full appearance-none accent-emerald-500 cursor-pointer"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setImage(null)}
                    className="flex-1 py-4 rounded-3xl bg-zinc-900 border border-zinc-800 text-zinc-400 font-black text-xs uppercase tracking-widest hover:text-white transition-all active:scale-95"
                  >
                    Ulangi Foto
                  </button>
                  <button
                    onClick={generateCroppedImage}
                    className="flex-[2] py-4 rounded-3xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Check size={18} /> Selesai & Simpan
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
