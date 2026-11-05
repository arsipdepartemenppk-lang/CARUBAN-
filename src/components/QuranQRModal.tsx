import React, { useState, useEffect, useRef } from 'react';
import { X, QrCode, Copy, Check, Download, Share2, Camera, Upload, AlertCircle, Sparkles } from 'lucide-react';
import QRCode from 'react-qr-code';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';

export interface QuranQRData {
  surahId: number;
  surahName: string;
  verseNumber?: number;
  textArabic?: string;
  translation?: string;
}

interface QuranQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: QuranQRData | null;
}

export const QuranQRModal: React.FC<QuranQRModalProps> = ({ isOpen, onClose, data }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement | null>(null);

  if (!isOpen || !data) return null;

  const origin = window.location.origin;
  const targetUrl = data.verseNumber
    ? `${origin}/alquran?surah=${data.surahId}&ayah=${data.verseNumber}`
    : `${origin}/alquran?surah=${data.surahId}`;

  const qrPayload = JSON.stringify({
    app: 'CarubanCore',
    type: 'quran',
    surah: data.surahId,
    ayah: data.verseNumber || 1,
    url: targetUrl
  });

  const handleCopyLink = () => {
    navigator.clipboard.writeText(targetUrl);
    setCopied(true);
    showToast('Tautan ayat berhasil disalin', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `QS. ${data.surahName}${data.verseNumber ? ` : ${data.verseNumber}` : ''}`,
          text: `Baca dan tadaburi QS. ${data.surahName}${data.verseNumber ? ` Ayat ${data.verseNumber}` : ''} di Al-Qur'an Digital Caruban Core.\n\n"${data.translation || ''}"`,
          url: targetUrl
        });
      } catch (err) {
        console.warn('Share error or cancelled', err);
      }
    } else {
      handleCopyLink();
    }
  };

  const handleDownloadQR = () => {
    try {
      const svg = qrRef.current?.querySelector('svg');
      if (!svg) return;

      const svgData = new XMLSerializer().serializeToString(svg);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 300;
      canvas.height = 300;

      img.onload = () => {
        if (!ctx) return;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20, 260, 260);

        const a = document.createElement('a');
        a.download = `QR_QS_${data.surahName.replace(/\s+/g, '_')}_Ayat_${data.verseNumber || 'Full'}.png`;
        a.href = canvas.toDataURL('image/png');
        a.click();
        showToast('Gambar QR Code berhasil diunduh', 'success');
      };

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    } catch (err) {
      console.error('Download QR failed:', err);
      showToast('Gagal mengunduh QR Code', 'error');
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <QrCode size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                  Kode QR Ayat Al-Qur'an
                </h3>
                <p className="text-[10px] text-[var(--text-muted)]">
                  QS. {data.surahName} {data.verseNumber ? `• Ayat ${data.verseNumber}` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* QR Display */}
          <div className="px-6 flex flex-col items-center text-center space-y-3">
            <div 
              ref={qrRef}
              className="p-4 bg-white rounded-3xl shadow-lg border-2 border-emerald-500/20"
            >
              <QRCode 
                value={targetUrl} 
                size={180} 
                level="M" 
                fgColor="#022c22"
              />
            </div>

            {data.textArabic && (
              <p className="text-lg font-arabic text-[var(--text-main)] line-clamp-2 leading-relaxed px-2" dir="rtl">
                {data.textArabic}
              </p>
            )}

            {data.translation && (
              <p className="text-[11px] text-[var(--text-muted)] italic line-clamp-2 leading-snug px-2">
                "{data.translation.replace(/<[^>]*>?/gm, '')}"
              </p>
            )}

            <div className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 truncate max-w-full">
              {targetUrl}
            </div>
          </div>

          {/* Actions */}
          <div className="p-5 border-t border-[var(--border-main)] grid grid-cols-3 gap-2">
            <button
              onClick={handleCopyLink}
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-[var(--text-main)] text-[10px] font-bold transition-all"
            >
              {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
              <span>{copied ? 'Tersalin' : 'Salin Tautan'}</span>
            </button>

            <button
              onClick={handleDownloadQR}
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-[var(--text-main)] text-[10px] font-bold transition-all"
            >
              <Download size={16} className="text-teal-400" />
              <span>Unduh QR</span>
            </button>

            <button
              onClick={handleShare}
              className="flex flex-col items-center justify-center gap-1.5 py-2.5 px-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-md shadow-emerald-600/20 transition-all"
            >
              <Share2 size={16} />
              <span>Bagikan</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

interface QuranQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (surahId: number, ayahNumber?: number) => void;
}

export const QuranQRScanner: React.FC<QuranQRScannerProps> = ({ isOpen, onClose, onScanResult }) => {
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const containerId = 'quran-qr-reader-viewport';

  useEffect(() => {
    if (isOpen) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const parseQRContent = (decodedText: string): { surahId: number; ayahNumber?: number } | null => {
    try {
      // 1. Coba JSON payload
      if (decodedText.startsWith('{') && decodedText.endsWith('}')) {
        const obj = JSON.parse(decodedText);
        if (obj.surah) {
          return {
            surahId: parseInt(obj.surah, 10),
            ayahNumber: obj.ayah ? parseInt(obj.ayah, 10) : undefined
          };
        }
      }

      // 2. Coba URL parameter format (?surah=X&ayah=Y)
      if (decodedText.includes('surah=')) {
        const url = new URL(decodedText.startsWith('http') ? decodedText : `https://caruban.core/${decodedText}`);
        const surah = url.searchParams.get('surah');
        const ayah = url.searchParams.get('ayah');
        if (surah) {
          return {
            surahId: parseInt(surah, 10),
            ayahNumber: ayah ? parseInt(ayah, 10) : undefined
          };
        }
      }

      // 3. Coba plain format: "QS:1:2" atau "QURAN:1:2" atau "1:2"
      const match = decodedText.match(/(?:QURAN|QS)?[:\s]*(\d+)[:\s]+(\d+)/i);
      if (match) {
        return {
          surahId: parseInt(match[1], 10),
          ayahNumber: parseInt(match[2], 10)
        };
      }
    } catch (e) {
      console.warn('QR parse failed:', e);
    }
    return null;
  };

  const handleScanSuccess = async (decodedText: string) => {
    const result = parseQRContent(decodedText);
    if (result && result.surahId >= 1 && result.surahId <= 114) {
      await stopScanner();
      onClose();
      onScanResult(result.surahId, result.ayahNumber);
      showToast(`Membuka Surah ${result.surahId}${result.ayahNumber ? ` Ayat ${result.ayahNumber}` : ''}`, 'success');
    } else {
      showToast('QR Code tidak berisi format Surah/Ayat Al-Qur\'an yang valid', 'error');
    }
  };

  const startScanner = async () => {
    setErrorMsg(null);
    setScanning(true);
    try {
      // Tunggu DOM mount
      setTimeout(async () => {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(containerId, {
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
              verbose: false
            });
          }
          await scannerRef.current.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 220, height: 220 }
            },
            (decodedText) => handleScanSuccess(decodedText),
            () => {}
          );
        } catch (err: any) {
          console.warn('Gagal memulai kamera scanner:', err);
          setErrorMsg('Kamera tidak dapat diakses atau diblokir browser. Anda dapat mengunggah file foto QR code di bawah.');
          setScanning(false);
        }
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyalakan kamera scanner');
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const tempScanner = new Html5Qrcode('quran-temp-scanner');
        const decodedText = await tempScanner.scanFile(file, true);
        tempScanner.clear();
        handleScanSuccess(decodedText);
      } catch (err) {
        showToast('Tidak dapat mendeteksi QR Code dari gambar yang dipilih', 'error');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[var(--border-main)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Camera size={16} />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                  Scan QR Ayat Al-Qur'an
                </h3>
                <p className="text-[10px] text-[var(--text-muted)]">
                  Arahkan kamera ke QR Code Surah/Ayat
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Scanner Viewport */}
          <div className="px-5 space-y-3">
            <div className="relative w-full h-64 bg-black rounded-2xl overflow-hidden border-2 border-emerald-500/40 flex items-center justify-center shadow-inner">
              <div id={containerId} className="w-full h-full" />
              <div id="quran-temp-scanner" className="hidden" />

              {/* Overlay Finder Box */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative animate-pulse">
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-emerald-400" />
                </div>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-2 text-[11px] text-amber-300">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>{errorMsg}</p>
              </div>
            )}
          </div>

          {/* File Upload Option */}
          <div className="p-5 border-t border-[var(--border-main)] space-y-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              onChange={handleFileUpload} 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-4 rounded-xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 transition-all"
            >
              <Upload size={14} className="text-emerald-400" />
              <span>Unggah Gambar QR Code dari Galeri</span>
            </button>
            <p className="text-[10px] text-center text-[var(--text-muted)]">
              Mendukung QR Code dari mushaf digital, kartu hafalan, dan tautan ayat.
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
