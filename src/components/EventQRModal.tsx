import React, { useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { 
  X, Download, Copy, Check, ExternalLink, Printer, QrCode, 
  Calendar, MapPin, ShieldCheck, Share2, Sparkles 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';

interface EventQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  agendaId: string;
  agendaTitle: string;
  agendaDate?: string;
  agendaLocation?: string;
}

export const EventQRModal: React.FC<EventQRModalProps> = ({
  isOpen,
  onClose,
  agendaId,
  agendaTitle,
  agendaDate,
  agendaLocation
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrContainerRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !agendaId) return null;

  const publicUrl = `${window.location.origin}/presensi/public/${agendaId}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    showToast('Tautan presensi publik berhasil disalin', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPNG = () => {
    try {
      const svg = qrContainerRef.current?.querySelector('svg');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      // Poster-sized canvas
      canvas.width = 600;
      canvas.height = 700;

      img.onload = () => {
        if (!ctx) return;
        // Background
        ctx.fillStyle = '#064e3b'; // dark emerald
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Header Card
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('PRESENSI DIGITAL IPNU CIREBON', 300, 50);

        ctx.font = '16px sans-serif';
        ctx.fillStyle = '#a7f3d0';
        ctx.fillText(agendaTitle.slice(0, 40), 300, 85);

        // White box for QR
        ctx.fillStyle = '#FFFFFF';
        ctx.roundRect(100, 120, 400, 400, 24);
        ctx.fill();

        // Draw QR Code
        ctx.drawImage(img, 130, 150, 340, 340);

        // Footer info
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 18px sans-serif';
        ctx.fillText('SCAN UNTUK MENGISI PRESENSI', 300, 570);

        ctx.font = '13px monospace';
        ctx.fillStyle = '#6ee7b7';
        ctx.fillText(publicUrl.slice(0, 50), 300, 605);

        ctx.font = '12px sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('Sistem Administrasi Digital Caruban Core', 300, 650);

        const a = document.createElement('a');
        a.download = `QR_Presensi_${agendaTitle.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Gambar QR Code Presensi berhasil diunduh', 'success');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download QR failed:', err);
      showToast('Gagal mengunduh QR Code', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[36px] w-full max-w-md overflow-hidden shadow-2xl space-y-4 my-8"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <QrCode size={20} />
              </div>
              <div>
                <h3 className="text-sm font-black text-[var(--text-main)] uppercase tracking-wider">
                  Kode QR Presensi Acara
                </h3>
                <p className="text-[11px] text-[var(--text-muted)] font-medium">
                  Scan untuk Check-In Peserta & Tamu
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* QR Display Content */}
          <div className="px-6 flex flex-col items-center text-center space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-black text-[var(--text-main)] line-clamp-2">
                {agendaTitle}
              </h2>
              {(agendaDate || agendaLocation) && (
                <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-[var(--text-muted)]">
                  {agendaDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={12} className="text-emerald-400" />
                      {agendaDate}
                    </span>
                  )}
                  {agendaLocation && (
                    <span className="flex items-center gap-1 truncate max-w-[200px]">
                      <MapPin size={12} className="text-emerald-400" />
                      {agendaLocation}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* QR Box */}
            <div 
              ref={qrContainerRef}
              className="p-5 bg-white rounded-3xl shadow-xl border-4 border-emerald-500/20"
            >
              <QRCode
                value={publicUrl}
                size={220}
                level="H"
                fgColor="#022c22"
              />
            </div>

            <div className="space-y-1.5 w-full">
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 truncate block max-w-full">
                {publicUrl}
              </span>
              <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
                Arahkan kamera smartphone ke QR Code ini untuk membuka formulir presensi mandiri.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t border-[var(--border-main)] grid grid-cols-3 gap-2.5">
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-[var(--text-main)] text-[10px] font-bold transition-all"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              <span>{copied ? 'Tersalin' : 'Salin Link'}</span>
            </button>

            <button
              onClick={handleDownloadPNG}
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-[var(--text-main)] text-[10px] font-bold transition-all"
            >
              <Download size={16} className="text-teal-400" />
              <span>Unduh Poster</span>
            </button>

            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-600/20 transition-all text-center"
            >
              <ExternalLink size={16} />
              <span>Buka Formulir</span>
            </a>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
