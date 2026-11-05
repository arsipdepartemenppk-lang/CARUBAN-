import React, { useState, useEffect } from 'react';
import imageCompression from 'browser-image-compression';
import { useFirebase } from '../components/FirebaseProvider';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../firebase';
import { updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../utils/firebaseUtils';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Link } from 'react-router-dom';
import { LogOut, User, Mail, Shield, Settings, MapPin, Camera, Mic, HardDrive, Bell, ChevronRight, Lock, Clock, Calendar, Sun, Moon, MessageSquare, Loader2, Info, LifeBuoy, HelpCircle, Share2, Globe, X } from 'lucide-react';
import { useTheme } from '../components/ThemeProvider';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { logActivity } from '../utils/activityLogger';
import { uploadMedia } from '../utils/uploadUtils';
import { Logo } from '../components/Logo';

export default function PengaturanUser() {
  const { user, role, userData } = useFirebase();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { showToast } = useToast();
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || '',
    photoURL: user?.photoURL || ''
  });
  const [photoPreview, setPhotoPreview] = useState<string | null>(user?.photoURL || null);
  const [openSection, setOpenSection] = useState<'profile' | 'general' | 'role' | 'quiet' | 'help' | null>('profile');
  const [showAbout, setShowAbout] = useState(false);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
    setIsUploadingPhoto(true);
    try {
      const options = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 512,
        useWebWorker: true
      };
      const compressedFile = await imageCompression(file, options);
      const downloadURL = await uploadMedia(compressedFile, 'profile_pictures', user.uid);
      
      await updateProfile(user, { photoURL: downloadURL });
      await setDoc(doc(db, 'users', user.uid), { photoURL: downloadURL }, { merge: true });
      await logActivity(user.uid, user.email, 'UPDATE_PROFILE_PHOTO', 'Settings', user.uid, { photoURL: downloadURL });
      
      setProfileForm({ ...profileForm, photoURL: downloadURL });
      setPhotoPreview(downloadURL);
      showToast('Foto profil berhasil diperbarui', 'success');
    } catch (error: any) {
      console.error('Photo upload failed:', error);
      setPhotoPreview(user?.photoURL || null);
      showToast(error.message || 'Gagal mengunggah foto profil', 'error');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const [permissions, setPermissions] = useState({
    geolocation: 'prompt',
    camera: 'prompt',
    microphone: 'prompt'
  });

  const [notificationPrefs, setNotificationPrefs] = useState({
    enableAll: true,
    enablePC: true,
    enablePK: true,
    enableUser: true,
    quietHours: false,
    quietStart: '22:00',
    quietEnd: '07:00',
    scheduledReminders: [] as { id: string; title: string; date: string; type: 'deadline' | 'visit' }[]
  });

  const [reminderForm, setReminderForm] = useState({
    title: '',
    date: '',
    type: 'deadline' as 'deadline' | 'visit'
  });

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
        showToast('Berhasil terhubung ke Google Calendar', 'success');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [showToast]);

  useEffect(() => {
    checkPermissions();
    if (userData?.notificationPreferences) {
      setNotificationPrefs(userData.notificationPreferences);
    }
  }, [userData]);

  const saveNotificationPrefs = async (newPrefs: typeof notificationPrefs) => {
    if (!user) return;
    setSavingPrefs(true);
    try {
      await setDoc(doc(db, 'users', user.uid), {
        notificationPreferences: newPrefs
      }, { merge: true });
      await logActivity(user.uid, user.email, 'UPDATE_NOTIFICATION_PREFS', 'Settings', user.uid, { newPrefs });
      showToast('Preferensi notifikasi disimpan', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, auth);
      showToast('Gagal menyimpan preferensi', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const updatePref = (key: keyof typeof notificationPrefs, value: any) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    saveNotificationPrefs(newPrefs);
  };

  const checkPermissions = async () => {
    try {
      const geo = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      const cam = await navigator.permissions.query({ name: 'camera' as any });
      const mic = await navigator.permissions.query({ name: 'microphone' as any });
      setPermissions({
        geolocation: geo.state,
        camera: cam.state,
        microphone: mic.state
      });
      geo.onchange = () => setPermissions(prev => ({ ...prev, geolocation: geo.state }));
      cam.onchange = () => setPermissions(prev => ({ ...prev, camera: cam.state }));
      mic.onchange = () => setPermissions(prev => ({ ...prev, microphone: mic.state }));
    } catch (e) {
      console.error('Permission query not supported', e);
    }
  };

  const requestPermission = async (type: 'geolocation' | 'camera' | 'microphone' | 'notifications') => {
    try {
      if (type === 'geolocation') {
        navigator.geolocation.getCurrentPosition(() => checkPermissions(), () => checkPermissions());
      } else if (type === 'camera') {
        await navigator.mediaDevices.getUserMedia({ video: true });
        checkPermissions();
      } else if (type === 'microphone') {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        checkPermissions();
      } else if (type === 'notifications') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          showToast('Izin notifikasi diberikan', 'success');
        }
      }
      await logActivity(user?.uid, user?.email, 'REQUEST_PERMISSION', 'Settings', user?.uid, { type });
    } catch (e) {
      showToast(`Gagal meminta izin ${type}`, 'error');
    }
  };

  const addReminder = () => {
    if (!reminderForm.title || !reminderForm.date) {
      showToast('Judul dan tanggal harus diisi', 'error');
      return;
    }
    const newReminder = {
      id: Math.random().toString(36).substring(7),
      ...reminderForm
    };
    const newPrefs = {
      ...notificationPrefs,
      scheduledReminders: [...(notificationPrefs.scheduledReminders || []), newReminder]
    };
    setNotificationPrefs(newPrefs);
    saveNotificationPrefs(newPrefs);
    setReminderForm({ title: '', date: '', type: 'deadline' });
    showToast('Pengingat berhasil ditambahkan', 'success');
  };

  const removeReminder = (id: string) => {
    const newPrefs = {
      ...notificationPrefs,
      scheduledReminders: notificationPrefs.scheduledReminders.filter(r => r.id !== id)
    };
    setNotificationPrefs(newPrefs);
    saveNotificationPrefs(newPrefs);
    showToast('Pengingat dihapus', 'info');
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSavingPrefs(true);
    try {
      await updateProfile(user, {
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL
      });
      
      await setDoc(doc(db, 'users', user.uid), {
        displayName: profileForm.displayName,
        photoURL: profileForm.photoURL
      }, { merge: true });
      await logActivity(user.uid, user.email, 'UPDATE_PROFILE', 'Settings', user.uid, { profileForm });
      showToast('Profil berhasil diperbarui', 'success');
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`, auth);
      showToast('Gagal memperbarui profil', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const handleLogout = () => {
    setLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    if (user) {
      await logActivity(user.uid, user.email, 'LOGOUT', 'Auth', user.uid, {});
    }
    auth.signOut();
    setLogoutConfirm(false);
  };

  const PermissionItem = ({ 
    icon: Icon, 
    label, 
    status, 
    onClick 
  }: { 
    icon: any, 
    label: string, 
    status: string, 
    onClick: () => void 
  }) => (
    <div className="p-4 border-b border-zinc-800 flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={cn(
          "p-2 rounded-lg transition-colors",
          status === 'granted' ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)]" : 
          status === 'denied' ? "bg-rose-500/10 text-rose-500" : "bg-zinc-800 text-zinc-400"
        )}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-200">{label}</p>
          <p className={cn(
            "text-[10px] font-black uppercase tracking-widest",
            status === 'granted' ? "text-[var(--accent-primary)]" : 
            status === 'denied' ? "text-rose-500" : "text-zinc-500"
          )}>
            {status === 'granted' ? 'Diizinkan' : status === 'denied' ? 'Ditolak' : 'Belum Diatur'}
          </p>
        </div>
      </div>
      {status !== 'granted' && (
        <button 
          onClick={onClick}
          className="text-[10px] font-black text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 px-3 py-1.5 rounded-lg transition-all border border-[var(--accent-primary)]/20"
        >
          AKTIFKAN
        </button>
      )}
    </div>
  );

  return (
    <div className="p-4 pb-24 space-y-6 max-w-2xl mx-auto bg-[var(--bg-app)] text-[var(--text-main)]">
      <div className="pt-12">
        <h1 className="text-3xl font-black tracking-tighter uppercase">Pengaturan</h1>
        <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest">Kelola Akun</p>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[var(--bg-card)] p-8 rounded-[32px] border border-[var(--border-main)] shadow-sm flex flex-col items-center gap-6"
      >
        <div className="relative">
          <div className="relative w-28 h-28">
            {photoPreview ? (
              <img 
                src={photoPreview} 
                alt="Profil" 
                className={cn(
                  "w-28 h-28 rounded-[32px] border-4 border-[var(--accent-primary)]/20 shadow-2xl object-cover transition-opacity",
                  isUploadingPhoto && "opacity-50"
                )} 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-28 h-28 rounded-[32px] bg-[var(--bg-primary)] flex items-center justify-center font-black text-white text-4xl shadow-2xl border-4 border-[var(--accent-primary)]/20">
                {user?.email?.charAt(0).toUpperCase()}
              </div>
            )}
            {isUploadingPhoto && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-[var(--accent-primary)]" />
              </div>
            )}
          </div>
          <label 
            htmlFor="profile-photo-input"
            className={cn(
              "absolute -bottom-2 -right-2 w-10 h-10 bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl flex items-center justify-center text-[var(--accent-primary)] shadow-xl cursor-pointer hover:opacity-80 transition-all active:scale-90",
              isUploadingPhoto && "opacity-50 cursor-not-allowed"
            )}
          >
            <Camera size={20} />
          </label>
          <input 
            id="profile-photo-input"
            type="file" 
            className="hidden" 
            accept="image/*" 
            onChange={handlePhotoSelect} 
            disabled={isUploadingPhoto}
          />
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-zinc-100 tracking-tight">{user?.displayName || 'Pengguna'}</h2>
          <p className="text-zinc-500 font-bold text-sm uppercase tracking-widest mt-1">
            {role === 'admin' ? 'Admin/Developer' : 
             role === 'PC' ? 'PC (Pimpinan Cabang)' : 
             role === 'PAC' ? 'PAC (Pimpinan Anak Cabang)' :
             role === 'PK' ? 'PK (Pimpinan Komisariat)' : 
             role === 'PR' ? 'PR (Pimpinan Ranting)' :
             'User (Rekan/Rekanita)'}
          </p>
          <button 
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-zinc-700"
          >
            {isEditingProfile ? 'Batal Edit' : 'Edit Profil'}
          </button>
        </div>

        {isEditingProfile && (
          <motion.form 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            onSubmit={handleUpdateProfile}
            className="w-full space-y-4 pt-4 border-t border-zinc-800"
          >
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-2">Nama Tampilan</label>
              <input 
                type="text" 
                value={profileForm.displayName}
                onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3 text-sm text-zinc-200 focus:outline-none focus:border-[var(--accent-primary)] transition-all"
                placeholder="Masukkan nama..."
              />
            </div>
            <button 
              type="submit"
              disabled={savingPrefs}
              className="w-full bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/90 text-white font-black py-3 rounded-2xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
            >
              {savingPrefs ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Perubahan'}
            </button>
          </motion.form>
        )}
      </motion.div>

      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">Penjadwalan Notifikasi Lokal</h3>
        <div className="bg-zinc-900/30 rounded-[32px] border border-zinc-800 shadow-sm overflow-hidden p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Calendar size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-zinc-200">Atur Pengingat Tugas</p>
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Deadline administrasi atau visitasi</p>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Judul Pengingat (cth: Laporan Bulanan)"
                value={reminderForm.title}
                onChange={(e) => setReminderForm({...reminderForm, title: e.target.value})}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              />
              <input 
                type="datetime-local" 
                value={reminderForm.date}
                onChange={(e) => setReminderForm({...reminderForm, date: e.target.value})}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              />
            </div>
            <div className="flex gap-4">
              <select 
                value={reminderForm.type}
                onChange={(e) => setReminderForm({...reminderForm, type: e.target.value as any})}
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm focus:border-emerald-500 outline-none"
              >
                <option value="deadline">Deadline Administrasi</option>
                <option value="visit">Jadwal Visitasi</option>
              </select>
              <button 
                onClick={addReminder}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all"
              >
                TAMBAH
              </button>
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-zinc-800">
            {notificationPrefs.scheduledReminders?.length > 0 ? (
              notificationPrefs.scheduledReminders.map(reminder => (
                <div key={reminder.id} className="flex items-center justify-between p-4 bg-zinc-950 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      reminder.type === 'deadline' ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {reminder.type === 'deadline' ? <Clock size={14} /> : <MapPin size={14} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-zinc-200">{reminder.title}</p>
                      <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">
                        {new Date(reminder.date).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => removeReminder(reminder.id)} className="text-zinc-600 hover:text-rose-500 transition-colors">
                    <X size={16} />
                  </button>
                </div>
              ))
            ) : (
              <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest text-center py-4 italic">Belum ada pengingat terjadwal</p>
            )}
          </div>
          
          <button 
            onClick={() => requestPermission('notifications')}
            className="w-full text-[10px] font-black text-emerald-500 hover:bg-emerald-500/5 py-3 rounded-2xl border border-emerald-500/20 uppercase tracking-widest transition-all"
          >
            Minta Izin Notifikasi Browser
          </button>
        </div>
      </div>
      <div className="space-y-4">
        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] ml-4">Pengaturan Umum</h3>
        <div className="bg-zinc-900/30 rounded-[32px] border border-zinc-800 shadow-sm overflow-hidden">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-zinc-800 text-zinc-400 rounded-lg">
                {resolvedTheme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
              </div>
              <p className="text-sm font-bold text-zinc-200">Mode Tampilan</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={cn(
                    "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                    theme === t 
                      ? "bg-[var(--bg-primary)] border-[var(--accent-primary)]/50 text-white shadow-lg shadow-[var(--bg-primary)]/20" 
                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300"
                  )}
                >
                  {t === 'system' ? 'Otomatis' : t === 'light' ? 'Terang' : 'Gelap'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <button 
        onClick={handleLogout}
        className="w-full bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 border border-rose-500/20 font-black py-5 rounded-[32px] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
      >
        <LogOut size={20} />
        Keluar dari Aplikasi
      </button>

      <ConfirmDialog
        isOpen={logoutConfirm}
        title="Keluar Akun"
        message="Apakah Anda yakin ingin keluar dari aplikasi? Anda perlu masuk kembali untuk mengakses data."
        onConfirm={confirmLogout}
        onCancel={() => setLogoutConfirm(false)}
      />
    </div>
  );
}
