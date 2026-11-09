import React, { useState } from 'react';
import { 
  Download, X, Smartphone, CheckCircle2, Share2, PlusSquare, 
  ShieldCheck, Sparkles, ExternalLink, QrCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { cn } from '../lib/utils';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CARUBAN_LOGO_URL = 'https://res.cloudinary.com/dxsbefd16/image/upload/q_auto/f_auto/v1775730419/Logo_CARUBAN_CORE_dengan_motif_Mega_Mendung-removebg-preview_gszxaq.png';

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [activePlatform, setActivePlatform] = useState<'android' | 'ios' | 'desktop'>('android');
  const [installing, setInstalling] = useState(false);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    setInstalling(true);
    try {
      const res = await installApp();
      if (res) {
        onClose();
      }
    } finally {
      setInstalling(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[var(--bg-card)] border border-emerald-500/30 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header Banner */}
          <div className="relative p-6 bg-gradient-to-br from-emerald-950 via-zinc-900 to-black border-b border-[var(--border-main)] flex items-center justify-between overflow-hidden">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-4 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900/90 border border-emerald-500/40 p-1 flex items-center justify-center shadow-lg shadow-emerald-950/50">
                <img 
                  src={CARUBAN_LOGO_URL} 
                  alt="Caruban Core Mega Mendung" 
                  className="w-full h-full object-contain filter drop-shadow"
                />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    PWA / APK Resmi
                  </span>
                  <span className="text-[10px] text-zinc-400">v2.4.0</span>
                </div>
                <h3 className="text-lg font-black text-white tracking-tight mt-0.5">
                  Download Caruban Core
                </h3>
                <p className="text-xs text-zinc-400">
                  PC IPNU & IPPNU Kabupaten Cirebon
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all relative z-10"
            >
              <X size={18} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar text-xs">
            {/* Status Info */}
            {isInstalled ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300">
                <CheckCircle2 size={24} className="shrink-0 text-emerald-400" />
                <div>
                  <p className="font-bold text-sm">Aplikasi Sudah Terpasang!</p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5">
                    Caruban Core sudah berjalan dalam mode aplikasi mandiri di perangkat ini.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center sm:text-left">
                  <p className="font-bold text-white text-sm">Pasang Langsung ke Layar Utama</p>
                  <p className="text-zinc-400 text-[11px]">
                    Nikmati akses offline cepat, scan kamera instan, dan notifikasi kegiatan.
                  </p>
                </div>
                {isInstallable ? (
                  <button
                    onClick={handleDirectInstall}
                    disabled={installing}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Download size={15} />
                    {installing ? 'Memasang...' : 'Pasang Sekarang'}
                  </button>
                ) : (
                  <span className="text-[11px] text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20 font-bold shrink-0">
                    Siap Diunduh
                  </span>
                )}
              </div>
            )}

            {/* Platform Selector */}
            <div className="space-y-3">
              <label className="text-[11px] font-black uppercase tracking-wider text-zinc-400 block">
                Petunjuk Pemasangan Sesuai Perangkat:
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setActivePlatform('android')}
                  className={cn(
                    "py-2.5 px-3 rounded-2xl border font-bold text-xs transition-all flex flex-col items-center gap-1",
                    activePlatform === 'android'
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  <Smartphone size={16} />
                  <span>Android / APK</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePlatform('ios')}
                  className={cn(
                    "py-2.5 px-3 rounded-2xl border font-bold text-xs transition-all flex flex-col items-center gap-1",
                    activePlatform === 'ios'
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  <Smartphone size={16} />
                  <span>iPhone / iPad</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePlatform('desktop')}
                  className={cn(
                    "py-2.5 px-3 rounded-2xl border font-bold text-xs transition-all flex flex-col items-center gap-1",
                    activePlatform === 'desktop'
                      ? "bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-sm"
                      : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-white"
                  )}
                >
                  <Sparkles size={16} />
                  <span>Laptop / PC</span>
                </button>
              </div>
            </div>

            {/* Platform Instructions */}
            <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
              {activePlatform === 'android' && (
                <div className="space-y-2 text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                    <p>Buka tautan aplikasi ini di peramban <strong>Google Chrome</strong> pada HP Android Anda.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                    <p>Ketuk tombol <strong>"Pasang Sekarang"</strong> di atas, atau klik ikon titik tiga (⋮) di pojok kanan atas Chrome.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                    <p>Pilih menu <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Install Aplikasi"</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">4</span>
                    <p>Ikon <strong>Logo Caruban Core Mega Mendung</strong> akan muncul di beranda HP Anda layaknya aplikasi Play Store native.</p>
                  </div>
                </div>
              )}

              {activePlatform === 'ios' && (
                <div className="space-y-2 text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                    <p>Buka tautan ini di peramban <strong>Safari</strong> pada iPhone / iPad.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                    <p>Ketuk tombol <strong>Bagikan / Share</strong> (<Share2 size={12} className="inline text-emerald-400" />) di bilah bawah Safari.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                    <p>Gulir ke bawah dan pilih <strong>"Tambahkan ke Layar Utama"</strong> (<PlusSquare size={12} className="inline text-emerald-400" />).</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">4</span>
                    <p>Klik <strong>"Tambah"</strong> di kanan atas. Logo Mega Mendung Caruban Core kini siap diakses dari homescreen iOS.</p>
                  </div>
                </div>
              )}

              {activePlatform === 'desktop' && (
                <div className="space-y-2 text-zinc-300">
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">1</span>
                    <p>Gunakan Chrome atau Edge di Laptop/Komputer.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">2</span>
                    <p>Klik ikon <strong>Install Caruban Core</strong> (<Download size={12} className="inline text-emerald-400" />) di ujung kanan address bar.</p>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-[10px] shrink-0 mt-0.5">3</span>
                    <p>Aplikasi akan terbuka di jendela khusus tanpa gangguan URL bar.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Security & Features */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800 text-[11px] text-zinc-400">
              <div className="flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>Terverifikasi Enkripsi SSL</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Ukuran Ringan (&lt; 2 MB)</span>
              </div>
            </div>
          </div>

          {/* Footer Action */}
          <div className="p-4 bg-zinc-950/80 border-t border-[var(--border-main)] flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold text-xs transition-all"
            >
              Tutup
            </button>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Caruban Core Mobile',
                    text: 'Aplikasi Resmi PC IPNU IPPNU Kabupaten Cirebon',
                    url: window.location.origin
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.origin);
                  alert('Tautan aplikasi berhasil disalin!');
                }
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600/30 font-bold text-xs flex items-center gap-1.5 transition-all"
            >
              <Share2 size={13} /> Bagikan Tautan
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
