import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Users, Search, Filter, Shield, Key, 
  Trash2, Edit2, CheckCircle2, XCircle, AlertCircle, RefreshCw,
  Sparkles, UserCheck, Lock, Unlock, Mail, Star, Award,
  ShieldAlert, Activity, FileLock2, KeyRound
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, updateDoc, doc, deleteDoc, setDoc, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useFirebase } from '../components/FirebaseProvider';
import { useToast } from '../components/Toast';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SecurityHealthCheck } from '../components/SecurityHealthCheck';
import { Role } from '../types';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface AppUserPermissions {
  canManageMembers?: boolean;
  canManageLetters?: boolean;
  canManageAttendance?: boolean;
  canManageCore?: boolean;
  canManageUsers?: boolean;
  canAccessFinancials?: boolean;
}

export interface AppUser {
  id: string;
  email?: string;
  displayName?: string;
  role: Role;
  photoURL?: string;
  poinSkill?: number;
  statusPimpinan?: string;
  permissions?: AppUserPermissions;
  isAdminSpecial?: boolean;
  passwordLastChanged?: string;
  createdAt?: string;
  updatedAt?: string;
}

export const AdminUserManagement: React.FC = () => {
  const { user: currentUser, role: currentRole } = useFirebase();
  const { showToast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('Semua');
  const [activeTab, setActiveTab] = useState<'users' | 'security'>('users');

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [newRole, setNewRole] = useState<Role>('user');
  const [permissions, setPermissions] = useState<AppUserPermissions>({
    canManageMembers: true,
    canManageLetters: true,
    canManageAttendance: true,
    canManageCore: true,
    canManageUsers: false,
    canAccessFinancials: false
  });
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick Promote Ahmad Syifaudin State
  const [syifaudinEmailInput, setSyifaudinEmailInput] = useState('arsipdepartemenppk@gmail.com');
  const [isPromotingSyifaudin, setIsPromotingSyifaudin] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser));
      setUsers(data);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching users:', err);
      showToast('Gagal memuat pengguna', 'error');
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const isSyifaudinAccount = (u: AppUser) => {
    const email = (u.email || '').toLowerCase().trim();
    return (
      email === 'arsipdepartemenppk@gmail.com' ||
      email === 'arsipdepartemenpendidikan@gmail.com' ||
      email === 'syifaudina15@gmail.com'
    );
  };

  const syifaudinUser = users.find(isSyifaudinAccount);

  const handleQuickPromoteSyifaudin = async (targetEmail?: string) => {
    const emailToUse = (targetEmail || syifaudinEmailInput || 'arsipdepartemenppk@gmail.com').trim().toLowerCase();
    setIsPromotingSyifaudin(true);

    try {
      // 1. Check if user document already exists
      const existing = users.find(u => (u.email || '').toLowerCase() === emailToUse || isSyifaudinAccount(u));

      const adminPermissions: AppUserPermissions = {
        canManageMembers: true,
        canManageLetters: true,
        canManageAttendance: true,
        canManageCore: true,
        canManageUsers: true,
        canAccessFinancials: true
      };

      if (existing) {
        await updateDoc(doc(db, 'users', existing.id), {
          role: 'admin',
          displayName: existing.displayName || 'Ahmad Syifaudin',
          permissions: adminPermissions,
          isAdminSpecial: true,
          poinSkill: (existing.poinSkill || 0) < 100 ? 100 : existing.poinSkill,
          updatedAt: new Date().toISOString()
        });
        showToast(`Akun Ahmad Syifaudin (${existing.email || existing.displayName}) berhasil ditetapkan sebagai Admin Utama!`, 'success');
      } else {
        // Create new designated admin record
        const newId = `admin-syifaudin-${Date.now()}`;
        await setDoc(doc(db, 'users', newId), {
          uid: newId,
          email: emailToUse,
          displayName: 'Ahmad Syifaudin',
          role: 'admin',
          permissions: adminPermissions,
          isAdminSpecial: true,
          poinSkill: 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        showToast(`Profil Administrator untuk Ahmad Syifaudin (${emailToUse}) berhasil dibuat & diotorisasi!`, 'success');
      }
    } catch (err: any) {
      console.error('Failed to promote Ahmad Syifaudin:', err);
      showToast('Gagal menetapkan peran admin: ' + err.message, 'error');
    } finally {
      setIsPromotingSyifaudin(false);
    }
  };

  const handleOpenRoleModal = (u: AppUser) => {
    setSelectedUser(u);
    setNewRole(u.role || 'user');
    setPermissions(u.permissions || {
      canManageMembers: u.role === 'admin' || u.role === 'PC' || u.role === 'PK',
      canManageLetters: u.role === 'admin' || u.role === 'PC' || u.role === 'PK',
      canManageAttendance: u.role === 'admin' || u.role === 'PC' || u.role === 'PK',
      canManageCore: u.role === 'admin' || u.role === 'PC',
      canManageUsers: u.role === 'admin',
      canAccessFinancials: u.role === 'admin'
    });
    setIsRoleModalOpen(true);
  };

  const handleUpdateRole = async () => {
    if (!selectedUser) return;
    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        role: newRole,
        permissions: newRole === 'admin' 
          ? {
              canManageMembers: true,
              canManageLetters: true,
              canManageAttendance: true,
              canManageCore: true,
              canManageUsers: true,
              canAccessFinancials: true
            }
          : permissions,
        updatedAt: new Date().toISOString()
      });
      showToast(`Peran pengguna berhasil diubah menjadi ${newRole}`, 'success');
      setIsRoleModalOpen(false);
    } catch (err: any) {
      showToast('Gagal mengubah peran: ' + err.message, 'error');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteDoc(doc(db, 'users', deleteConfirmId));
      showToast('Pengguna telah dihapus dari sistem', 'success');
      setDeleteConfirmId(null);
    } catch (err: any) {
      showToast('Gagal menghapus: ' + err.message, 'error');
    }
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = (u.displayName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'Semua' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--border-main)] pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
              Panel Pengelola
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400">
              Manajemen Hak Akses & RBAC
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-[var(--text-main)] flex items-center gap-3">
            <ShieldCheck className="text-red-400" />
            Manajemen Hak Akses Admin
          </h1>
          <p className="text-sm text-[var(--text-muted)]">
            Otorisasi tingkat tinggi, kontrol peran pengguna sistem, dan pengaturan izin khusus pengurus cabang.
          </p>
        </div>
      </div>

      {/* Primary Navigation Tabs: User Management vs Security Health Check */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[var(--border-main)] pb-4">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 active:scale-95",
            activeTab === 'users'
              ? "bg-red-600 text-white shadow-lg shadow-red-600/25"
              : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
          )}
        >
          <Users size={16} />
          <span>Manajemen Pengguna & Hak Akses</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-black/20">
            {users.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={cn(
            "px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 active:scale-95",
            activeTab === 'security'
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/25"
              : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
          )}
        >
          <ShieldAlert size={16} />
          <span>Security Health Check & Audit Enkripsi</span>
          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            AES-256 + HMAC
          </span>
        </button>
      </div>

      {activeTab === 'users' ? (
        <div className="space-y-6">
          {/* SPECIAL MODULE: Dedicated Ahmad Syifaudin Admin Assignment */}
          <div className="bg-gradient-to-r from-red-950/40 via-red-900/20 to-[var(--bg-card)] border-2 border-red-500/40 rounded-3xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-red-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-[10px] font-black uppercase tracking-widest">
              <Star size={12} className="fill-current" /> Modul Otorisasi Khusus
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-2">
              Jadikan Ahmad Syifaudin sebagai Administrator
            </h2>
            <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
              Modul ini memungkinkan Anda memberikan peran <strong>Administrator Penuh</strong> secara spesifik kepada akun <strong>Ahmad Syifaudin</strong> dengan seluruh hak akses (Master Data, Persuratan, Presensi Lokasi, Visitasi, Keuangan, dan Pengaturan Sistem).
            </p>

            {syifaudinUser ? (
              <div className="flex items-center gap-3 pt-2">
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 size={15} />
                  Akun Ditemukan: {syifaudinUser.displayName || 'Ahmad Syifaudin'} ({syifaudinUser.email || syifaudinUser.id})
                </div>
                <span className="px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-red-600 text-white">
                  Peran Saat Ini: {syifaudinUser.role}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 pt-2 text-xs text-amber-300 font-semibold">
                <AlertCircle size={15} />
                Belum terdaftar sebagai dokumen pengguna aktif. Anda dapat mendaftarkan/menetapkan emailnya langsung di bawah ini.
              </div>
            )}
          </div>

          <div className="bg-[var(--bg-card)]/90 backdrop-blur-md p-4 rounded-2xl border border-red-500/30 w-full lg:w-96 space-y-3">
            <label className="text-xs font-black uppercase tracking-wider text-red-300 block">
              Email Akun Ahmad Syifaudin
            </label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="email"
                value={syifaudinEmailInput}
                onChange={(e) => setSyifaudinEmailInput(e.target.value)}
                placeholder="arsipdepartemenppk@gmail.com"
                className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl pl-10 pr-3 py-2 text-xs text-[var(--text-main)] font-mono focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
            <button
              onClick={() => handleQuickPromoteSyifaudin(syifaudinEmailInput)}
              disabled={isPromotingSyifaudin}
              className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPromotingSyifaudin ? (
                <>
                  <RefreshCw size={14} className="animate-spin" /> Menetapkan Peran...
                </>
              ) : (
                <>
                  <ShieldCheck size={16} /> Berikan Hak Akses Admin
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-[var(--bg-card)] p-4 rounded-3xl border border-[var(--border-main)] shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-96">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Cari nama atau email pengguna..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-red-500/50"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none w-full md:w-auto">
          {['Semua', 'admin', 'developer', 'PC', 'PAC', 'PK', 'PR', 'Pengurus', 'Anggota', 'user'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all uppercase whitespace-nowrap",
                roleFilter === r
                  ? "bg-red-600 text-white"
                  : "bg-[var(--bg-app)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-main)]"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[var(--bg-card)] rounded-3xl border border-[var(--border-main)] shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[var(--border-main)] bg-[var(--bg-app)]/50 text-[11px] uppercase tracking-wider text-[var(--text-muted)] font-black">
                <th className="py-4 px-6">Pengguna</th>
                <th className="py-4 px-6">Email Akun</th>
                <th className="py-4 px-6">Peran (Role)</th>
                <th className="py-4 px-6">Hak Akses Modul</th>
                <th className="py-4 px-6">Poin Skill</th>
                <th className="py-4 px-6 text-right">Kelola</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-main)] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    <div className="w-8 h-8 border-3 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Memuat daftar pengguna...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[var(--text-muted)]">
                    Tidak ada akun pengguna yang sesuai kriteria pencarian.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isSyifaudin = isSyifaudinAccount(u);
                  return (
                    <tr 
                      key={u.id} 
                      className={cn(
                        "transition-colors group",
                        isSyifaudin ? "bg-red-500/5 hover:bg-red-500/10" : "hover:bg-[var(--bg-app)]/40"
                      )}
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center font-black",
                            isSyifaudin 
                              ? "bg-red-600 text-white shadow-md shadow-red-600/30" 
                              : "bg-red-500/10 border border-red-500/20 text-red-400"
                          )}>
                            {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-[var(--text-main)] text-sm">
                                {u.displayName || 'Pengguna Tanpa Nama'}
                              </p>
                              {isSyifaudin && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 shadow-sm">
                                  <Star size={10} className="fill-current" /> Ahmad Syifaudin
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-[var(--text-muted)] font-mono">{u.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6 font-mono text-xs text-[var(--text-main)]">
                        {u.email || '-'}
                      </td>

                      <td className="py-4 px-6">
                        <span className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
                          u.role === 'admin' || u.role === 'developer' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          u.role === 'PC' ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" :
                          u.role === 'PAC' ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          u.role === 'PK' ? "bg-teal-500/10 text-teal-400 border border-teal-500/20" :
                          u.role === 'PR' ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" :
                          u.role === 'Pengurus' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                          "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20"
                        )}>
                          <Shield size={11} />
                          {u.role || 'user'}
                        </span>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {u.role === 'admin' ? (
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-300">
                              Akses Penuh Semua Modul
                            </span>
                          ) : (
                            <>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold",
                                u.permissions?.canManageMembers ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"
                              )}>
                                Anggota
                              </span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold",
                                u.permissions?.canManageLetters ? "bg-indigo-500/20 text-indigo-300" : "bg-zinc-800 text-zinc-500"
                              )}>
                                Surat
                              </span>
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] font-bold",
                                u.permissions?.canManageAttendance ? "bg-teal-500/20 text-teal-300" : "bg-zinc-800 text-zinc-500"
                              )}>
                                Presensi
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 font-bold text-amber-400">
                        {u.poinSkill || 0} Poin
                      </td>

                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isSyifaudin && u.role !== 'admin' && (
                            <button
                              onClick={() => handleQuickPromoteSyifaudin(u.email)}
                              className="px-2.5 py-1.5 rounded-xl bg-red-600 text-white font-black text-xs flex items-center gap-1 shadow-sm hover:bg-red-500"
                              title="Jadikan Admin Sekarang"
                            >
                              <ShieldCheck size={13} /> Jadikan Admin
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenRoleModal(u)}
                            className="px-3 py-1.5 rounded-xl bg-[var(--bg-app)] hover:bg-red-500/20 text-red-400 font-bold text-xs flex items-center gap-1 transition-colors"
                          >
                            <Key size={13} /> Kelola Izin
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(u.id)}
                            className="p-1.5 rounded-xl bg-[var(--bg-app)] hover:bg-rose-500/20 text-rose-400 transition-colors"
                            title="Hapus Akun"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : (
    <SecurityHealthCheck users={users} currentUser={currentUser} currentRole={currentRole} />
  )}

  {/* Role & Permissions Change Modal */}
      <AnimatePresence>
        {isRoleModalOpen && selectedUser && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-[var(--border-main)]">
                <h3 className="font-black text-base text-[var(--text-main)] flex items-center gap-2">
                  <Key size={18} className="text-red-400" />
                  Ubah Hak Akses & Peran Pengguna
                </h3>
                <button onClick={() => setIsRoleModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold">
                  ✕
                </button>
              </div>

              <div className="bg-[var(--bg-app)] p-3 rounded-2xl border border-[var(--border-main)] space-y-1">
                <p className="text-[11px] text-[var(--text-muted)]">Pengguna Target:</p>
                <p className="font-black text-sm text-[var(--text-main)]">{selectedUser.displayName || selectedUser.email}</p>
                <p className="text-[10px] text-zinc-400 font-mono">{selectedUser.email || selectedUser.id}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-[var(--text-muted)] block mb-1.5">Pilih Tingkat Peran (Role)</label>
                <select
                  value={newRole}
                  onChange={(e) => {
                    const r = e.target.value as Role;
                    setNewRole(r);
                    if (r === 'admin') {
                      setPermissions({
                        canManageMembers: true,
                        canManageLetters: true,
                        canManageAttendance: true,
                        canManageCore: true,
                        canManageUsers: true,
                        canAccessFinancials: true
                      });
                    }
                  }}
                  className="w-full bg-[var(--bg-app)] border border-[var(--border-main)] rounded-xl p-3 text-xs text-[var(--text-main)] font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="admin">Administrator Penuh (Semua Hak Akses)</option>
                  <option value="developer">Developer Sistem</option>
                  <option value="PC">PC (Pimpinan Cabang)</option>
                  <option value="PAC">PAC (Pimpinan Anak Cabang)</option>
                  <option value="PK">PK (Pimpinan Komisariat)</option>
                  <option value="PR">PR (Pimpinan Ranting)</option>
                  <option value="Pengurus">Pengurus / Koordinator</option>
                  <option value="Anggota">Anggota Terdaftar</option>
                  <option value="user">User / Tamu Umum</option>
                </select>
              </div>

              {/* Granular Permissions Matrix */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-[var(--text-muted)] block">
                  Matriks Hak Akses Modul Khusus:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'canManageMembers', label: 'Kelola Data Anggota' },
                    { key: 'canManageLetters', label: 'Kelola Persuratan (Masuk/Keluar)' },
                    { key: 'canManageAttendance', label: 'Kelola Presensi & Geofence' },
                    { key: 'canManageCore', label: 'Akses Modul & Leaderboard CORE' },
                    { key: 'canManageUsers', label: 'Kelola Pengguna & Peran' },
                    { key: 'canAccessFinancials', label: 'Akses Keuangan & Kas' },
                  ].map(({ key, label }) => (
                    <label 
                      key={key} 
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition-all",
                        (permissions as any)[key] || newRole === 'admin'
                          ? "bg-red-500/10 border-red-500/30 text-[var(--text-main)]"
                          : "bg-[var(--bg-app)] border-[var(--border-main)] text-[var(--text-muted)]"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={newRole === 'admin' ? true : !!(permissions as any)[key]}
                        disabled={newRole === 'admin'}
                        onChange={(e) => {
                          setPermissions(prev => ({
                            ...prev,
                            [key]: e.target.checked
                          }));
                        }}
                        className="rounded accent-red-600"
                      />
                      <span className="font-semibold text-[11px]">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border-main)]">
                <button
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-app)] text-[var(--text-muted)] text-xs font-bold hover:text-[var(--text-main)]"
                >
                  Batal
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-md shadow-red-600/20 active:scale-95 transition-all"
                >
                  Simpan Perubahan Hak Akses
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!deleteConfirmId}
        title="Hapus Pengguna"
        message="Yakin ingin menghapus dokumen pengguna ini?"
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteConfirmId(null)}
      />
    </div>
  );
};

export default AdminUserManagement;
