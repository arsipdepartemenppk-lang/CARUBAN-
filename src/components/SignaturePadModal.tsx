import React, { useRef, useState, useEffect } from 'react';
import { PenTool, RotateCcw, Check, X, Shield, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SignaturePadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  title?: string;
  signatoryName?: string;
  signatoryRole?: string;
}

export const SignaturePadModal: React.FC<SignaturePadModalProps> = ({
  isOpen,
  onClose,
  onSave,
  title = 'Bubuhi Tanda Tangan Digital',
  signatoryName = 'Pengurus Cabang',
  signatoryRole = 'Ketua / Sekretaris'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#064e3b'); // Emerald-900 / Dark Green NU
  const [lineWidth, setLineWidth] = useState(3);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = lineWidth;
        }
      }, 100);
      setHasDrawn(false);
    }
  }, [isOpen, strokeColor, lineWidth]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-4 bg-[var(--bg-app)] border-b border-[var(--border-main)] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400">
                <PenTool size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-[var(--text-main)]">{title}</h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {signatoryName} ({signatoryRole})
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
            >
              <X size={16} />
            </button>
          </div>

          {/* Canvas Box */}
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Shield size={13} className="text-emerald-400" />
                Goreskan tanda tangan di area putih berikut
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStrokeColor('#064e3b')}
                  className={`w-5 h-5 rounded-full border ${strokeColor === '#064e3b' ? 'ring-2 ring-emerald-500' : ''}`}
                  style={{ backgroundColor: '#064e3b' }}
                  title="Tinta Hijau NU"
                />
                <button
                  type="button"
                  onClick={() => setStrokeColor('#0f172a')}
                  className={`w-5 h-5 rounded-full border ${strokeColor === '#0f172a' ? 'ring-2 ring-emerald-500' : ''}`}
                  style={{ backgroundColor: '#0f172a' }}
                  title="Tinta Hitam"
                />
                <button
                  type="button"
                  onClick={() => setStrokeColor('#1d4ed8')}
                  className={`w-5 h-5 rounded-full border ${strokeColor === '#1d4ed8' ? 'ring-2 ring-emerald-500' : ''}`}
                  style={{ backgroundColor: '#1d4ed8' }}
                  title="Tinta Biru"
                />
              </div>
            </div>

            <div className="relative w-full h-56 bg-white rounded-2xl border-2 border-dashed border-emerald-500/40 overflow-hidden shadow-inner cursor-crosshair">
              <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
                className="w-full h-full block touch-none"
              />

              {!hasDrawn && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-gray-400 gap-1.5 opacity-60">
                  <PenTool size={28} />
                  <span className="text-xs font-serif italic">Tanda tangan di sini</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={clearCanvas}
                className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold flex items-center gap-1.5 transition-all"
              >
                <RotateCcw size={13} /> Bersihkan
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 text-xs font-bold transition-all"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!hasDrawn}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black flex items-center gap-1.5 shadow-lg shadow-emerald-950 transition-all active:scale-95"
                >
                  <Check size={14} /> Pasang Tanda Tangan
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
