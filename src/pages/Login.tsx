import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  sendPasswordResetEmail, 
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { Role } from '../types';
import { LogIn, Mail, Lock, User, Eye, EyeOff, X, Sun, Moon, CheckCircle2, AlertCircle, ShieldAlert, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../components/ThemeProvider';
import { cn } from '../lib/utils';
import { Logo } from '../components/Logo';
import { logActivity } from '../utils/activityLogger';
import { logSecurityAudit } from '../utils/securityEncryption';
import { Fingerprint } from 'lucide-react';
import { isBiometricAvailable, authenticateBiometric, registerBiometric } from '../utils/biometricUtils';

export default function Login() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode>('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<React.ReactNode>('');
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [showBiometricModal, setShowBiometricModal] = useState(false);
  const [biometricEmail, setBiometricEmail] = useState('');
  const [biometricPassword, setBiometricPassword] = useState('');
  const [biometricStep, setBiometricStep] = useState<'prompt' | 'scanning' | 'enroll' | 'success'>('prompt');
  const [biometricStatus, setBiometricStatus] = useState<string>('');
  const navigate = useNavigate();

  // Anti-Brute Force & Cyber Attack Defense Lockout
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    return Number(sessionStorage.getItem('caruban_failed_logins') || '0');
  });
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(() => {
    const lockUntil = Number(sessionStorage.getItem('caruban_lockout_until') || '0');
    const remaining = Math.ceil((lockUntil - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });

  React.useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          sessionStorage.removeItem('caruban_lockout_until');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  React.useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setBiometricEmail(savedEmail);
      setRememberMe(true);
    } else {
      setBiometricEmail('arsipdepartemenppk@gmail.com');
    }
    isBiometricAvailable().then(setBiometricAvailable);
  }, []);

  const validateEmail = (email: string) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const getFriendlyErrorMessage = (err: any) => {
    const code = err?.code || (typeof err === 'string' ? err : '');
    const message = err?.message || '';
    
    const effectiveCode = code || (message.includes('auth/email-already-in-use') ? 'auth/email-already-in-use' : '');
    switch (effectiveCode) {
      case 'auth/invalid-email':
        return 'Format email tidak valid.';
      case 'auth/user-disabled':
        return 'Akun ini telah dinonaktifkan.';
      case 'auth/user-not-found':
        return 'Pengguna tidak ditemukan.';
      case 'auth/wrong-password':
        return 'Kata sandi salah.';
      case 'auth/invalid-credential':
        return (
          <div className="space-y-2 text-left">
            <p className="leading-relaxed">
              Email atau kata sandi tidak cocok. Jika Anda belum pernah mendaftar di database proyek ini, silakan buat akun baru terlebih dahulu.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                  if (!fullName && (email.toLowerCase().includes('syifaudin') || email === 'arsipdepartemenppk@gmail.com')) {
                    setFullName('Ahmad Syifaudin');
                  }
                }}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black text-[11px] shadow transition-all active:scale-95 cursor-pointer"
              >
                ➡️ Klik untuk Daftar Akun Baru
              </button>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setShowForgotModal(true);
                }}
                className="px-3 py-1.5 bg-white dark:bg-zinc-800 border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:opacity-80 rounded-xl font-bold text-[11px] transition-all cursor-pointer"
              >
                Lupa Sandi?
              </button>
            </div>
          </div>
        );
      case 'auth/email-already-in-use':
        return 'Email sudah terdaftar. Silakan masuk jika Anda sudah memiliki akun.';
      case 'auth/weak-password':
        return 'Kata sandi terlalu lemah (minimal 6 karakter).';
      case 'auth/network-request-failed':
        return (
          <span>
            Koneksi bermasalah atau domain belum diizinkan. <br />
            Pastikan domain berikut sudah ditambahkan ke <strong>"Authorized Domains"</strong> di Firebase Console: <br />
            <code className="bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-rose-600 break-all text-[10px] font-mono my-2 block">
              ais-dev-iqri45nokdm4xvfe2tp7bo-636016776037.asia-southeast1.run.app
            </code>
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0513651011/authentication/settings" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-rose-800 font-black text-[10px] block mt-1"
            >
              Buka Pengaturan Authorized Domains {'>'}
            </a>
          </span>
        );
      case 'auth/too-many-requests':
        return 'Terlalu banyak percobaan masuk yang gagal. Silakan coba lagi beberapa saat lagi.';
      case 'auth/operation-not-allowed':
        return (
          <span>
            Metode login ini belum diaktifkan di Firebase Console. <br />
            Silakan aktifkan <strong>"Email/Password"</strong> dan <strong>"Anonymous"</strong> di: <br />
            <a 
              href="https://console.firebase.google.com/project/gen-lang-client-0513651011/authentication/providers" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline text-rose-800 font-black"
            >
              Menu Authentication {'>'} Sign-in method
            </a>
          </span>
        );
      case 'auth/admin-restricted-operation':
        return 'Pendaftaran akun baru saat ini dibatasi oleh administrator di Firebase Console. Silakan hubungi admin arsipdepartemenppk@gmail.com untuk aktivasi atau gunakan akun yang sudah ada.';
      case 'auth/popup-closed-by-user':
        return 'Jendela login Google ditutup sebelum selesai.';
      case 'auth/cancelled-popup-request':
        return 'Permintaan popup dibatalkan.';
      default:
        if (message.includes('auth/email-already-in-use')) {
          return 'Email sudah terdaftar. Silakan masuk jika Anda sudah memiliki akun.';
        }
        if (message.includes('auth/invalid-credential')) {
          return 'Email atau kata sandi salah, atau akun terhubung dengan metode lain.';
        }
        return 'Terjadi kesalahan sistem. Silakan coba lagi atau hubungi administrator.';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (lockoutSeconds > 0) {
      setError(`Akses dibatasi sementara demi keamanan dari serangan brute-force. Silakan tunggu ${lockoutSeconds} detik.`);
      return;
    }

    if (!email || !password) {
      setError('Semua kolom harus diisi.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Format email tidak valid.');
      return;
    }
    if (!isLogin && !fullName) {
      setError('Nama lengkap harus diisi.');
      return;
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.');
      return;
    }

    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!isLogin && (!hasUpperCase || !hasNumber || !hasSpecialChar)) {
      setError('Kata sandi harus mengandung minimal 1 huruf besar, 1 angka, dan 1 karakter khusus.');
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        await logActivity(userCredential.user.uid, userCredential.user.email, 'LOGIN', 'Auth');
        
        // Log successful login to encrypted security audit trail
        await logSecurityAudit({
          action: 'LOGIN_SUCCESS',
          module: 'AUTH_SECURITY',
          status: 'SUCCESS',
          userEmail: userCredential.user.email,
          userId: userCredential.user.uid,
          reason: 'Pengguna berhasil login melalui otentikasi kata sandi.',
          metadata: { severity: 'LOW' }
        });

        // Reset failed attempts upon successful login
        setFailedAttempts(0);
        sessionStorage.removeItem('caruban_failed_logins');
        sessionStorage.removeItem('caruban_lockout_until');

        // Admin email whitelist check
        const isOfficialAdminEmail = 
          email === 'arsipdepartemenppk@gmail.com' ||
          email === 'arsipdepartemenpendidikan@gmail.com' ||
          email === 'syifaudina15@gmail.com';

        if (isOfficialAdminEmail && userCredential.user) {
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            role: 'admin',
            displayName: userCredential.user.displayName || 'Ahmad Syifaudin',
            poinSkill: 100
          }, { merge: true });
        }

        if (rememberMe) {
          localStorage.setItem('rememberedEmail', email);
        } else {
          localStorage.removeItem('rememberedEmail');
        }
        // Clean up legacy insecure password storage if present
        localStorage.removeItem(`_secret_p_${btoa(email)}`);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, { displayName: fullName });
        
        const isOfficialAdminEmail = 
          email === 'arsipdepartemenppk@gmail.com' ||
          email === 'arsipdepartemenpendidikan@gmail.com' ||
          email === 'syifaudina15@gmail.com';

        // Strict default: new accounts are 'user' unless from strict admin whitelist
        const assignedRole: Role = isOfficialAdminEmail ? 'admin' : 'user';

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: fullName,
          role: assignedRole,
          poinSkill: isOfficialAdminEmail ? 100 : 0,
          createdAt: new Date().toISOString()
        });
        await logActivity(user.uid, user.email, 'REGISTER', 'Auth');
        await logSecurityAudit({
          action: 'ACCOUNT_REGISTER',
          module: 'AUTH_SECURITY',
          status: 'SUCCESS',
          userEmail: user.email,
          userId: user.uid,
          reason: `Akun baru terdaftar dengan peran '${assignedRole}'.`,
          metadata: { severity: 'LOW' }
        });
      }

      // Register biometrics only if strictly supported and not yet registered
      if (biometricAvailable && !localStorage.getItem(`biometric_cid_${email}`)) {
        try {
          await registerBiometric(email);
        } catch {
          // ignore
        }
      }

      navigate('/');
    } catch (err: any) {
      if (err?.code !== 'auth/invalid-credential' && err?.code !== 'auth/user-not-found' && err?.code !== 'auth/wrong-password') {
        console.warn('Auth notice:', err?.code || err);
      }

      // Trigger progressive brute-force defense
      if (isLogin && (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found')) {
        const newCount = failedAttempts + 1;
        setFailedAttempts(newCount);
        sessionStorage.setItem('caruban_failed_logins', String(newCount));

        if (newCount >= 5) {
          const duration = newCount >= 10 ? 300 : 60;
          setLockoutSeconds(duration);
          sessionStorage.setItem('caruban_lockout_until', String(Date.now() + duration * 1000));
          
          await logSecurityAudit({
            action: 'BRUTE_FORCE_ATTACK_DETECTED',
            module: 'AUTH_SECURITY',
            status: 'BLOCKED',
            userEmail: email || 'unknown',
            reason: `Terdeteksi ${newCount}x percobaan login gagal berturut-turut. Sistem mengunci proses otentikasi selama ${duration} detik untuk melindungi akun.`,
            metadata: { severity: 'CRITICAL', duration, failedCount: newCount }
          });
        } else {
          await logSecurityAudit({
            action: 'FAILED_LOGIN_ATTEMPT',
            module: 'AUTH_SECURITY',
            status: 'FAILED',
            userEmail: email || 'unknown',
            reason: `Gagal otentikasi login (percobaan ke-${newCount}).`,
            metadata: { severity: 'MEDIUM', failedCount: newCount }
          });
        }
      }

      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const userCredential = await signInAnonymously(auth);
      
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        uid: userCredential.user.uid,
        email: 'tamu@carubandigital.com',
        displayName: 'Tamu',
        role: 'user',
        isAnonymous: true,
        createdAt: new Date().toISOString()
      }, { merge: true });
      await logActivity(userCredential.user.uid, 'Guest', 'GUEST_LOGIN', 'Auth');
      navigate('/');
    } catch (err: any) {
      console.warn('Guest login error:', err?.message || err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenBiometricModal = () => {
    const targetEmail = email || localStorage.getItem('rememberedEmail') || 'arsipdepartemenppk@gmail.com';
    setBiometricEmail(targetEmail);
    const hasCid = localStorage.getItem(`biometric_cid_${targetEmail.toLowerCase()}`);
    setBiometricStatus('');
    if (hasCid) {
      setBiometricStep('scanning');
      setShowBiometricModal(true);
      handleExecuteBiometricAuth(targetEmail);
    } else {
      setBiometricStep('enroll');
      setShowBiometricModal(true);
    }
  };

  const handleExecuteBiometricAuth = async (targetEmail: string) => {
    const cleanEmail = targetEmail.trim().toLowerCase();
    setBiometricStep('scanning');
    setBiometricStatus('Memverifikasi sensor biometrik (FaceID / Fingerprint)...');

    try {
      const result = await authenticateBiometric(cleanEmail);
      if (!result.success) {
        setBiometricStatus(result.message || 'Verifikasi biometrik tidak berhasil.');
        setBiometricStep('enroll');
        return;
      }

      setBiometricStatus('Biometrik terverifikasi! Menghubungkan sesi autentikasi...');
      
      // If user is already authenticated in Firebase, biometric confirms presence
      if (auth.currentUser && auth.currentUser.email?.toLowerCase() === cleanEmail) {
        await logActivity(auth.currentUser.uid, auth.currentUser.email, 'BIOMETRIC_VERIFIED', 'Auth');
        setBiometricStep('success');
        setTimeout(() => {
          setShowBiometricModal(false);
          navigate('/');
        }, 1000);
      } else {
        setBiometricStatus('Autentikasi biometrik berhasil. Masukkan kata sandi sekali untuk memulai sesi baru.');
        setBiometricStep('enroll');
      }
    } catch (err: any) {
      console.warn('Biometric execute error:', err);
      setBiometricStatus('Gagal autentikasi biometrik: ' + (err.message || 'Sensor ditolak'));
      setBiometricStep('enroll');
    }
  };

  const handleEnrollAndAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!biometricEmail || !biometricPassword) {
      setBiometricStatus('Email dan kata sandi wajib diisi.');
      return;
    }

    setBiometricStatus('Memverifikasi kredensial dan mendaftarkan biometrik...');
    try {
      const cleanEmail = biometricEmail.trim().toLowerCase();
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, biometricPassword);
      
      // Register biometrics with WebAuthn API (no passwords stored in localStorage!)
      await registerBiometric(cleanEmail, userCredential.user.displayName || 'Pengurus IPNU IPPNU');
      localStorage.setItem('rememberedEmail', cleanEmail);
      // Clean up any legacy secret password keys in localStorage
      localStorage.removeItem(`_secret_p_${btoa(cleanEmail)}`);
      await logActivity(userCredential.user.uid, userCredential.user.email, 'BIOMETRIC_ENROLLED', 'Auth');

      setBiometricStep('success');
      setBiometricStatus('Biometrik (FaceID / Fingerprint) berhasil didaftarkan dan diverifikasi!');
      setTimeout(() => {
        setShowBiometricModal(false);
        navigate('/');
      }, 1000);
    } catch (err: any) {
      console.error('Enroll error:', err);
      setBiometricStatus('Kata sandi salah atau akun tidak ditemukan: ' + (err.message || ''));
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;
      
      const isOfficialAdminEmail = 
        user.email === 'arsipdepartemenppk@gmail.com' ||
        user.email === 'arsipdepartemenpendidikan@gmail.com' ||
        user.email === 'syifaudina15@gmail.com';

      const assignedRole: Role = isOfficialAdminEmail ? 'admin' : 'user';

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || (isOfficialAdminEmail ? 'Ahmad Syifaudin' : 'Pengguna'),
        photoURL: user.photoURL,
        role: assignedRole,
        poinSkill: isOfficialAdminEmail ? 100 : 0,
        createdAt: new Date().toISOString()
      }, { merge: true });
      
      await logActivity(user.uid, user.email, 'GOOGLE_LOGIN', 'Auth');
      navigate('/');
    } catch (err: any) {
      console.warn('Google sign-in error:', err?.message || err);
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !validateEmail(forgotEmail)) {
      setForgotMessage('Masukkan email yang valid.');
      return;
    }
    setForgotLoading(true);
    setForgotMessage('');
    setForgotSuccess(false);
    try {
      await sendPasswordResetEmail(auth, forgotEmail);
      setForgotMessage('Email reset kata sandi telah dikirim!');
      setForgotSuccess(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setForgotMessage('');
        setForgotSuccess(false);
      }, 3000);
    } catch (err: any) {
      setForgotMessage(getFriendlyErrorMessage(err));
      setForgotSuccess(false);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-6 transition-colors duration-500 bg-[var(--bg-app)] text-[var(--text-main)]">
      <div className="absolute top-6 right-6 z-50">
        <button
          onClick={toggleTheme}
          className="p-3 rounded-2xl border transition-all active:scale-90 bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-muted)] hover:text-[var(--accent-primary)] shadow-sm"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="flex flex-col items-center justify-center gap-6">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="relative group"
            >
              <Logo size={120} className="relative z-10" />
            </motion.div>
            <div className="flex flex-col">
              <h1 className="text-4xl font-black tracking-tighter transition-colors text-[var(--text-main)] uppercase">
                CARUBAN<span className="text-[var(--accent-primary)]">CORE</span>
              </h1>
              <div className="flex items-center justify-center gap-2">
                <div className="h-[1px] w-8 bg-[var(--border-main)]" />
                <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.3em]">Digital Platform</p>
                <div className="h-[1px] w-8 bg-[var(--border-main)]" />
              </div>
            </div>
          </div>
        </div>

        <div className="backdrop-blur-xl border p-8 rounded-[40px] shadow-2xl transition-colors bg-[var(--bg-card)] border-[var(--border-main)]">
          <div className="flex p-1 rounded-2xl mb-8 transition-colors bg-[var(--bg-app)]">
            <button 
              onClick={() => { setIsLogin(true); setError(''); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                isLogin 
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' 
                  : 'text-[var(--text-muted)]'
              )}
            >
              Masuk
            </button>
            <button 
              onClick={() => { setIsLogin(false); setError(''); }}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all",
                !isLogin 
                  ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm' 
                  : 'text-[var(--text-muted)]'
              )}
            >
              Daftar
            </button>
          </div>

          {/* Cyber Attack Shield Status Indicator */}
          <div className="flex items-center justify-center gap-1.5 py-1 px-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider mb-3 w-fit mx-auto">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>Anti-DDoS & WAF Shield Aktif</span>
          </div>

          {/* Progressive Brute-Force Lockout Banner */}
          {lockoutSeconds > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 flex items-start gap-3 text-xs mb-4 shadow-sm"
            >
              <ShieldAlert size={20} className="shrink-0 mt-0.5 text-rose-500" />
              <div className="text-left space-y-1">
                <p className="font-black text-rose-700 dark:text-rose-300">Akses Masuk Dikunci Sementara</p>
                <p className="text-[11px] text-rose-600/90 dark:text-rose-400/90 leading-relaxed">
                  Terdeteksi aktivitas login anomali/berulang. Sistem secara otomatis menahan akses selama <strong>{lockoutSeconds} detik</strong> untuk mencegah serangan siber brute-force.
                </p>
              </div>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="relative"
                >
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input 
                    type="text" 
                    value={fullName} 
                    onChange={e => setFullName(e.target.value)} 
                    placeholder="Nama Lengkap" 
                    className="w-full border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-all bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-main)]" 
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="Alamat Email" 
                className="w-full border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-all bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-main)]" 
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="Kata Sandi" 
                className="w-full border rounded-2xl py-4 pl-12 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/20 focus:border-[var(--accent-primary)] transition-all bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-main)]" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-[var(--accent-primary)]"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {!isLogin && (
              <div className="px-4 py-2 bg-[var(--bg-app)] rounded-xl border border-[var(--border-main)]">
                <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                  <span className="font-bold text-[var(--accent-primary)] uppercase tracking-widest mr-1">Syarat:</span>
                  Minimal 8 karakter, 1 huruf besar, 1 angka, dan 1 karakter khusus.
                </p>
              </div>
            )}

            <div className="flex items-center justify-between px-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={cn(
                    "w-5 h-5 rounded-md border transition-all flex items-center justify-center",
                    rememberMe ? "bg-[var(--accent-primary)] border-[var(--accent-primary)]" : "bg-[var(--bg-card)] border-[var(--border-main)] group-hover:border-[var(--accent-primary)]"
                  )}>
                    {rememberMe && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </div>
                <span className="text-xs text-zinc-500 font-medium">Ingat Saya</span>
              </label>
              
              {isLogin && (
                <button 
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs text-[var(--accent-primary)] hover:opacity-80 font-bold"
                >
                  Lupa Kata Sandi?
                </button>
              )}
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3 text-rose-600 dark:text-rose-400 text-xs font-bold text-left bg-rose-50 dark:bg-rose-950/40 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 shadow-sm"
              >
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
                <div className="flex-1 leading-relaxed">{error}</div>
              </motion.div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-[var(--accent-primary)]/20 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Memproses...' : (isLogin ? 'Masuk Sekarang' : 'Daftar Akun')}
            </button>

            {isLogin && (
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border-main)]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--bg-card)] px-4 text-zinc-400 font-bold tracking-widest">Atau</span>
                </div>
              </div>
            )}

            {isLogin && (
              <button 
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full bg-white border border-zinc-200 text-zinc-700 py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3 mb-3"
              >
                <img src="https://www.gstatic.com/firebase/anonymous-scan.png" className="w-5 h-5 hidden" alt="" />
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.18 1-.78 1.85-1.63 2.42v2.01h2.64c1.55-1.42 2.43-3.5 2.43-5.93z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-2.64-2.01c-.73.48-1.66.76-2.64.76-2.85 0-5.27-1.92-6.13-4.51H2.18v2.06C3.99 20.24 7.71 23 12 23z" fill="#34A853" />
                  <path d="M5.87 14.58c-.23-.69-.35-1.43-.35-2.08s.13-1.39.35-2.08V8.36H2.18C1.43 9.85 1 11.39 1 12.5s.43 2.65 1.18 4.14l3.69-2.06z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.71 1 3.99 3.76 2.18 7.32l3.69 2.06c.86-2.59 3.28-4.51 6.13-4.51z" fill="#EA4335" />
                </svg>
                Masuk dengan Google
              </button>
            )}

            {isLogin && (
              <button 
                type="button"
                onClick={handleGuestLogin}
                disabled={loading}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-main)] hover:border-[var(--accent-primary)] text-[var(--text-main)] py-5 rounded-3xl font-black text-sm uppercase tracking-widest shadow-sm active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <LogIn size={20} className="text-[var(--accent-primary)]" />
                Masuk sebagai Tamu
              </button>
            )}

            {isLogin && (
              <button 
                type="button"
                onClick={handleOpenBiometricModal}
                disabled={loading}
                className="w-full bg-emerald-600/15 border-2 border-emerald-500/40 hover:bg-emerald-600/25 text-emerald-400 py-4 rounded-3xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/30 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <Fingerprint size={20} className="text-emerald-400 animate-pulse" />
                <span>Masuk dengan Biometrik (FaceID / Fingerprint)</span>
              </button>
            )}
          </form>
        </div>
        <p className="text-center mt-8 text-zinc-400 text-xs font-medium">
          &copy; 2026 Caruban Core Mobile. All rights reserved.
        </p>
      </div>

      {/* Biometric WebAuthn Modal */}
      <AnimatePresence>
        {showBiometricModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBiometricModal(false)}
              className="absolute inset-0 bg-black/85 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md border p-6 md:p-8 rounded-[36px] shadow-2xl transition-colors bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-main)] space-y-5"
            >
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-main)]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Fingerprint size={18} />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[var(--text-main)]">Autentikasi Biometrik</h3>
                    <p className="text-[10px] text-[var(--text-muted)]">Web Authentication API (FaceID / Fingerprint)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowBiometricModal(false)}
                  className="text-zinc-400 hover:text-[var(--text-main)] font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {biometricStep === 'scanning' && (
                <div className="py-6 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-center animate-pulse">
                      <Fingerprint size={48} className="text-emerald-400" />
                    </div>
                    <div className="absolute inset-0 rounded-full border-2 border-emerald-400 animate-ping opacity-30" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-white">Memindai Sensor Biometrik...</p>
                    <p className="text-xs text-zinc-400">
                      Gunakan FaceID, sensor sidik jari perangkat, atau platform authenticator.
                    </p>
                  </div>
                  {biometricStatus && (
                    <p className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                      {biometricStatus}
                    </p>
                  )}
                  <div className="pt-2 flex gap-2">
                    <button
                      onClick={() => handleExecuteBiometricAuth(biometricEmail)}
                      className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
                    >
                      Pindai Ulang
                    </button>
                    <button
                      onClick={() => setBiometricStep('enroll')}
                      className="px-4 py-2 rounded-xl bg-[var(--bg-app)] border border-[var(--border-main)] text-xs text-zinc-300 font-bold"
                    >
                      Daftar / Atur Sandi
                    </button>
                  </div>
                </div>
              )}

              {biometricStep === 'success' && (
                <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-bounce">
                    <CheckCircle2 size={42} />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-base font-black text-white">Autentikasi Berhasil!</h4>
                    <p className="text-xs text-zinc-400">Mengalihkan ke Dashboard Caruban Core...</p>
                  </div>
                </div>
              )}

              {biometricStep === 'enroll' && (
                <form onSubmit={handleEnrollAndAuth} className="space-y-4">
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-xs text-emerald-300 leading-relaxed">
                    <strong>Pendaftaran Cepat Biometrik:</strong> Masukkan email dan kata sandi akun Anda sekali untuk mendaftarkan FaceID/Fingerprint perangkat ini untuk tugas administratif.
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">Email Akun Admin / Pengguna</label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="email"
                        required
                        value={biometricEmail}
                        onChange={(e) => setBiometricEmail(e.target.value)}
                        placeholder="arsipdepartemenppk@gmail.com"
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    {/* Quick selection for Ahmad Syifaudin */}
                    <div className="flex gap-1.5 pt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setBiometricEmail('arsipdepartemenppk@gmail.com')}
                        className="text-[10px] bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-lg font-bold"
                      >
                        ⚡ Ahmad Syifaudin (PPK)
                      </button>
                      <button
                        type="button"
                        onClick={() => setBiometricEmail('syifaudina15@gmail.com')}
                        className="text-[10px] bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 px-2 py-0.5 rounded-lg font-bold"
                      >
                        ⚡ syifaudina15@gmail.com
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-zinc-400 block mb-1">Kata Sandi Akun</label>
                    <div className="relative">
                      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                      <input 
                        type="password"
                        required
                        value={biometricPassword}
                        onChange={(e) => setBiometricPassword(e.target.value)}
                        placeholder="Masukkan kata sandi..."
                        className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl pl-10 pr-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  {biometricStatus && (
                    <p className="text-xs text-rose-400 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 font-semibold">
                      {biometricStatus}
                    </p>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBiometricModal(false)}
                      className="px-4 py-2.5 rounded-xl bg-[var(--bg-app)] text-zinc-400 text-xs font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
                    >
                      <Fingerprint size={16} /> Aktifkan & Masuk
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowForgotModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm border p-8 rounded-[40px] shadow-2xl transition-colors bg-[var(--bg-card)] border-[var(--border-main)] text-[var(--text-main)]"
            >
              <button 
                onClick={() => setShowForgotModal(false)}
                className="absolute right-6 top-6 text-zinc-400 hover:text-[var(--text-main)]"
              >
                <X size={24} />
              </button>
              <h2 className="text-xl font-bold mb-2 transition-colors text-[var(--text-main)]">Reset Kata Sandi</h2>
              <p className="text-zinc-400 text-sm mb-6">Masukkan email Anda untuk menerima tautan reset kata sandi.</p>
              
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={20} />
                  <input 
                    required
                    type="email" 
                    value={forgotEmail} 
                    onChange={e => setForgotEmail(e.target.value)} 
                    placeholder="Email Anda" 
                    className="w-full border rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-[var(--accent-primary)] transition-all bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-main)]" 
                  />
                </div>
                {forgotMessage && (
                  <p className={`text-xs font-bold text-center py-2 rounded-lg ${forgotSuccess ? 'text-[var(--accent-primary)] bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20' : 'text-rose-600 bg-rose-50 border border-rose-100'}`}>
                    {forgotMessage}
                  </p>
                )}
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full bg-[var(--accent-primary)] hover:opacity-90 text-white py-4 rounded-2xl font-bold text-sm transition-all disabled:opacity-50"
                >
                  {forgotLoading ? 'Mengirim...' : 'Kirim Tautan'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
