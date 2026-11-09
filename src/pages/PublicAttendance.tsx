import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, CheckCircle2, QrCode, MapPin, Calendar, Clock, ChevronLeft, 
  ShieldCheck, Navigation, Lock, AlertCircle, Camera, Upload, Sparkles, 
  X, Share2, Copy, Check, ExternalLink, Image as ImageIcon 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';
import { getDeviceCoordinates, validateAttendanceEligibility, formatDistance, AttendanceValidationResult } from '../utils/geoUtils';
import QRCode from 'react-qr-code';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

interface DetectedKTA {
  nia: string;
  name: string;
  origin?: string;
}

export default function PublicAttendance() {
  const { agendaId } = useParams<{ agendaId: string }>();
  const [agenda, setAgenda] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    phone: ''
  });

  // QR Code States
  const [detectedKTA, setDetectedKTA] = useState<DetectedKTA | null>(null);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [showPageQRModal, setShowPageQRModal] = useState(false);
  const [scannerMode, setScannerMode] = useState<'camera' | 'file'>('file');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  const refreshLocation = async () => {
    setIsLocating(true);
    setLocationError(null);
    try {
      const coords = await getDeviceCoordinates();
      setUserCoords({ lat: coords.lat, lng: coords.lng });
    } catch (err: any) {
      console.warn('GPS location notice:', err);
      setLocationError(err?.message || 'Gagal membaca sensor GPS');
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    refreshLocation();
  }, []);

  useEffect(() => {
    const fetchAgenda = async () => {
      if (!agendaId) return;
      try {
        const docSnap = await getDoc(doc(db, 'agendas', agendaId));
        if (docSnap.exists()) {
          setAgenda(docSnap.data());
        }
      } catch (err) {
        console.error('Error fetching agenda:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAgenda();
  }, [agendaId]);

  // Clean up camera scanner on unmount or modal close
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
        } catch {}
      }
    };
  }, []);

  const parseKTAData = (decodedText: string): DetectedKTA | null => {
    // Format 1: IPNU:NIA:NAMA
    if (decodedText.startsWith('IPNU:')) {
      const parts = decodedText.split(':');
      if (parts.length >= 3) {
        return {
          nia: parts[1].trim(),
          name: parts.slice(2).join(':').trim()
        };
      }
    }

    // Format 2: JSON { nia, name, sekolah }
    try {
      const parsed = JSON.parse(decodedText);
      if (parsed.nia && (parsed.name || parsed.namaLengkap)) {
        return {
          nia: parsed.nia,
          name: parsed.name || parsed.namaLengkap,
          origin: parsed.sekolah || parsed.namaSekolah
        };
      }
    } catch {}

    // Format 3: Raw standard NIA: 10.20.xx.xxxx.xxxx
    if (/^10\.20\.\w+\.\d+\.\d+$/i.test(decodedText.trim())) {
      return {
        nia: decodedText.trim(),
        name: formData.name || 'Kader IPNU'
      };
    }

    return null;
  };

  const handleApplyDecodedText = (decodedText: string) => {
    const parsed = parseKTAData(decodedText);
    if (parsed) {
      setDetectedKTA(parsed);
      setFormData(prev => ({
        ...prev,
        name: parsed.name || prev.name,
        origin: parsed.origin || prev.origin || 'Kader IPNU IPPNU'
      }));
      setScanError(null);
      stopCameraScanner();
      setShowScannerModal(false);
    } else {
      setScanError(`Format QR tidak dikenali sebagai KTA: "${decodedText.slice(0, 30)}..."`);
    }
  };

  const startCameraScanner = async () => {
    setScanError(null);
    setScannerMode('camera');
    try {
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode('public-kta-qr-reader', {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false
        });
      }

      const config = { fps: 15, qrbox: { width: 240, height: 240 } };
      let started = false;

      // 1. Try back camera (environment)
      try {
        await html5QrCodeRef.current.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => handleApplyDecodedText(decodedText),
          () => {}
        );
        started = true;
      } catch (e1) {
        console.warn('Fallback environment camera in public attendance:', e1);
      }

      // 2. Try front camera (user)
      if (!started) {
        try {
          await html5QrCodeRef.current.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleApplyDecodedText(decodedText),
            () => {}
          );
          started = true;
        } catch (e2) {
          console.warn('Fallback user camera in public attendance:', e2);
        }
      }

      // 3. Try enumerating device cameras
      if (!started) {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const selectedCam = cameras.find(c => 
            c.label.toLowerCase().includes('back') || 
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('belakang')
          ) || cameras[0];
          await html5QrCodeRef.current.start(
            selectedCam.id,
            config,
            (decodedText) => handleApplyDecodedText(decodedText),
            () => {}
          );
          started = true;
        }
      }

      if (!started) {
        throw new Error('Tidak dapat menemukan sensor kamera aktif.');
      }

      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera start error:', err);
      setScanError('Tidak dapat membuka kamera. Periksa izin kamera browser atau gunakan opsi Unggah Foto.');
      setIsCameraActive(false);
    }
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
      } catch {}
    }
    setIsCameraActive(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanError(null);
    try {
      const scanner = new Html5Qrcode('public-kta-file-dummy', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      });
      const decodedText = await scanner.scanFile(file, true);
      handleApplyDecodedText(decodedText);
    } catch (err) {
      setScanError('Gagal mendeteksi kode QR pada foto yang diunggah. Pastikan QR code terlihat jelas.');
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const validation: AttendanceValidationResult = agenda 
    ? validateAttendanceEligibility(agenda, userCoords) 
    : { 
        isAllowed: false, 
        timeStatus: 'during', 
        locationStatus: 'no_coords', 
        allowedRadiusMeters: 100, 
        targetVenueName: '',
        timeReason: 'Memuat data agenda...',
        locationReason: 'Mencari lokasi GPS...',
        distanceMeters: 0
      };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !agendaId) return;

    if (!validation.isAllowed) {
      if (validation.timeStatus !== 'during') {
        alert(`Presensi Ditolak: ${validation.timeReason}`);
      } else {
        alert(`Presensi Ditolak: ${validation.locationReason}`);
      }
      return;
    }

    setSubmitting(true);
    try {
      const record = {
        meetingId: agendaId,
        meetingTitle: agenda?.title || 'Agenda Publik',
        memberName: formData.name,
        memberNia: detectedKTA?.nia || 'GUEST',
        memberSekolah: formData.origin || (detectedKTA?.origin || 'Umum / Tamu'),
        memberPimpinan: detectedKTA ? 'Kader IPNU' : 'Tamu',
        isGuest: !detectedKTA,
        guestOrigin: formData.origin,
        status: 'Hadir',
        scannedAt: new Date().toISOString(),
        scannedBy: detectedKTA ? 'KTA Self-Scan (Web)' : 'Public Web Form',
        attendeeCoords: userCoords || undefined,
        distanceMeters: validation.distanceMeters
      };

      const docRef = await addDoc(collection(db, 'attendances'), record);
      setSuccessId(docRef.id);
    } catch (err) {
      console.error('Error submitting attendance:', err);
      alert('Gagal mengirim presensi. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!agenda) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-8 text-center">
        <Users size={48} className="text-zinc-700 mb-4" />
        <h1 className="text-xl font-black text-white">Agenda Tidak Ditemukan</h1>
        <p className="text-sm text-zinc-500 mt-2">Link presensi ini tidak valid atau sudah kedaluwarsa.</p>
        <Link to="/" className="mt-6 px-6 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs">Kembali</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-12 selection:bg-emerald-500/30">
      {/* Hidden container for image decoding */}
      <div id="public-kta-file-dummy" className="hidden" />

      <div className="max-w-xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck size={12} /> Sistem Presensi Terintegrasi
          </div>

          <button
            onClick={() => setShowPageQRModal(true)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-bold text-emerald-400 transition-all shadow-sm active:scale-95"
            title="Tampilkan QR Code untuk dipindai rekan di lokasi"
          >
            <QrCode size={13} />
            <span>QR Halaman Ini</span>
          </button>
        </div>

        <div className="text-center space-y-2">
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">Konfirmasi Kehadiran</h1>
          <p className="text-zinc-400 text-xs md:text-sm">Silakan isi formulir atau pindai KTA Digital untuk mencatat kehadiran Anda pada kegiatan ini.</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-[36px] p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="relative space-y-6">
            {/* Agenda Details */}
            <div className="p-5 rounded-3xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-base md:text-lg font-black text-emerald-400 leading-snug">{agenda.title}</h2>
                <button
                  type="button"
                  onClick={() => setShowPageQRModal(true)}
                  className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shrink-0"
                  title="Bagikan QR Link Acara"
                >
                  <QrCode size={16} />
                </button>
              </div>

              <div className="space-y-2 text-xs text-zinc-400 font-bold">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-zinc-600" />
                  <span>{new Date(agenda.date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-zinc-600" />
                  <span>{agenda.startTime || agenda.time} WIB</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={14} className="text-zinc-600" />
                  <span className="truncate">{agenda.location}</span>
                </div>
              </div>
            </div>

            {/* Validation & Geofencing Card */}
            <div className={cn(
              "p-4 rounded-3xl border transition-all text-xs space-y-3",
              validation.isAllowed
                ? "bg-emerald-950/20 border-emerald-500/30"
                : "bg-rose-950/20 border-rose-500/30"
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {validation.isAllowed ? (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <CheckCircle2 size={12} /> Lokasi & Waktu Terverifikasi
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                      <Lock size={12} /> Presensi Terkunci
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={refreshLocation}
                  disabled={isLocating}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-bold text-zinc-300 flex items-center gap-1.5"
                >
                  <Navigation size={12} className={cn("text-emerald-400", isLocating && "animate-spin")} />
                  {isLocating ? 'Cek GPS...' : 'Cek Posisi GPS'}
                </button>
              </div>

              <div className="space-y-1.5 text-zinc-300 text-[11px]">
                <div className="flex items-center justify-between">
                  <span>Waktu Kegiatan:</span>
                  <span className={validation.timeStatus === 'during' ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {validation.timeStatus === 'during' ? 'Sesi Dibuka' : (validation.timeReason || 'Di Luar Jam')}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Posisi Anda ke Acara:</span>
                  <span className={validation.locationStatus === 'inside' ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                    {userCoords
                      ? validation.locationStatus === 'inside'
                        ? `Dalam Radius (${formatDistance(validation.distanceMeters || 0)})`
                        : `Di Luar Radius (${formatDistance(validation.distanceMeters || 0)}, Max ${validation.allowedRadiusMeters}m)`
                      : 'GPS Belum Terdeteksi'}
                  </span>
                </div>
              </div>

              {!validation.isAllowed && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0 text-rose-400" />
                  <span>
                    Presensi hanya dapat dikirim saat Anda sudah berada di lokasi acara dan waktu kegiatan telah dimulai.
                  </span>
                </div>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!successId ? (
                <motion.form 
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit} 
                  className="space-y-4"
                >
                  {/* Quick KTA QR Scanner Trigger */}
                  <div className="p-4 rounded-3xl bg-zinc-950 border border-zinc-800/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400">
                          <QrCode size={16} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">Punya KTA Digital Pelajar NU?</p>
                          <p className="text-[10px] text-zinc-500">Pindai QR code KTA untuk isi otomatis data diri</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setShowScannerModal(true);
                          setScannerMode('file');
                        }}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5"
                      >
                        <Sparkles size={13} /> Pindai KTA
                      </button>
                    </div>

                    {detectedKTA && (
                      <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          <div>
                            <p className="font-bold text-white">{detectedKTA.name}</p>
                            <p className="text-[10px] font-mono text-emerald-300">NIA: {detectedKTA.nia}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDetectedKTA(null);
                            setFormData({ name: '', origin: '', phone: '' });
                          }}
                          className="text-[10px] text-zinc-400 hover:text-rose-400 transition-colors"
                        >
                          Hapus
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Masukkan nama lengkap Anda..."
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Asal Organisasi / Pimpinan / Sekolah</label>
                    <input
                      type="text"
                      required
                      value={formData.origin}
                      onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                      placeholder="Contoh: PAC Weru, PK SMA Nahdlatul Ulama, atau Umum"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 ml-1">Nomor WhatsApp (Opsional)</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="08xxxxxxxxxx"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || !validation.isAllowed}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 uppercase tracking-widest text-xs"
                  >
                    {submitting 
                      ? 'Memproses...' 
                      : !validation.isAllowed 
                        ? 'Presensi Terkunci (Lokasi / Waktu)' 
                        : 'Kirim Presensi Kehadiran'}
                  </button>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-10 text-center space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500 text-zinc-950 flex items-center justify-center mx-auto shadow-2xl shadow-emerald-500/20">
                    <CheckCircle2 size={40} />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Presensi Berhasil!</h3>
                    <p className="text-zinc-500 text-xs mt-1">Data kehadiran Anda telah tercatat resmi dalam sistem Caruban Core.</p>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Link
                      to={`/event-summary/${agendaId}/${successId}`}
                      className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-black text-xs uppercase tracking-widest transition-all"
                    >
                      Lihat Ringkasan Kegiatan
                    </Link>
                    <button 
                      onClick={() => {
                        setSuccessId(null);
                        setDetectedKTA(null);
                        setFormData({ name: '', origin: '', phone: '' });
                      }}
                      className="text-[10px] font-black uppercase tracking-widest text-zinc-600 hover:text-white transition-colors"
                    >
                      Isi untuk orang lain
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="text-center space-y-4">
          <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.3em]">
            Caruban Core &copy; PC IPNU IPPNU Kabupaten Cirebon
          </p>
        </div>
      </div>

      {/* MODAL 1: SCANNER KTA (Camera / Foto File) */}
      <AnimatePresence>
        {showScannerModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl w-full max-w-sm overflow-hidden p-6 space-y-5 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-sm">Pindai KTA Digital</h3>
                </div>
                <button
                  onClick={() => {
                    stopCameraScanner();
                    setShowScannerModal(false);
                  }}
                  className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              {scanError && (
                <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}

              {/* Mode switch */}
              <div className="flex gap-2 p-1 bg-zinc-900 rounded-2xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraScanner();
                    setScannerMode('file');
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                    scannerMode === 'file' ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Upload size={14} /> Unggah Foto QR
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScannerMode('camera');
                    startCameraScanner();
                  }}
                  className={cn(
                    "flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5",
                    scannerMode === 'camera' ? "bg-emerald-600 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Camera size={14} /> Scan via Kamera
                </button>
              </div>

              {scannerMode === 'file' ? (
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
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
                      <ImageIcon size={28} />
                    </div>
                    <p className="text-xs font-bold text-white">Klik untuk Pilih Gambar QR KTA</p>
                    <p className="text-[10px] text-zinc-500 mt-1">Pilih screenshot atau foto KTA dari galeri HP</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div 
                    id="public-kta-qr-reader" 
                    className="w-full rounded-2xl overflow-hidden bg-black border border-zinc-800 min-h-[250px]"
                  />
                  <p className="text-[11px] text-zinc-400 text-center">
                    Arahkan kamera ke QR Code KTA Anda
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: TAMPILKAN QR HALAMAN INI */}
      <AnimatePresence>
        {showPageQRModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-800 rounded-[36px] w-full max-w-sm overflow-hidden p-6 space-y-5 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <QrCode size={18} className="text-emerald-400" />
                  <h3 className="font-bold text-sm">QR Code Presensi Acara</h3>
                </div>
                <button
                  onClick={() => setShowPageQRModal(false)}
                  className="p-1 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="text-center space-y-3">
                <div className="bg-white p-4 rounded-3xl inline-block shadow-2xl border-4 border-emerald-500/20">
                  <QRCode
                    value={window.location.href}
                    size={200}
                    level="M"
                  />
                </div>

                <div>
                  <h4 className="text-sm font-bold text-white leading-tight">{agenda.title}</h4>
                  <p className="text-[10px] text-zinc-400 mt-1">Pindai kode ini untuk membuka form presensi langsung di HP rekan Anda.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-bold text-zinc-200 transition-all active:scale-95"
                >
                  {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copiedLink ? 'Tersalin' : 'Salin Link'}
                </button>

                <button
                  onClick={() => setShowPageQRModal(false)}
                  className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
                >
                  Selesai
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
