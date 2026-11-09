import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useFirebase } from './FirebaseProvider';
import { Role } from '../types';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  allowedRoles 
}) => {
  const { user, role, loading } = useFirebase();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 text-center gap-3">
        <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-zinc-400 tracking-wider uppercase">Memverifikasi Hak Akses...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = role || 'user';
    const hasPermission = allowedRoles.includes(userRole);

    if (!hasPermission) {
      return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center shadow-lg shadow-rose-950/20">
            <ShieldAlert size={36} />
          </div>
          
          <div className="space-y-1">
            <h2 className="text-xl font-black text-[var(--text-main)]">Akses Terbatas</h2>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              Halaman ini dikhususkan untuk tingkat peran{' '}
              <strong className="text-rose-400 font-bold uppercase">{allowedRoles.join(' / ')}</strong>.
              Peran akun Anda saat ini adalah <span className="font-bold text-[var(--text-main)] font-mono">{userRole}</span>.
            </p>
          </div>

          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-900/30"
            >
              <ArrowLeft size={14} /> Kembali ke Beranda
            </Link>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
