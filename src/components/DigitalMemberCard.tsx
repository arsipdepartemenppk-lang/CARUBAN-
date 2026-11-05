import React, { useState } from 'react';
import QRCode from 'react-qr-code';
import { motion } from 'framer-motion';
import { Shield, MapPin, User, CheckCircle2, Maximize2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { MemberQRModal } from './MemberQRModal';

interface DigitalMemberCardProps {
  userId: string;
  userName: string;
  userRole: string;
  photoURL?: string | null;
  organization?: string;
}

export const DigitalMemberCard: React.FC<DigitalMemberCardProps> = ({
  userId,
  userName,
  userRole,
  photoURL,
  organization = 'IPNU IPPNU KABUPATEN CIREBON'
}) => {
  const [showQRModal, setShowQRModal] = useState(false);
  const qrValue = userId.startsWith('IPNU:') ? userId : `IPNU:${userId}:${userName}`;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative w-full max-w-sm mx-auto aspect-[1.6/1] rounded-[32px] overflow-hidden shadow-2xl group"
    >
      {/* Background with patterns */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-zinc-950">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-from)_0%,_transparent_70%)]" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      </div>

      <div className="relative h-full p-6 flex flex-col justify-between">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 shadow-lg">
              <Logo size={32} />
            </div>
            <div>
              <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Official Digital ID</h3>
              <p className="text-[8px] font-bold text-white/60 uppercase tracking-[0.2em] mt-1">{organization}</p>
            </div>
          </div>
          <div className="px-2 py-1 bg-white/10 backdrop-blur-md rounded-lg border border-white/10">
            <CheckCircle2 size={12} className="text-emerald-400" />
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-4 items-end mt-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-black text-white truncate leading-tight uppercase tracking-tight">{userName}</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="px-2 py-0.5 bg-emerald-500 text-white text-[8px] font-black rounded uppercase tracking-widest">
                {userRole}
              </div>
              <span className="text-[8px] font-bold text-white/40 uppercase tracking-widest">Verified Member</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-white/60">
              <Shield size={12} />
              <span className="text-[8px] font-medium tracking-widest uppercase">ID: {userId.slice(0, 12).toUpperCase()}</span>
            </div>
          </div>

          <div 
            onClick={() => setShowQRModal(true)}
            className="bg-white p-2 rounded-2xl shadow-xl cursor-pointer hover:scale-105 transition-transform group/qr relative shrink-0"
            title="Klik untuk memperbesar QR Code KTA"
          >
            <QRCode
              size={80}
              value={qrValue}
              viewBox={`0 0 256 256`}
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
            <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold">
              <Maximize2 size={12} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
          <div className="flex items-center gap-1.5 text-white/40">
            <MapPin size={10} />
            <span className="text-[8px] font-black uppercase tracking-widest">Kabupaten Cirebon</span>
          </div>
          <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">
            Caruban Core Engine
          </div>
        </div>
      </div>

      {/* Glossy Overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />

      {/* Modal QR Member */}
      <MemberQRModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        member={{
          namaLengkap: userName,
          nomorIndukAnggota: userId,
          statusPimpinan: userRole
        }}
      />
    </motion.div>
  );
};
