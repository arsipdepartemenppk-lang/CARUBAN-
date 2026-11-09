import React, { useState, useEffect } from 'react';
import { ShieldAlert, KeyRound, Mail, Clock, CheckCircle2, ChevronRight, X, AlertTriangle, Sparkles } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { auth, db } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useToast } from './Toast';
import { logSecurityAudit } from '../utils/securityEncryption';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const HIGH_ACCESS_ROLES = ['admin', 'developer', 'PC', 'PAC'];
const ROTATION_THRESHOLD_DAYS = 90;

export const PasswordRotationReminder: React.FC = () => {
  const { user, userData, role } = useFirebase();
  const { showToast } = useToast();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [showTips, setShowTips] = useState(false);

  // Check if role is high privilege
  const isHighAccess = role && HIGH_ACCESS_ROLES.includes(role);

  // Calculate days since last password change
  const calculateDaysSinceChange = (): { days: number; isOverdue: boolean; lastChangedDate: Date | null } => {
    if (!userData) return { days: 0, isOverdue: false, lastChangedDate: null };

    const dateStr = userData.passwordLastChanged || userData.createdAt;
    if (!dateStr) {
      // If neither exists, assume overdue to encourage baseline security
      return { days: 120, isOverdue: true, lastChangedDate: null };
    }

    const lastDate = new Date(dateStr);
    const diffTime = Math.abs(Date.now() - lastDate.getTime());
    const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return {
      days,
      isOverdue: days >= ROTATION_THRESHOLD_DAYS,
      lastChangedDate: lastDate
    };
  };

  const { days, isOverdue, lastChangedDate } = calculateDaysSinceChange();

  // Check snooze status from sessionStorage
  useEffect(() => {
    if (user?.uid) {
      const snoozeUntil = localStorage.getItem(`pw_snooze_${user.uid}`);
      if (snoozeUntil && Number(snoozeUntil) > Date.now()) {
        setIsDismissed(true);
      }
    }
  }, [user]);

  if (!user || !isHighAccess || !isOverdue || isDismissed) {
    return null;
  }

  const handleSnooze = () => {
    if (user?.uid) {
      // Snooze for 3 days
      const snoozeTime = Date.now() + 3 * 24 * 60 * 60 * 1000;
      localStorage.setItem(`pw_snooze_${user.uid}`, snoozeTime.toString());
    }
    setIsDismissed(true);
    showToast('Pengingat ditunda selama 3 hari.', 'info');
  };

  const handleSendResetEmail = async () => {
    if (!user.email) {
      showToast('Email akun tidak ditemukan.', 'error');
      return;
    }

    setIsSendingEmail(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setEmailSent(true);
      showToast(`Link reset password terkirim ke ${user.email}. Silakan cek kotak masuk/spam Anda.`, 'success');

      // Log this security audit event
      await logSecurityAudit({
        userId: user.uid,
        userEmail: user.email,
        action: 'PASSWORD_ROTATION_EMAIL_REQUESTED',
        module: 'SecurityHealth',
        status: 'SUCCESS',
        role: role || 'user',
        reason: `Permintaan rotasi password berkala akun tingkat tinggi (${days} hari sejak ganti terakhir)`
      });
    } catch (err: any) {
      console.error('Failed to send password reset email:', err);
      showToast('Gagal mengirim link reset password: ' + (err.message || 'Coba lagi nanti'), 'error');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleMarkAsUpdated = async () => {
    if (!user?.uid) return;
    try {
      const nowStr = new Date().toISOString();
      await updateDoc(doc(db, 'users', user.uid), {
        passwordLastChanged: nowStr,
        updatedAt: nowStr
      });

      await logSecurityAudit({
        userId: user.uid,
        userEmail: user.email,
        action: 'PASSWORD_ROTATION_CONFIRMED',
        module: 'SecurityHealth',
        status: 'SUCCESS',
        role: role || 'user',
        reason: 'Pengguna mengonfirmasi pembaruan kata sandi berkala'
      });

      showToast('Status keamanan akun berhasil diperbarui! Terima kasih telah menjaga keamanan data cabang.', 'success');
      setIsDismissed(true);
    } catch (err: any) {
      console.error('Failed to update password timestamp:', err);
      showToast('Gagal memperbarui status: ' + err.message, 'error');
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -16 }}
        className="mb-6 rounded-3xl border-2 border-amber-500/40 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-[var(--bg-card)] p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md"
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg shadow-amber-500/10">
              <ShieldAlert size={26} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500 text-black">
                  Protokol Keamanan Tingkat Tinggi
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Role: {role}
                </span>
                <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  <Clock size={12} /> Terakhir ganti: {lastChangedDate ? `${days} hari lalu` : 'Belum pernah dicatat'}
                </span>
              </div>

              <h3 className="text-base md:text-lg font-black text-white tracking-tight flex items-center gap-2">
                Pengingat Rotasi Password Berkala (Maksimal 90 Hari)
              </h3>
              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed max-w-2xl">
                Sebagai pemegang hak akses strategis ({role}), akun Anda memiliki wewenang mengelola data organisasi sensitif. Untuk mencegah akses tidak sah dan kebocoran kredensial, disarankan mengganti kata sandi secara rutin.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0 justify-end">
            <button
              onClick={handleSendResetEmail}
              disabled={isSendingEmail || emailSent}
              className={cn(
                "px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-2 active:scale-95",
                emailSent 
                  ? "bg-emerald-600 text-white cursor-default" 
                  : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20"
              )}
            >
              {emailSent ? (
                <>
                  <CheckCircle2 size={15} /> Link Terkirim ke Email
                </>
              ) : isSendingEmail ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" /> Mengirim...
                </>
              ) : (
                <>
                  <KeyRound size={15} /> Kirim Link Ganti Password
                </>
              )}
            </button>

            <button
              onClick={handleMarkAsUpdated}
              className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 active:scale-95"
              title="Konfirmasi bahwa Anda sudah mengganti password"
            >
              Sudah Ganti
            </button>

            <button
              onClick={() => setShowTips(!showTips)}
              className="px-3 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30 transition-all"
            >
              Panduan
            </button>

            <button
              onClick={handleSnooze}
              className="p-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              title="Tunda peringatan selama 3 hari"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Expandable Password Hardening Tips */}
        {showTips && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 pt-4 border-t border-amber-500/20 text-xs text-zinc-300 grid grid-cols-1 md:grid-cols-3 gap-3"
          >
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-amber-400 block flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Panjang Karakter Kuat
              </span>
              <p className="text-[11px] text-zinc-400">
                Gunakan minimal 10-14 karakter acak yang memadukan huruf kapital, huruf kecil, angka, dan karakter simbol.
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-amber-400 block flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Hindari Pola Umum
              </span>
              <p className="text-[11px] text-zinc-400">
                Jangan gunakan nama pimpinan, nama sekolah, tanggal lahir, atau kata-kata umum seperti "cirebon123" atau "ipnu2026".
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-black/30 border border-white/5 space-y-1">
              <span className="font-bold text-amber-400 block flex items-center gap-1.5">
                <CheckCircle2 size={13} /> Jangan Pakai Ulang
              </span>
              <p className="text-[11px] text-zinc-400">
                Pastikan kata sandi sistem Caruban Core berbeda dari akun media sosial atau email pribadi Anda.
              </p>
            </div>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
