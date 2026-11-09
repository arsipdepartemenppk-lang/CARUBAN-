import React, { useState, useRef, useEffect } from 'react';
import { 
  UserPlus, Upload, X, Camera, RefreshCw, Sparkles, CheckCircle2, 
  AlertCircle, Trash2, ShieldCheck, UserCheck, Eye, EyeOff, GraduationCap, Building2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { cn } from '../lib/utils';
import { useToast } from './Toast';
import { 
  generateAutomaticNIA, 
  TINGKAT_CODES, 
  TINGKAT_LABELS, 
  parseNIADescription, 
  isNIAUnique 
} from '../utils/niaGenerator';
import { processAndUploadMemberPhoto } from '../utils/memberPhotoUtils';

interface MemberFormProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  resetForm: () => void;
  uploading?: boolean;
  handleFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isDark?: boolean;
  existingNias?: string[];
  membersList?: Array<{ id: string; nomorIndukAnggota: string }>;
  editingId?: string | null;
}

export const MemberForm: React.FC<MemberFormProps> = ({ 
  formData, 
  setFormData, 
  onSubmit, 
  onCancel, 
  resetForm, 
  uploading: externalUploading = false,
  existingNias = [],
  membersList = [],
  editingId = null
}) => {
  const { showToast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPhotoProcessing, setIsPhotoProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [autoNiaGenerated, setAutoNiaGenerated] = useState(false);
  const [availablePKs, setAvailablePKs] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'pks'), orderBy('namaPK', 'asc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAvailablePKs(data);
    }, (err) => {
      console.warn('Notice loading PKs for member form:', err);
    });
    return () => unsub();
  }, []);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Jika form dibuka dan NIA masih kosong, buat otomatis secara instan
  useEffect(() => {
    if (!formData.nomorIndukAnggota && !editingId) {
      handleGenerateNIA();
    }
  }, []);

  // Matikan stream kamera saat unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [cameraStream]);

  const handleGenerateNIA = (targetStatus?: string) => {
    const status = (targetStatus || formData.statusPimpinan || 'PK') as 'PC' | 'PAC' | 'PK' | 'PR' | 'Anggota';
    const newNia = generateAutomaticNIA({
      statusPimpinan: status,
      existingNias
    });
    setFormData((prev: any) => ({
      ...prev,
      nomorIndukAnggota: newNia
    }));
    setAutoNiaGenerated(true);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.nomorIndukAnggota;
      return next;
    });
  };

  const handleStatusChange = (newStatus: string) => {
    setFormData((prev: any) => {
      const updated = { ...prev, statusPimpinan: newStatus };
      // Jika NIA belum pernah diedit manual, sesuaikan kode tingkat otomatis
      if (!editingId && (!prev.nomorIndukAnggota || autoNiaGenerated)) {
        updated.nomorIndukAnggota = generateAutomaticNIA({
          statusPimpinan: newStatus as any,
          existingNias
        });
      }
      return updated;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setIsPhotoProcessing(true);
      try {
        const result = await processAndUploadMemberPhoto(file, formData.namaLengkap || 'kader');
        setFormData((prev: any) => ({
          ...prev,
          foto: result.url,
          fotoUrl: result.url
        }));
        showToast('Foto profil anggota berhasil dimuat', 'success');
      } catch (err: any) {
        console.error('Error memproses foto:', err);
        showToast('Gagal memproses foto: ' + (err.message || 'Format tidak didukung'), 'error');
      } finally {
        setIsPhotoProcessing(false);
      }
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev: any) => ({
      ...prev,
      foto: '',
      fotoUrl: ''
    }));
    if (fileInputRef.current) fileInputRef.current.value = '';
    showToast('Foto profil dihapus', 'info');
  };

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Ref callback to reliably attach stream as soon as video DOM node mounts in React
  const handleVideoRef = (node: HTMLVideoElement | null) => {
    videoRef.current = node;
    if (node && cameraStream) {
      if (node.srcObject !== cameraStream) {
        node.srcObject = cameraStream;
        node.play().catch(err => console.warn('Video play error on ref attach:', err));
      }
    }
  };

  // Ensure stream stays attached if stream changes while mounted
  useEffect(() => {
    if (videoRef.current && cameraStream) {
      if (videoRef.current.srcObject !== cameraStream) {
        videoRef.current.srcObject = cameraStream;
        videoRef.current.play().catch(err => console.warn('Video play error on stream update:', err));
      }
    }
  }, [cameraStream, isCameraActive]);

  // Handle unmount - stop all tracks
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Native camera ref for mobile devices
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);

  // Helper to call getUserMedia with a timeout to allow user time to click Allow on browser permission prompt
  const getUserMediaWithTimeout = (constraints: MediaStreamConstraints, timeoutMs = 10000): Promise<MediaStream> => {
    return new Promise((resolve, reject) => {
      let isSettled = false;
      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          const err = new Error('Timeout starting video source');
          err.name = 'TimeoutError';
          reject(err);
        }
      }, timeoutMs);

      navigator.mediaDevices.getUserMedia(constraints)
        .then(stream => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            resolve(stream);
          } else {
            stream.getTracks().forEach(t => t.stop());
          }
        })
        .catch(err => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timer);
            reject(err);
          }
        });
    });
  };

  // Live Camera Handlers
  const startCamera = async (targetFacing: 'user' | 'environment' = facingMode) => {
    // 1. Reset states
    setIsStartingCamera(true);

    // 2. Stop existing stream if any
    if (cameraStream) {
      cameraStream.getTracks().forEach(t => t.stop());
      setCameraStream(null);
    }

    if (!navigator?.mediaDevices?.getUserMedia) {
      showToast('Kamera live tidak didukung di browser ini. Membuka kamera bawaan...', 'info');
      setIsStartingCamera(false);
      nativeCameraInputRef.current?.click();
      return;
    }

    // Try multiple constraints from specific to general for better compatibility
    const constraintOptions = [
      { video: { facingMode: targetFacing }, audio: false },
      { video: true, audio: false }
    ];

    let success = false;
    let lastError: any = null;

    for (const constraints of constraintOptions) {
      try {
        console.log('Attempting camera with constraints:', constraints);
        // Give 10s so user can click "Allow" / "Izinkan" on browser permission popup
        const stream = await getUserMediaWithTimeout(constraints, 10000);
        
        setFacingMode(targetFacing);
        setCameraStream(stream);
        setIsCameraActive(true);
        setIsStartingCamera(false);
        success = true;
        console.log('Camera started successfully');
        break;
      } catch (err: any) {
        lastError = err;
        console.warn('Camera constraint attempt failed:', constraints, err);
      }
    }

    if (!success) {
      console.warn('Camera stream acquisition unavailable:', lastError?.message || lastError);
      setIsStartingCamera(false);
      setIsCameraActive(false);

      if (lastError?.name === 'NotAllowedError') {
        showToast('Izin kamera belum diberikan. Membuka pemilih foto/kamera HP...', 'info');
        setTimeout(() => {
          nativeCameraInputRef.current?.click();
        }, 300);
      } else {
        showToast('Kamera live tidak merespons. Membuka pemilih foto/kamera HP...', 'info');
        setTimeout(() => {
          nativeCameraInputRef.current?.click();
        }, 300);
      }
    }
  };

  const toggleFacingMode = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
    setIsStartingCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !cameraStream) return;
    
    setIsPhotoProcessing(true);
    try {
      const video = videoRef.current;
      
      // Ensure we have valid video dimensions
      const width = video.videoWidth || 640;
      const height = video.videoHeight || 480;
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d', { alpha: false });
      if (!ctx) throw new Error('Could not initialize canvas context');

      // Handle mirroring
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }
      
      ctx.drawImage(video, 0, 0, width, height);
      
      // Convert to blob for processing
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
      if (!blob) throw new Error('Failed to create image blob');

      const result = await processAndUploadMemberPhoto(blob, formData.namaLengkap || 'kader');
      
      setFormData((prev: any) => ({
        ...prev,
        foto: result.url,
        fotoUrl: result.url
      }));
      
      showToast('Foto profil anggota berhasil diambil', 'success');
      stopCamera();
    } catch (err: any) {
      console.error('Photo capture error:', err);
      showToast('Gagal menangkap foto: ' + (err.message || 'Error internal'), 'error');
    } finally {
      setIsPhotoProcessing(false);
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.namaLengkap?.trim()) newErrors.namaLengkap = 'Nama Lengkap wajib diisi';
    
    const cleanNia = formData.nomorIndukAnggota?.trim() || '';
    if (!cleanNia) {
      newErrors.nomorIndukAnggota = 'NIA wajib diisi atau digenerate otomatis';
    } else if (!/^[0-9.]+$/.test(cleanNia)) {
      newErrors.nomorIndukAnggota = 'NIA hanya boleh berisi angka dan tanda titik';
    } else if (cleanNia.length < 8) {
      newErrors.nomorIndukAnggota = 'NIA terlalu pendek (minimal 8 karakter)';
    } else if (!isNIAUnique(cleanNia, existingNias, editingId || undefined, membersList)) {
      newErrors.nomorIndukAnggota = 'NIA ini sudah digunakan oleh anggota lain';
    }
    
    if (!formData.noHp?.trim()) {
      newErrors.noHp = 'Nomor HP/WhatsApp wajib diisi';
    } else if (!/^(08|\+62)[0-9]{8,14}$/.test(formData.noHp.replace(/[- ]/g, ''))) {
      newErrors.noHp = 'Nomor HP tidak valid (harus diawali 08 atau +62, 10-15 digit)';
    }

    if (formData.email?.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Format email tidak valid';
      }
    }

    if (!formData.namaSekolah?.trim()) newErrors.namaSekolah = 'Nama Sekolah / Madrasah / Pesantren wajib diisi';
    if (!formData.alamatLengkap?.trim()) newErrors.alamatLengkap = 'Alamat Domisili wajib diisi';
    if (!formData.statusPimpinan) newErrors.statusPimpinan = 'Status Pimpinan wajib dipilih';
    if (!formData.kelasTingkat?.trim()) newErrors.kelasTingkat = 'Kelas/Tingkat wajib diisi (contoh: X / XI / XII / Semester 1)';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(e);
    } else {
      showToast('Mohon lengkapi kolom yang bertanda merah', 'error');
    }
  };

  const handleCancel = () => {
    stopCamera();
    resetForm();
    onCancel();
  };

  const currentFoto = formData.foto || formData.fotoUrl;
  const niaParsed = parseNIADescription(formData.nomorIndukAnggota);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 text-[var(--text-main)]">
      {/* ============================================================== */}
      {/* 1. SEKSI FOTO PROFIL ANGGOTA */}
      {/* ============================================================== */}
      <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-main)] pb-3">
          <div className="flex items-center gap-2">
            <Camera size={18} className="text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
              Foto Profil Anggota
            </h3>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] font-medium">
            Format JPG/PNG • Otomatis dikompresi untuk KTA
          </span>
        </div>

        {/* Live Camera Viewfinder Modal / Inline */}
        {(isCameraActive || isStartingCamera) ? (
          <div className="flex flex-col items-center justify-center p-4 bg-black/50 rounded-2xl border border-emerald-500/40 gap-4 shadow-xl">
            <div className="relative w-64 h-64 rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black flex items-center justify-center">
              {isStartingCamera ? (
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="animate-spin text-emerald-500" size={32} />
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-tighter">Memulai Sensor...</span>
                </div>
              ) : (
                <>
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                    className="w-full h-full object-cover"
                  />
                  {/* Face Guide Oval */}
                  <div className="absolute inset-6 border-2 border-dashed border-emerald-400/60 rounded-full pointer-events-none opacity-70 animate-pulse" />
                  <div className="absolute top-2 left-2 bg-emerald-600/90 text-white text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> Live Kamera ({facingMode === 'user' ? 'Depan' : 'Belakang'})
                  </div>

                  <button
                    type="button"
                    onClick={toggleFacingMode}
                    title="Ganti Kamera Depan / Belakang"
                    className="absolute top-2 right-2 p-1.5 rounded-xl bg-black/70 hover:bg-black text-white text-xs border border-white/20 transition-all shadow"
                  >
                    <RefreshCw size={14} />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={capturePhoto}
                disabled={isStartingCamera || !isCameraActive || isPhotoProcessing}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 active:scale-95 transition-all disabled:opacity-50"
              >
                {isPhotoProcessing ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Camera size={15} />
                    Ambil Gambar
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-all"
              >
                Tutup Kamera
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Foto Thumbnail Container */}
            <div className="relative group shrink-0">
              <div className="w-24 h-28 sm:w-28 sm:h-32 rounded-2xl bg-[var(--bg-card)] border-2 border-dashed border-[var(--border-main)] flex items-center justify-center overflow-hidden shadow-sm group-hover:border-emerald-500/50 transition-all">
                {currentFoto ? (
                  <img 
                    src={currentFoto} 
                    alt="Foto Anggota" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2 text-[var(--text-muted)]">
                    <UserPlus size={32} className="opacity-30 mb-1" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Tanpa Foto</span>
                  </div>
                )}
              </div>

              {currentFoto && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  title="Hapus foto"
                  className="absolute -top-2 -right-2 p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-md transition-all"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>

            {/* Tombol Aksi Upload & Kamera */}
            <div className="flex-1 space-y-2.5 w-full">
              <div className="flex flex-wrap items-center gap-2">
                {/* File picker for gallery/PC */}
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept="image/*" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />

                {/* Native camera file picker for mobile direct camera capture */}
                <input 
                  type="file" 
                  ref={nativeCameraInputRef} 
                  accept="image/*" 
                  capture="user" 
                  onChange={handlePhotoUpload} 
                  className="hidden" 
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPhotoProcessing || externalUploading}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all disabled:opacity-50"
                >
                  <Upload size={14} />
                  <span>{isPhotoProcessing ? 'Mengompres...' : 'Pilih Foto Galeri'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => startCamera()}
                  disabled={isPhotoProcessing || externalUploading}
                  className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  <Camera size={14} />
                  <span>Ambil via Kamera</span>
                </button>
              </div>

              <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                Foto profil akan digunakan pada <strong>Kartu Tanda Anggota (KTA) Digital</strong>, lembar verifikasi presensi acara, dan buku induk kaderisasi.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* 2. NOMOR INDUK ANGGOTA (NIA) DENGAN GENERATOR OTOMATIS */}
      {/* ============================================================== */}
      <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] rounded-2xl p-5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-main)] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-emerald-500" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
              Nomor Induk Anggota (NIA)
            </h3>
          </div>

          <button
            type="button"
            onClick={() => handleGenerateNIA()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all w-fit"
          >
            <RefreshCw size={12} className={cn(autoNiaGenerated && "rotate-180 transition-transform")} />
            <span>Generate NIA Otomatis</span>
          </button>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <input
              id="nomorIndukAnggota"
              type="text"
              value={formData.nomorIndukAnggota || ''}
              onChange={(e) => {
                setFormData({ ...formData, nomorIndukAnggota: e.target.value });
                setAutoNiaGenerated(false);
              }}
              placeholder="Contoh: 10.20.03.26.0042"
              className={cn(
                "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-3 text-sm font-mono font-bold tracking-wider text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all",
                errors.nomorIndukAnggota ? "border-rose-500" : "border-[var(--border-main)]"
              )}
            />
            {autoNiaGenerated && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                <Sparkles size={11} /> Auto-Generated
              </span>
            )}
          </div>

          {errors.nomorIndukAnggota && (
            <p className="text-[11px] text-rose-500 flex items-center gap-1 font-medium">
              <AlertCircle size={12} /> {errors.nomorIndukAnggota}
            </p>
          )}

          {/* Breakdown / Pembacaan Struktur NIA */}
          {niaParsed.valid && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[10px]">
              <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)]">
                <span className="text-[var(--text-muted)] block">Wilayah / PW:</span>
                <span className="font-bold text-emerald-400">Jawa Barat (10)</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)]">
                <span className="text-[var(--text-muted)] block">Cabang / PC:</span>
                <span className="font-bold text-emerald-400">Kab. Cirebon (20)</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)]">
                <span className="text-[var(--text-muted)] block">Tingkatan:</span>
                <span className="font-bold text-emerald-400">{niaParsed.tingkat}</span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-main)]">
                <span className="text-[var(--text-muted)] block">Tahun / Urutan:</span>
                <span className="font-bold text-emerald-400">{niaParsed.tahun} • {niaParsed.urutan}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3. BIODATA KADER & ANGGOTA */}
      {/* ============================================================== */}
      <div className="space-y-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-muted)] border-b border-[var(--border-main)] pb-2 flex items-center gap-2">
          <UserCheck size={16} className="text-emerald-500" />
          Biodata Lengkap & Pilihan Organisasi
        </h3>

        {/* Pilihan Organisasi IPNU / IPPNU */}
        <div className="bg-[var(--bg-app)]/80 p-3.5 rounded-2xl border border-[var(--border-main)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-wider text-[var(--text-main)] block">
              Pilihan Organisasi <span className="text-rose-500">*</span>
            </label>
            <span className="text-[10px] text-[var(--text-muted)]">
              Tentukan organisasi kader (Pelajar Putra / Putri Kab. Cirebon)
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, organisasi: 'IPNU' })}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5",
                (formData.organisasi || 'IPNU') === 'IPNU'
                  ? "bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]"
              )}
            >
              <span>IPNU (Rekan)</span>
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, organisasi: 'IPPNU' })}
              className={cn(
                "flex-1 sm:flex-initial px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all flex items-center justify-center gap-1.5",
                formData.organisasi === 'IPPNU'
                  ? "bg-teal-600 text-white border-teal-500 shadow-md shadow-teal-600/30"
                  : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-main)] hover:text-[var(--text-main)]"
              )}
            >
              <span>IPPNU (Rekanita)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Nama Lengkap */}
          <div className="space-y-1.5">
            <label htmlFor="namaLengkap" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              id="namaLengkap"
              type="text"
              value={formData.namaLengkap || ''}
              onChange={(e) => setFormData({ ...formData, namaLengkap: e.target.value })}
              placeholder="Nama lengkap sesuai KTP/Ijazah"
              className={cn(
                "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                errors.namaLengkap ? "border-rose-500" : "border-[var(--border-main)]"
              )}
            />
            {errors.namaLengkap && <p className="text-[10px] text-rose-500">{errors.namaLengkap}</p>}
          </div>

          {/* Status Pimpinan */}
          <div className="space-y-1.5">
            <label htmlFor="statusPimpinan" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Status Pimpinan / Tingkatan <span className="text-rose-500">*</span>
            </label>
            <select
              id="statusPimpinan"
              value={formData.statusPimpinan || 'PK'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="PK">Pimpinan Komisariat (PK) - Sekolah/Madrasah/Pesantren</option>
              <option value="PAC">Pimpinan Anak Cabang (PAC) - Tingkat Kecamatan</option>
              <option value="PR">Pimpinan Ranting (PR) - Tingkat Desa/Kelurahan</option>
              <option value="PC">Pimpinan Cabang (PC) - Tingkat Kabupaten</option>
              <option value="Anggota">Anggota Biasa</option>
            </select>
          </div>

          {/* No. HP / WhatsApp */}
          <div className="space-y-1.5">
            <label htmlFor="noHp" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              No. WhatsApp / HP <span className="text-rose-500">*</span>
            </label>
            <input
              id="noHp"
              type="text"
              value={formData.noHp || ''}
              onChange={(e) => setFormData({ ...formData, noHp: e.target.value })}
              placeholder="08xxxxxxxxxx"
              className={cn(
                "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                errors.noHp ? "border-rose-500" : "border-[var(--border-main)]"
              )}
            />
            {errors.noHp && <p className="text-[10px] text-rose-500">{errors.noHp}</p>}
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Alamat Email (Opsional)
            </label>
            <input
              id="email"
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@pelajarnu.id"
              className={cn(
                "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                errors.email ? "border-rose-500" : "border-[var(--border-main)]"
              )}
            />
            {errors.email && <p className="text-[10px] text-rose-500">{errors.email}</p>}
          </div>

          {/* Nama Sekolah / Madrasah / Pesantren (Sinkron dengan Master PK) */}
          <div className="space-y-1.5 sm:col-span-2">
            <div className="flex items-center justify-between">
              <label htmlFor="namaSekolah" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} className="text-emerald-500" />
                Sekolah / Madrasah / Pesantren (Basis PK) <span className="text-rose-500">*</span>
              </label>
              {availablePKs.length > 0 && (
                <span className="text-[10px] text-teal-400 font-bold bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-500/20">
                  {availablePKs.length} Master PK Terdaftar
                </span>
              )}
            </div>
            
            <div className="space-y-2">
              <input
                id="namaSekolah"
                list="master-pks-list"
                type="text"
                value={formData.namaSekolah || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = availablePKs.find(p => (p.namaPK || '').toLowerCase() === val.toLowerCase());
                  if (matched) {
                    setFormData((prev: any) => ({
                      ...prev,
                      namaSekolah: matched.namaPK,
                      alamatSekolah: matched.alamat || prev.alamatSekolah,
                      kecamatan: matched.kecamatan || prev.kecamatan,
                      zona: matched.zona || prev.zona,
                      pkId: matched.id
                    }));
                  } else {
                    setFormData((prev: any) => ({ ...prev, namaSekolah: val }));
                  }
                }}
                placeholder="Ketik atau pilih nama Pimpinan Komisariat (contoh: MA NU Cirebon)..."
                className={cn(
                  "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                  errors.namaSekolah ? "border-rose-500" : "border-[var(--border-main)]"
                )}
              />
              <datalist id="master-pks-list">
                {availablePKs.map((pk) => (
                  <option key={pk.id} value={pk.namaPK}>
                    {pk.kecamatan ? `Kec. ${pk.kecamatan} (${pk.zona || ''})` : pk.zona}
                  </option>
                ))}
              </datalist>

              {/* Quick Recommendation Pill Buttons */}
              {availablePKs.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[10px] custom-scrollbar">
                  <span className="text-zinc-500 shrink-0 font-bold text-[9px] uppercase tracking-wider">Pilih Cepat:</span>
                  {availablePKs.slice(0, 5).map((pk) => (
                    <button
                      key={pk.id}
                      type="button"
                      onClick={() => {
                        setFormData((prev: any) => ({
                          ...prev,
                          namaSekolah: pk.namaPK,
                          alamatSekolah: pk.alamat || prev.alamatSekolah,
                          kecamatan: pk.kecamatan || prev.kecamatan,
                          zona: pk.zona || prev.zona,
                          pkId: pk.id
                        }));
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg border text-nowrap shrink-0 transition-all text-[11px]",
                        formData.namaSekolah === pk.namaPK
                          ? "bg-emerald-600 text-white border-emerald-500 font-bold shadow-sm"
                          : "bg-[var(--bg-card)] text-[var(--text-muted)] border-[var(--border-main)] hover:border-zinc-500"
                      )}
                    >
                      {pk.namaPK}
                    </button>
                  ))}
                </div>
              )}

              {/* Verified Synchronization Badge */}
              {formData.pkId && (
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 w-fit">
                  <CheckCircle2 size={12} />
                  <span>Tersinkronisasi otomatis dengan Data Master PK ({availablePKs.find(p => p.id === formData.pkId)?.zona || 'Kab. Cirebon'})</span>
                </div>
              )}
            </div>
            {errors.namaSekolah && <p className="text-[10px] text-rose-500">{errors.namaSekolah}</p>}
          </div>

          {/* Kelas / Tingkat */}
          <div className="space-y-1.5">
            <label htmlFor="kelasTingkat" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Kelas / Tingkat <span className="text-rose-500">*</span>
            </label>
            <input
              id="kelasTingkat"
              type="text"
              value={formData.kelasTingkat || ''}
              onChange={(e) => setFormData({ ...formData, kelasTingkat: e.target.value })}
              placeholder="Contoh: X IPA 1 / Kelas XI / Semester 2"
              className={cn(
                "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                errors.kelasTingkat ? "border-rose-500" : "border-[var(--border-main)]"
              )}
            />
            {errors.kelasTingkat && <p className="text-[10px] text-rose-500">{errors.kelasTingkat}</p>}
          </div>

          {/* Tanggal Lahir */}
          <div className="space-y-1.5">
            <label htmlFor="tanggalLahir" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Tanggal Lahir
            </label>
            <input
              id="tanggalLahir"
              type="date"
              value={formData.tanggalLahir || ''}
              onChange={(e) => setFormData({ ...formData, tanggalLahir: e.target.value })}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
            </input>
          </div>

          {/* Status Keanggotaan */}
          <div className="space-y-1.5">
            <label htmlFor="statusKeanggotaan" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Status Keanggotaan
            </label>
            <select
              id="statusKeanggotaan"
              value={formData.statusKeanggotaan || 'Aktif'}
              onChange={(e) => setFormData({ ...formData, statusKeanggotaan: e.target.value })}
              className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="Aktif">Aktif</option>
              <option value="Pengurus">Pengurus Aktif</option>
              <option value="Alumni">Alumni / Demisioner</option>
            </select>
          </div>

          {/* Alamat Lengkap Domisili */}
          <div className="space-y-1.5 sm:col-span-2">
            <label htmlFor="alamatLengkap" className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Alamat Domisili / Tempat Tinggal <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="alamatLengkap"
              rows={2}
              value={formData.alamatLengkap || ''}
              onChange={(e) => setFormData({ ...formData, alamatLengkap: e.target.value })}
              placeholder="Desa/Kelurahan, RT/RW, Kecamatan, Kabupaten Cirebon"
              className={cn(
                "w-full bg-[var(--bg-card)] border rounded-xl px-4 py-2.5 text-xs text-[var(--text-main)] focus:outline-none focus:ring-2 focus:ring-emerald-500/50",
                errors.alamatLengkap ? "border-rose-500" : "border-[var(--border-main)]"
              )}
            />
            {errors.alamatLengkap && <p className="text-[10px] text-rose-500">{errors.alamatLengkap}</p>}
          </div>

          {/* Minat & Bakat */}
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
              Minat & Bakat Kader
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl custom-scrollbar">
              {[
                'Jurnalistik', 'Media & IT', 'Desain Grafis', 'Fotografi & Video', 
                'Kepemimpinan', 'Kewirausahaan', 'Public Speaking', 'Hadroh & Sholawat', 
                'Seni Musik', 'Olahraga', 'Pramuka / CBP', 'Literasi & Riset'
              ].map(item => {
                const selected = (formData.minatBakat || []).includes(item);
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      const current = formData.minatBakat || [];
                      const updated = selected ? current.filter((x: string) => x !== item) : [...current, item];
                      setFormData({ ...formData, minatBakat: updated });
                    }}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all",
                      selected 
                        ? "bg-emerald-600 text-white shadow-sm" 
                        : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
                    )}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4. RIWAYAT 4 JENJANG KADERISASI FORMAL */}
      {/* ============================================================== */}
      <div className="bg-[var(--bg-app)]/60 border border-[var(--border-main)] rounded-2xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border-main)] pb-3">
          <div className="flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-500" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-[var(--text-main)]">
                Riwayat Jenjang Kaderisasi Formal
              </h3>
              <p className="text-[10px] text-[var(--text-muted)]">
                Bisa dicentang dan diisi seluruhnya (ke-4 jenjang) jika kader telah melaksanakannya
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider w-fit">
            <span>Tingkat Tertinggi:</span>
            <span className="text-white">{formData.jenjangKaderisasi || 'Belum Kaderisasi'}</span>
          </div>
        </div>

        {/* 4 Cards for the 4 Stages */}
        <div className="space-y-3">
          {[
            {
              key: 'makesta',
              title: '1. MAKESTA (Masa Kesetiaan Anggota)',
              level: 'MAKESTA',
              desc: 'Kaderisasi formal tingkat pertama / penerimaan anggota baru (Komisariat/PAC)',
              badgeColor: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
            },
            {
              key: 'lakmud',
              title: '2. LAKMUD (Latihan Kader Muda)',
              level: 'LAKMUD',
              desc: 'Kaderisasi formal tingkat menengah pembentukan watak & kepemimpinan (Cabang/PAC)',
              badgeColor: 'border-blue-500/30 text-blue-400 bg-blue-500/10'
            },
            {
              key: 'lakut',
              title: '3. LAKUT (Latihan Kader Utama)',
              level: 'LAKUT',
              desc: 'Kaderisasi formal tingkat lanjut ideologis & analis kebijakan (Wilayah/PW)',
              badgeColor: 'border-purple-500/30 text-purple-400 bg-purple-500/10'
            },
            {
              key: 'latin',
              title: '4. LATIN (Latihan Instruktur)',
              level: 'LATIN',
              desc: 'Kaderisasi formal tingkat instruktur, pelatih, & fasilitator kaderisasi nasional/daerah',
              badgeColor: 'border-amber-500/30 text-amber-400 bg-amber-500/10'
            }
          ].map((stage) => {
            const isChecked = Boolean(
              formData.riwayatKaderisasi?.[stage.key]?.diikuti || 
              formData.jenjangKaderisasi === stage.level
            );
            const stageData = formData.riwayatKaderisasi?.[stage.key] || {
              waktu: formData.jenjangKaderisasi === stage.level ? (formData.waktuKaderisasi || '') : '',
              tempat: formData.jenjangKaderisasi === stage.level ? (formData.tempatKaderisasi || '') : ''
            };

            const handleToggle = (checked: boolean) => {
              const updatedRiwayat = {
                ...(formData.riwayatKaderisasi || {}),
                [stage.key]: {
                  ...stageData,
                  diikuti: checked
                }
              };

              // Hitung jenjang kaderisasi tertinggi
              let highestLevel = 'Belum Kaderisasi';
              if (updatedRiwayat.latin?.diikuti) highestLevel = 'LATIN';
              else if (updatedRiwayat.lakut?.diikuti) highestLevel = 'LAKUT';
              else if (updatedRiwayat.lakmud?.diikuti) highestLevel = 'LAKMUD';
              else if (updatedRiwayat.makesta?.diikuti) highestLevel = 'MAKESTA';

              const activeStageData = updatedRiwayat[stage.key];

              setFormData({
                ...formData,
                jenjangKaderisasi: highestLevel,
                riwayatKaderisasi: updatedRiwayat,
                waktuKaderisasi: activeStageData?.waktu || formData.waktuKaderisasi || '',
                tempatKaderisasi: activeStageData?.tempat || formData.tempatKaderisasi || ''
              });
            };

            const handleFieldChange = (field: 'waktu' | 'tempat', val: string) => {
              const updatedRiwayat = {
                ...(formData.riwayatKaderisasi || {}),
                [stage.key]: {
                  ...stageData,
                  diikuti: true,
                  [field]: val
                }
              };

              let highestLevel = formData.jenjangKaderisasi;
              if (!highestLevel || highestLevel === 'Belum Kaderisasi') {
                highestLevel = stage.level;
              }

              setFormData({
                ...formData,
                jenjangKaderisasi: highestLevel,
                riwayatKaderisasi: updatedRiwayat,
                ...(field === 'waktu' && stage.level === highestLevel ? { waktuKaderisasi: val } : {}),
                ...(field === 'tempat' && stage.level === highestLevel ? { tempatKaderisasi: val } : {})
              });
            };

            return (
              <div 
                key={stage.key}
                className={cn(
                  "p-4 rounded-2xl border transition-all space-y-3",
                  isChecked 
                    ? "bg-[var(--bg-card)] border-emerald-500/40 shadow-sm" 
                    : "bg-[var(--bg-card)]/40 border-[var(--border-main)] hover:border-zinc-700 opacity-80 hover:opacity-100"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <label className="flex items-start gap-3 cursor-pointer select-none flex-1">
                    <input 
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => handleToggle(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-zinc-700 text-emerald-600 focus:ring-emerald-500 bg-zinc-900 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-[var(--text-main)]">
                          {stage.title}
                        </span>
                        <span className={cn("px-2 py-0.5 rounded-md text-[9px] font-black uppercase border", stage.badgeColor)}>
                          {isChecked ? 'Sudah Lulus' : 'Belum'}
                        </span>
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                        {stage.desc}
                      </p>
                    </div>
                  </label>
                </div>

                {/* Kolom Waktu & Tempat yang aktif jika dicentang */}
                {isChecked && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-main)]">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Waktu Pelaksanaan {stage.level}
                      </label>
                      <input 
                        type="text"
                        value={stageData.waktu || ''}
                        onChange={(e) => handleFieldChange('waktu', e.target.value)}
                        placeholder="Contoh: 12-14 Oktober 2023"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Tempat / Penyelenggara {stage.level}
                      </label>
                      <input 
                        type="text"
                        value={stageData.tempat || ''}
                        onChange={(e) => handleFieldChange('tempat', e.target.value)}
                        placeholder="Contoh: Ponpes Babakan Ciwaringin / PAC Weru"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl px-3 py-2 text-xs text-[var(--text-main)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tombol Aksi Bawah */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--border-main)]">
        <button
          type="button"
          onClick={handleCancel}
          className="flex-1 py-3 px-4 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--border-main)] border border-[var(--border-main)] text-xs font-bold text-[var(--text-muted)] transition-all"
        >
          Batalkan
        </button>
        <button
          type="submit"
          disabled={isPhotoProcessing || externalUploading}
          className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <CheckCircle2 size={16} />
          <span>{editingId ? 'Simpan Perubahan' : 'Daftarkan Anggota'}</span>
        </button>
      </div>
    </form>
  );
};
