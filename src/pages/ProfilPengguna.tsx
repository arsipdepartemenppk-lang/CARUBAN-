import React, { useState, useEffect } from 'react';
import { useFirebase } from '../components/FirebaseProvider';
import { doc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { useToast } from '../components/Toast';
import { 
  Camera, Save, Loader2, Info, MessageSquare, LifeBuoy, ChevronRight, 
  LogOut, QrCode, Download, Copy, Check, ShieldCheck, Sparkles, 
  Maximize2, CheckCircle2, Shield, Fingerprint, RefreshCw 
} from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from '../components/ThemeProvider';
import imageCompression from 'browser-image-compression';
import { uploadMedia } from '../utils/uploadUtils';
import { Logo } from '../components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { isBiometricAvailable, registerBiometric } from '../utils/biometricUtils';
import { ContributionCalendar } from '../components/ContributionCalendar';
import { DigitalMemberCard } from '../components/DigitalMemberCard';
import { MemberQRModal } from '../components/MemberQRModal';

export default function ProfilPengguna() {
  const { user, userData, loading: firebaseLoading } = useFirebase();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [memberData, setMemberData] = useState<any>(null);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
    phoneNumber: '',
    notificationSettings: { email: true, push: true },
  });

  useEffect(() => {
    const fetchMember = async () => {
      if (!user) return;
      try {
        if (user.email) {
          const q = query(collection(db, 'members'), where('email', '==', user.email), limit(1));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setMemberData({ id: snap.docs[0].id, ...snap.docs[0].data() });
            return;
          }
        }
        if (userData?.nomorIndukAnggota || userData?.nia) {
          setMemberData({
            namaLengkap: userData.displayName || user.displayName || 'Anggota',
            nomorIndukAnggota: userData.nomorIndukAnggota || userData.nia,
            namaSekolah: userData.namaSekolah || userData.sekolah || 'PC IPNU Kab. Cirebon',
            statusPimpinan: userData.statusPimpinan || userData.role || 'Anggota',
            foto: user.photoURL
          });
        }
      } catch (err) {
        console.warn('Fetch member profile notice:', err);
      }
    };
    fetchMember();
  }, [user, userData]);

  useEffect(() => {
    if (userData && !firebaseLoading) {
      setFormData({
        displayName: userData.displayName || user?.displayName || '',
        email: userData.email || user?.email || '',
        phoneNumber: userData.phoneNumber || '',
        notificationSettings: userData.notificationSettings || { email: true, push: true },
      });
    }
  }, [userData, user, firebaseLoading]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    try {
      const updates = [];
      if (formData.displayName !== user.displayName) {
        updates.push(updateProfile(user, { displayName: formData.displayName }));
      }
      updates.push(updateDoc(doc(db, 'users', user.uid), {
        displayName: formData.displayName,
        phoneNumber: formData.phoneNumber,
        notificationSettings: formData.notificationSettings,
      }));
      
      await Promise.all(updates);
      showToast('Profil berhasil diperbarui', 'success');
    } catch (error) {
      console.error('Profile update failed:', error);
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, auth);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      showToast('Hanya file JPG atau PNG yang diperbolehkan', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran file maksimal 2MB', 'error');
      return;
    }
    setIsUploadingPhoto(true);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    try {
      const options = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 512,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const url = await uploadMedia(compressedFile, 'profiles', user.uid);
      
      await Promise.all([
        updateProfile(user, { photoURL: url }),
        updateDoc(doc(db, 'users', user.uid), { photoURL: url })
      ]);
      
      setPhotoPreview(url);
      showToast('Foto profil berhasil diperbarui', 'success');
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      setPhotoPreview(userData?.photoURL || user?.photoURL || null);
      showToast(error.message || 'Gagal memperbarui foto profil', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const effectiveNia = memberData?.nomorIndukAnggota || userData?.nomorIndukAnggota || userData?.nia || user?.uid?.slice(0, 10).toUpperCase() || 'IPNU-MEMBER';
  const effectiveName = memberData?.namaLengkap || formData.displayName || userData?.displayName || user?.displayName || 'Anggota IPNU';
  const effectiveSekolah = memberData?.namaSekolah || userData?.namaSekolah || userData?.sekolah || 'PC IPNU IPPNU Kab. Cirebon';
  const effectivePimpinan = memberData?.statusPimpinan || userData?.statusPimpinan || userData?.role || 'Anggota';
  const qrIdentityValue = `IPNU:${effectiveNia}:${effectiveName}`;

  return (
    <div className="p-6 max-w-2xl mx-auto pt-20 bg-[var(--bg-app)] text-[var(--text-main)] min-h-screen">
      <h1 className="text-3xl font-black uppercase tracking-tighter mb-8">Profil Pengguna</h1>
      
      {user && (
        <div className="mb-8 flex flex-col gap-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[32px] p-6 md:p-8 space-y-6 shadow-xl relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border-main)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <ShieldCheck size={12} /> Kartu Identitas Digital
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-zinc-800 text-zinc-300">
                    Offline Ready
                  </span>
                </div>
                <h2 className="text-xl font-black text-[var(--text-main)] flex items-center gap-2">
                  <QrCode className="text-emerald-400" />
                  KTA Digital & QR Code Anggota
                </h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Gunakan kartu QR ini untuk presensi otomatis pada setiap kegiatan & pendataan acara offline.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 active:scale-95 transition-all self-start sm:self-auto shrink-0"
              >
                <Maximize2 size={14} /> Perbesar QR
              </button>
            </div>

            {/* Visual KTA Card Component */}
            <div className="flex justify-center">
              <DigitalMemberCard 
                userId={effectiveNia} 
                userName={effectiveName} 
                userRole={effectivePimpinan}
                photoURL={user.photoURL}
                organization={effectiveSekolah}
              />
            </div>

            {/* Quick Actions & Summary Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="p-3 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <QrCode size={16} className="text-emerald-400" />
                <span>Buka Layar Penuh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(qrIdentityValue);
                  setCopiedCode(true);
                  showToast('Format presensi IPNU berhasil disalin!', 'success');
                  setTimeout(() => setCopiedCode(false), 2000);
                }}
                className="p-3 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {copiedCode ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copiedCode ? 'Tersalin' : 'Salin Kode Presensi'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowQRModal(true)}
                className="p-3 rounded-2xl bg-[var(--bg-app)] hover:bg-emerald-500/10 border border-[var(--border-main)] text-xs font-bold text-[var(--text-main)] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Download size={16} className="text-emerald-400" />
                <span>Unduh Gambar KTA</span>
              </button>
            </div>

            {/* Summary info strip */}
            <div className="p-4 rounded-2xl bg-[var(--bg-app)] border border-[var(--border-main)] grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Nomor Induk (NIA)</span>
                <span className="font-mono font-bold text-emerald-400 truncate block">{effectiveNia}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Tingkatan</span>
                <span className="font-bold text-[var(--text-main)] truncate block">{effectivePimpinan}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Komisariat/Sekolah</span>
                <span className="font-bold text-[var(--text-main)] truncate block">{effectiveSekolah}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)] block">Status KTA</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={12} /> Resmi Terdaftar
                </span>
              </div>
            </div>
          </div>

          <ContributionCalendar userId={user.uid} />
        </div>
      )}

      <form onSubmit={handleUpdateProfile} className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl p-8 space-y-6">
        <div className="flex items-center gap-6">
          <div className="relative group">
            <div className="relative w-24 h-24">
              <img 
                src={photoPreview || userData?.photoURL || user?.photoURL || 'https://ui-avatars.com/api/?name=' + (formData.displayName || 'User')} 
                alt="Profile" 
                className={cn(
                  "w-24 h-24 rounded-full object-cover border-4 border-[var(--border-main)] shadow-xl transition-opacity",
                  isUploadingPhoto && "opacity-50"
                )}
              />
              {isUploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="animate-spin text-emerald-500" size={24} />
                </div>
              )}
            </div>
            <label 
              htmlFor="profile-photo"
              className={cn(
                "absolute bottom-0 right-0 p-2 bg-emerald-600 rounded-full cursor-pointer hover:bg-emerald-500 transition-all shadow-lg active:scale-90",
                isUploadingPhoto && "opacity-50 cursor-not-allowed"
              )}
            >
              <Camera size={16} className="text-white" />
            </label>
            <input 
              id="profile-photo"
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={handlePhotoUpload} 
              disabled={isUploadingPhoto}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-[var(--text-main)] truncate">{formData.displayName || 'Nama Pengguna'}</h2>
            <div className="flex items-center gap-2">
              <p className="text-[var(--text-muted)] text-sm truncate">{formData.email}</p>
              <span className="text-[10px] font-black bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full uppercase">
                {userData?.poinSkill || 0} Poin
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Nama Lengkap</label>
            <input 
              type="text" 
              value={formData.displayName}
              onChange={(e) => setFormData({...formData, displayName: e.target.value})}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 mt-1 focus:border-emerald-500 outline-none text-[var(--text-main)]"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Nomor Telepon</label>
            <input 
              type="tel" 
              value={formData.phoneNumber}
              onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
              className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl p-4 mt-1 focus:border-emerald-500 outline-none text-[var(--text-main)]"
            />
          </div>
          <div className="pt-4">
            <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Notifikasi</label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                <input 
                  type="checkbox" 
                  checked={formData.notificationSettings.email}
                  onChange={(e) => setFormData({...formData, notificationSettings: {...formData.notificationSettings, email: e.target.checked}})}
                  className="accent-emerald-600"
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm text-[var(--text-main)]">
                <input 
                  type="checkbox" 
                  checked={formData.notificationSettings.push}
                  onChange={(e) => setFormData({...formData, notificationSettings: {...formData.notificationSettings, push: e.target.checked}})}
                  className="accent-emerald-600"
                />
                Push
              </label>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase">Tema Aplikasi</label>
          <div className="flex gap-2 mt-2">
            {(['light', 'dark', 'system'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold capitalize transition-all",
                  theme === t ? "bg-emerald-600 text-white" : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:bg-[var(--bg-card)] border border-[var(--border-main)]"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--border-main)]">
          <label className="text-xs font-bold text-[var(--text-muted)] uppercase flex items-center gap-2">
            <Shield size={14} className="text-emerald-500" /> Pengaturan Keamanan
          </label>
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--bg-app)] rounded-2xl border border-[var(--border-main)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                  <Fingerprint size={20} />
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--text-main)]">Login Biometrik</p>
                  <p className="text-[10px] text-zinc-500 font-medium">Gunakan sidik jari atau wajah untuk masuk</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={async () => {
                  if (!user?.email) return;
                  const available = await isBiometricAvailable();
                  if (!available) {
                    showToast('Biometrik tidak didukung di perangkat ini', 'error');
                    return;
                  }
                  try {
                    await registerBiometric(user.email);
                    showToast('Biometrik berhasil didaftarkan', 'success');
                  } catch (err: any) {
                    showToast('Gagal daftar biometrik: ' + err.message, 'error');
                  }
                }}
                className={cn(
                  "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                  localStorage.getItem(`biometric_cid_${user?.email}`) 
                    ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                    : "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                )}
              >
                {localStorage.getItem(`biometric_cid_${user?.email}`) ? 'Sudah Aktif' : 'Aktifkan'}
              </button>
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
          SIMPAN PERUBAHAN
        </button>
      </form>

      <div className="mt-8 space-y-4">
        <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-4">Pusat Bantuan, Panduan & Donasi</h3>
        <div className="bg-[var(--bg-card)] rounded-[32px] border border-[var(--border-main)] shadow-sm overflow-hidden divide-y divide-[var(--border-main)]">
          {/* Panduan Penggunaan */}
          <div className="p-4 flex items-center justify-between hover:bg-[var(--bg-app)]/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">Panduan Penggunaan</p>
                <p className="text-[11px] text-[var(--text-muted)]">Manual book dan tata cara penggunaan fitur CARUBAN CORE</p>
              </div>
            </div>
            <a 
              href="/panduan" 
              className="text-[10px] font-black text-emerald-400 hover:bg-emerald-500/10 px-4 py-2 rounded-xl transition-all border border-emerald-500/20 uppercase tracking-widest flex items-center gap-1"
            >
              Buka <ChevronRight size={14} />
            </a>
          </div>

          {/* Donasi & Dukungan */}
          <div className="p-4 flex items-center justify-between hover:bg-[var(--bg-app)]/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">Donasi & Kas Organisasi</p>
                <p className="text-[11px] text-[var(--text-muted)]">Dukung kemandirian kader dan operasional PC IPNU IPPNU Kab. Cirebon</p>
              </div>
            </div>
            <a 
              href="/donasi" 
              className="text-[10px] font-black text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all border border-rose-500/20 uppercase tracking-widest flex items-center gap-1"
            >
              Donasi <ChevronRight size={14} />
            </a>
          </div>

          {/* Pusat Bantuan / Kontak Support */}
          <div className="p-4 flex items-center justify-between hover:bg-[var(--bg-app)]/50 transition-colors">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500/10 text-blue-500 rounded-xl">
                <LifeBuoy size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-main)]">Pusat Bantuan & Layanan Kendala</p>
                <p className="text-[11px] text-[var(--text-muted)]">Layanan bantuan teknis dan pertanyaan seputar aplikasi</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={() => window.open('mailto:arsipdepartemenppk@gmail.com?subject=Bantuan%20Aplikasi%20Caruban%20Core', '_blank')} 
              className="text-[10px] font-black text-blue-500 hover:bg-blue-500/10 px-4 py-2 rounded-xl transition-all border border-blue-500/20 uppercase tracking-widest"
            >
              Hubungi
            </button>
          </div>

          {/* Tentang Aplikasi */}
          <div className="p-4">
            <button type="button" className="flex items-center justify-between w-full" onClick={() => setShowAbout(!showAbout)}>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-zinc-500/10 text-zinc-400 rounded-xl">
                  <Info size={20} />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-[var(--text-main)]">Tentang Aplikasi</p>
                  <p className="text-[11px] text-[var(--text-muted)]">Informasi rilis dan pengembang resmi</p>
                </div>
              </div>
              <ChevronRight size={20} className={cn("text-zinc-500 transition-transform", showAbout && "rotate-90")} />
            </button>
            {showAbout && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 pt-4 border-t border-[var(--border-main)] space-y-3"
              >
                <div className="flex items-center gap-4">
                  <Logo size={48} className="text-[var(--bg-primary)]" />
                  <div>
                    <h4 className="font-black text-lg tracking-tight text-[var(--text-main)]">CARUBAN CORE</h4>
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">PC IPNU & IPPNU Kabupaten Cirebon</p>
                  </div>
                </div>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  Caruban Core adalah platform digital resmi terpadu untuk Pimpinan Cabang Ikatan Pelajar Nahdlatul Ulama (IPNU) dan Ikatan Pelajar Putri Nahdlatul Ulama (IPPNU) Kabupaten Cirebon masa khidmat 2024–2026.
                </p>
              </motion.div>
            )}
          </div>

          {/* Keluar Akun */}
          <div className="p-4 flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl">
                <LogOut size={20} />
              </div>
              <p className="text-sm font-bold text-[var(--text-main)]">Keluar Akun</p>
            </div>
            <button 
              type="button"
              onClick={() => auth.signOut()} 
              className="text-[10px] font-black text-rose-500 hover:bg-rose-500/10 px-4 py-2 rounded-xl transition-all border border-rose-500/20 uppercase tracking-widest"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>

      {/* Member Fullscreen / High-Res QR Modal */}
      <MemberQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        member={{
          namaLengkap: effectiveName,
          nomorIndukAnggota: effectiveNia,
          namaSekolah: effectiveSekolah,
          statusPimpinan: effectivePimpinan,
          foto: user.photoURL || undefined
        }}
      />
    </div>
  );
}
