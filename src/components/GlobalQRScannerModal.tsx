import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  X, Camera, Upload, QrCode, Sparkles, AlertCircle, 
  ExternalLink, CheckCircle2, UserCheck, Calendar, BookOpen, 
  Copy, Check, FlipHorizontal, ArrowRight, ShieldCheck 
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { cn } from '../lib/utils';
import { useToast } from './Toast';

interface GlobalQRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedQRResult {
  raw: string;
  type: 'attendance' | 'member_kta' | 'quran' | 'internal_link' | 'external_link' | 'text';
  title: string;
  description: string;
  actionLabel?: string;
  actionPath?: string;
  externalUrl?: string;
  details?: Record<string, string>;
}

export const GlobalQRScannerModal: React.FC<GlobalQRScannerModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'camera' | 'file'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ParsedQRResult | null>(null);
  const [copied, setCopied] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const readerElementId = 'global-qr-camera-viewport';

  const playBeep = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {}
  };

  const parseQRContent = (decodedText: string): ParsedQRResult => {
    const text = decodedText.trim();

    // 1. Attendance / Presensi Public Link
    if (text.includes('/presensi/public/')) {
      const match = text.match(/\/presensi\/public\/([a-zA-Z0-9_-]+)/);
      const agendaId = match ? match[1] : '';
      return {
        raw: text,
        type: 'attendance',
        title: 'Presensi Kegiatan & Acara',
        description: 'Kode QR ini terhubung ke formulir absensi acara Caruban Core.',
        actionLabel: 'Buka Halaman Presensi',
        actionPath: `/presensi/public/${agendaId}`,
        details: { 'ID Sesi Agenda': agendaId }
      };
    }

    // 2. Member KTA (Kartu Tanda Anggota)
    if (text.startsWith('IPNU:')) {
      const parts = text.split(':');
      const nia = parts[1] || '-';
      const name = parts.slice(2).join(':') || 'Anggota IPNU';
      return {
        raw: text,
        type: 'member_kta',
        title: 'KTA Digital Pelajar NU',
        description: `Teridentifikasi atas nama ${name} (${nia}).`,
        actionLabel: 'Buka Rekap Data Anggota',
        actionPath: `/anggota?search=${encodeURIComponent(nia)}`,
        details: {
          'Nama Kader': name,
          'Nomor Induk Anggota': nia
        }
      };
    }

    // Check JSON formatted KTA or Object
    try {
      const json = JSON.parse(text);
      if (json.nia || json.nomorIndukAnggota) {
        const nia = json.nia || json.nomorIndukAnggota;
        const name = json.name || json.namaLengkap || 'Anggota';
        return {
          raw: text,
          type: 'member_kta',
          title: 'KTA Digital Terverifikasi',
          description: `Kader ${name} (${nia}).`,
          actionLabel: 'Lihat Data Anggota',
          actionPath: `/anggota?search=${encodeURIComponent(nia)}`,
          details: {
            'Nama Lengkap': name,
            'NIA': nia,
            'Sekolah/Komisariat': json.sekolah || json.namaSekolah || '-'
          }
        };
      }
      if (json.agendaId) {
        return {
          raw: text,
          type: 'attendance',
          title: 'Presensi Acara',
          description: json.title || 'Sesi presensi kegiatan.',
          actionLabel: 'Buka Presensi',
          actionPath: `/presensi/public/${json.agendaId}`
        };
      }
    } catch {}

    // 3. Al-Qur'an Link or Code
    if (text.includes('/alquran?surah=') || text.startsWith('QURAN:')) {
      let surah = '1';
      let ayah: string | undefined = undefined;
      if (text.startsWith('QURAN:')) {
        const parts = text.split(':');
        surah = parts[1] || '1';
        ayah = parts[2];
      } else {
        try {
          const url = new URL(text);
          surah = url.searchParams.get('surah') || '1';
          ayah = url.searchParams.get('ayah') || undefined;
        } catch {}
      }
      return {
        raw: text,
        type: 'quran',
        title: 'Ayat Al-Qur\'an Digital',
        description: `Tautan langsung ke Surah ke-${surah}${ayah ? ` Ayat ${ayah}` : ''}.`,
        actionLabel: 'Buka di Al-Qur\'an',
        actionPath: `/alquran?surah=${surah}${ayah ? `&ayah=${ayah}` : ''}`,
        details: {
          'Nomor Surah': surah,
          ...(ayah ? { 'Nomor Ayat': ayah } : {})
        }
      };
    }

    // 4. Internal Caruban Core App Links
    if (text.startsWith('/') || (text.includes(window.location.host) && !text.includes('/presensi/public/'))) {
      let path = text;
      try {
        if (text.startsWith('http')) {
          const urlObj = new URL(text);
          path = urlObj.pathname + urlObj.search;
        }
      } catch {}

      return {
        raw: text,
        type: 'internal_link',
        title: 'Akses Cepat Modul Caruban',
        description: `Membuka halaman sistem: ${path}`,
        actionLabel: 'Buka Menu Sekarang',
        actionPath: path
      };
    }

    // 5. External Web Link
    if (text.startsWith('http://') || text.startsWith('https://')) {
      return {
        raw: text,
        type: 'external_link',
        title: 'Tautan Web Eksternal',
        description: text,
        actionLabel: 'Kunjungi Tautan',
        externalUrl: text
      };
    }

    // 6. Plain Text / NIA Code
    if (/^10\.20\.\w+\.\d+\.\d+$/i.test(text)) {
      return {
        raw: text,
        type: 'member_kta',
        title: 'Nomor Induk Anggota (NIA)',
        description: `Format NIA resmi: ${text}`,
        actionLabel: 'Cari Anggota Ini',
        actionPath: `/anggota?search=${encodeURIComponent(text)}`,
        details: { 'Nomor Induk': text }
      };
    }

    return {
      raw: text,
      type: 'text',
      title: 'Teks Terbaca',
      description: text.length > 120 ? text.slice(0, 120) + '...' : text
    };
  };

  const handleDecoded = (decodedText: string) => {
    playBeep();
    stopCamera();
    const result = parseQRContent(decodedText);
    setScanResult(result);
  };

  const startCamera = async () => {
    setScanError(null);
    try {
      setTimeout(async () => {
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5Qrcode(readerElementId, {
              formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
              verbose: false
            });
          }

          await scannerRef.current.start(
            { facingMode },
            {
              fps: 15,
              qrbox: { width: 240, height: 240 }
            },
            (decodedText) => {
              handleDecoded(decodedText);
            },
            () => {}
          );
          setIsScanning(true);
        } catch (err: any) {
          console.warn('Camera error:', err);
          setScanError('Tidak dapat membuka kamera. Periksa izin browser atau gunakan opsi Unggah Foto.');
          setIsScanning(false);
        }
      }, 250);
    } catch (err: any) {
      setScanError(err?.message || 'Gagal memulai kamera.');
      setIsScanning(false);
    }
  };

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) {
        console.warn('Stop scanner exception:', e);
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    try {
      const dummyId = 'global-qr-file-dummy';
      let dummyEl = document.getElementById(dummyId);
      if (!dummyEl) {
        dummyEl = document.createElement('div');
        dummyEl.id = dummyId;
        dummyEl.style.display = 'none';
        document.body.appendChild(dummyEl);
      }

      const fileScanner = new Html5Qrcode(dummyId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });

      const decodedText = await fileScanner.scanFile(file, true);
      fileScanner.clear();
      handleDecoded(decodedText);
    } catch (err) {
      setScanError('Tidak ditemukan kode QR pada gambar yang diunggah. Pastikan gambar jelas dan tidak buram.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const handleFlipCamera = async () => {
    await stopCamera();
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const handleExecuteAction = () => {
    if (!scanResult) return;
    if (scanResult.actionPath) {
      onClose();
      navigate(scanResult.actionPath);
    } else if (scanResult.externalUrl) {
      window.open(scanResult.externalUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCopyRaw = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult.raw);
    setCopied(true);
    showToast('Teks QR berhasil disalin', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetScan = () => {
    setScanResult(null);
    setScanError(null);
    if (activeTab === 'camera') {
      startCamera();
    }
  };

  useEffect(() => {
    if (isOpen && !scanResult && activeTab === 'camera') {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, facingMode]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-zinc-950 border border-zinc-800 rounded-[36px] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh] text-white"
        >
          {/* Header */}
          <div className="p-5 border-b border-zinc-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <QrCode size={20} />
              </div>
              <div>
                <h3 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                  Pemindai QR Code Terpadu
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase">
                    Cepat
                  </span>
                </h3>
                <p className="text-[11px] text-zinc-400">Presensi pertemuan, KTA anggota, atau akses modul</p>
              </div>
            </div>

            <button
              onClick={() => {
                stopCamera();
                onClose();
              }}
              className="p-2 rounded-2xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Mode Switch Tabs (Only when not viewing scan result) */}
          {!scanResult && (
            <div className="px-5 pt-3">
              <div className="grid grid-cols-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('camera');
                  }}
                  className={cn(
                    "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5",
                    activeTab === 'camera' ? "bg-emerald-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Camera size={14} /> Kamera Langsung
                </button>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setActiveTab('file');
                  }}
                  className={cn(
                    "py-2 rounded-xl transition-all flex items-center justify-center gap-1.5",
                    activeTab === 'file' ? "bg-emerald-600 text-white shadow-md" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Upload size={14} /> Unggah Gambar
                </button>
              </div>
            </div>
          )}

          {/* Body Content */}
          <div className="p-5 overflow-y-auto space-y-4">
            {scanError && (
              <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-bold">Pemindaian Gagal</p>
                  <p className="text-[11px] text-rose-200/80 mt-0.5">{scanError}</p>
                </div>
              </div>
            )}

            {/* SCAN RESULT VIEW */}
            {scanResult ? (
              <div className="space-y-4 py-2">
                <div className="p-5 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-3">
                  <div className="flex items-center gap-2.5">
                    {scanResult.type === 'attendance' && (
                      <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                        <Calendar size={20} />
                      </div>
                    )}
                    {scanResult.type === 'member_kta' && (
                      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <UserCheck size={20} />
                      </div>
                    )}
                    {scanResult.type === 'quran' && (
                      <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        <BookOpen size={20} />
                      </div>
                    )}
                    {scanResult.type === 'internal_link' && (
                      <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                        <Sparkles size={20} />
                      </div>
                    )}
                    {scanResult.type === 'external_link' && (
                      <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <ExternalLink size={20} />
                      </div>
                    )}
                    {scanResult.type === 'text' && (
                      <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700">
                        <QrCode size={20} />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Hasil Pemindaian
                      </span>
                      <h4 className="font-black text-sm text-white truncate">{scanResult.title}</h4>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed bg-zinc-950/60 p-3 rounded-2xl border border-zinc-800/60 font-sans">
                    {scanResult.description}
                  </p>

                  {scanResult.details && (
                    <div className="space-y-1.5 pt-2 border-t border-zinc-800 text-xs">
                      {Object.entries(scanResult.details).map(([key, value]) => (
                        <div key={key} className="flex justify-between items-center text-[11px]">
                          <span className="text-zinc-500">{key}:</span>
                          <span className="font-bold text-white text-right truncate max-w-[200px]">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Action Button */}
                {scanResult.actionLabel && (
                  <button
                    onClick={handleExecuteAction}
                    className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 active:scale-98"
                  >
                    <span>{scanResult.actionLabel}</span>
                    <ArrowRight size={14} />
                  </button>
                )}

                {/* Secondary Actions */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    onClick={handleCopyRaw}
                    className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    {copied ? 'Tersalin' : 'Salin Teks'}
                  </button>

                  <button
                    onClick={handleResetScan}
                    className="py-3 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-emerald-400 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                  >
                    <Camera size={14} />
                    Pindai Lagi
                  </button>
                </div>
              </div>
            ) : activeTab === 'camera' ? (
              /* LIVE CAMERA SCANNER VIEW */
              <div className="space-y-3">
                <div className="relative rounded-3xl overflow-hidden bg-black border border-zinc-800 min-h-[260px] flex items-center justify-center">
                  <div id={readerElementId} className="w-full" />
                  
                  {/* Camera overlay guideline */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-56 h-56 border-2 border-emerald-500/60 rounded-3xl relative">
                      <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-emerald-400 rounded-tl-xl" />
                      <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-emerald-400 rounded-tr-xl" />
                      <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-emerald-400 rounded-bl-xl" />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-emerald-400 rounded-br-xl" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-zinc-400 px-2">
                  <span className="text-[11px]">Arahkan kamera ke QR Code</span>
                  <button
                    onClick={handleFlipCamera}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-[11px] font-bold transition-all"
                  >
                    <FlipHorizontal size={13} /> Ganti Kamera
                  </button>
                </div>
              </div>
            ) : (
              /* FILE / GALLERY UPLOAD VIEW */
              <div className="space-y-4 py-4 text-center">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-zinc-700 hover:border-emerald-500 rounded-3xl p-8 cursor-pointer transition-all bg-zinc-900/50 hover:bg-zinc-900 group"
                >
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                    <Upload size={30} />
                  </div>
                  <h4 className="text-sm font-bold text-white">Pilih Foto atau Screenshot QR</h4>
                  <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                    Pilih tangkapan layar KTA atau poster presensi kegiatan dari galeri ponsel Anda.
                  </p>
                  <span className="inline-block mt-4 px-4 py-2 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                    Jelajahi File
                  </span>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
