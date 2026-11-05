import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'react-qr-code';
import { X, Download, Copy, Check, ShieldCheck, QrCode as QrIcon } from 'lucide-react';

interface MemberQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: {
    namaLengkap: string;
    nomorIndukAnggota: string;
    namaSekolah?: string;
    statusPimpinan?: string;
    organisasi?: string;
    jenjangKaderisasi?: string;
    foto?: string;
  } | null;
}

export const MemberQRModal: React.FC<MemberQRModalProps> = ({ isOpen, onClose, member }) => {
  const [copied, setCopied] = React.useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !member) return null;

  const orgName = (member.organisasi || 'IPNU') === 'IPPNU' ? 'IPPNU' : 'IPNU';
  const qrValue = `${orgName}:${member.nomorIndukAnggota}:${member.namaLengkap}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(qrValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    // Create high-res card image (600x800)
    canvas.width = 600;
    canvas.height = 780;

    img.onload = () => {
      if (!ctx) return;
      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, 780);
      gradient.addColorStop(0, orgName === 'IPPNU' ? '#065f46' : '#064e3b'); // teal/emerald
      gradient.addColorStop(0.5, '#022c22');
      gradient.addColorStop(1, '#09090b');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 780);

      // Card border
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, 560, 740);

      // Title & Subtitle
      ctx.fillStyle = '#34d399'; // emerald-400
      ctx.font = 'bold 20px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('KTA DIGITAL PELAJAR NU', 300, 70);

      ctx.fillStyle = '#ffffff';
      ctx.font = '900 24px sans-serif';
      ctx.fillText(`PC ${orgName} KABUPATEN CIREBON`, 300, 105);

      // QR Code Container Box
      ctx.fillStyle = '#ffffff';
      ctx.roundRect ? ctx.roundRect(140, 140, 320, 320, 24) : ctx.fillRect(140, 140, 320, 320);
      ctx.fill();

      // Draw QR Code
      ctx.drawImage(img, 160, 160, 280, 280);

      // Member Info
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(member.namaLengkap, 300, 510);

      ctx.fillStyle = '#34d399';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`NIA: ${member.nomorIndukAnggota}`, 300, 545);

      if (member.namaSekolah) {
        ctx.fillStyle = '#d1d5db';
        ctx.font = '18px sans-serif';
        ctx.fillText(member.namaSekolah, 300, 580);
      }

      ctx.fillStyle = '#9ca3af';
      ctx.font = '14px sans-serif';
      ctx.fillText(`Tingkatan: ${member.statusPimpinan || 'Anggota'} • ${member.jenjangKaderisasi || 'Kader'}`, 300, 615);

      // Footer
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, 650);
      ctx.lineTo(540, 650);
      ctx.stroke();

      ctx.fillStyle = '#6ee7b7';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('SCAN KODE INI UNTUK PRESENSI KEGIATAN & PERTEMUAN', 300, 690);

      ctx.fillStyle = '#71717a';
      ctx.font = '12px sans-serif';
      ctx.fillText('Sistem Administrasi Digital Caruban Core', 300, 720);

      // Trigger download
      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      const safeName = member.namaLengkap.replace(/[^a-zA-Z0-9]/g, '_');
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_KTA_${safeName}_${member.nomorIndukAnggota}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-zinc-950 border border-zinc-800 rounded-[36px] w-full max-w-sm overflow-hidden shadow-2xl space-y-5 p-6 relative text-white"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <QrIcon size={18} />
              </div>
              <div>
                <h3 className="font-black text-sm text-white">QR Code KTA Digital</h3>
                <p className="text-[10px] text-zinc-400">Presensi & Verifikasi Keanggotaan</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Scannable High-Res QR Card */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div 
              ref={qrRef}
              className="bg-white p-4 rounded-3xl shadow-xl border-4 border-emerald-500/20"
            >
              <QRCode
                value={qrValue}
                size={200}
                level="H"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                  <ShieldCheck size={12} /> {orgName}
                </span>
                {member.jenjangKaderisasi && member.jenjangKaderisasi !== 'Belum Kaderisasi' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                    {member.jenjangKaderisasi}
                  </span>
                )}
              </div>
              <h4 className="text-base font-black text-white">{member.namaLengkap}</h4>
              <p className="font-mono text-xs font-bold text-emerald-400">{member.nomorIndukAnggota}</p>
              {member.namaSekolah && (
                <p className="text-xs text-zinc-400">{member.namaSekolah}</p>
              )}
            </div>

            <p className="text-[11px] text-zinc-400 bg-zinc-900/60 p-2.5 rounded-2xl border border-zinc-800/60 leading-relaxed">
              Tunjukkan QR Code ini ke panitia di scanner meja registrasi atau pindai langsung untuk absensi otomatis.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all active:scale-95"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              {copied ? 'Tersalin' : 'Salin Kode'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
            >
              <Download size={14} />
              Simpan Foto
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
