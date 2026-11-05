import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { CheckCircle2, XCircle, FileText, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

const VerifySurat: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [isVerifying, setIsVerifying] = useState(true);
  const [suratData, setSuratData] = useState<any>(null);

  useEffect(() => {
    const verifyDocument = async () => {
      if (!id) return;
      
      try {
        const originalNomor = id.replace(/-/g, '/');
        const q = query(collection(db, 'agendas'), where('nomorSurat', '==', originalNomor));
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          setSuratData(snapshot.docs[0].data());
        } else {
          setSuratData(null);
        }
      } catch (error) {
        console.error('Error verifying document:', error);
        setSuratData(null);
      } finally {
        setIsVerifying(false);
      }
    };
    verifyDocument();
  }, [id]);

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col items-center justify-center p-4 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-[var(--bg-card)] border border-[var(--border-main)] rounded-[32px] p-8 shadow-2xl"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[var(--bg-app)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-zinc-400" />
          </div>
          <h1 className="text-2xl font-black tracking-tighter">Verifikasi Surat</h1>
          <p className="text-zinc-500 text-sm font-medium mt-2">Sistem Validasi Dokumen Digital</p>
        </div>

        {isVerifying ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 size={48} className="text-[var(--accent-primary)] animate-spin mb-4" />
            <p className="text-zinc-400 font-bold uppercase tracking-widest text-xs">Memverifikasi...</p>
          </div>
        ) : suratData ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-2xl p-6 flex flex-col items-center text-center">
              <CheckCircle2 size={48} className="text-[var(--accent-primary)] mb-4" />
              <h2 className="text-xl font-black text-[var(--accent-primary)]">DOKUMEN VALID</h2>
              <p className="text-[var(--accent-primary)]/80 text-xs font-bold uppercase tracking-widest mt-1">Tercatat di Sistem</p>
            </div>

            <div className="space-y-4 bg-[var(--bg-app)] rounded-2xl p-6 border border-[var(--border-main)]">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Nomor Surat</p>
                <p className="font-bold">{suratData.nomorSurat}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Perihal</p>
                <p className="font-bold">{suratData.perihal}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tujuan</p>
                <p className="font-bold">{suratData.tujuan}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tanggal Dikeluarkan</p>
                <p className="font-bold">
                  {new Date(suratData.tanggal).toLocaleDateString('id-ID', { 
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-8 flex flex-col items-center text-center"
          >
            <XCircle size={48} className="text-rose-500 mb-4" />
            <h2 className="text-xl font-black text-rose-500">DOKUMEN TIDAK DITEMUKAN</h2>
            <p className="text-rose-500/80 text-xs font-bold uppercase tracking-widest mt-2">
              Surat ini mungkin palsu atau belum tercatat di sistem.
            </p>
          </motion.div>
        )}

        <div className="mt-8">
          <Link 
            to="/"
            className="flex items-center justify-center gap-2 w-full py-4 bg-[var(--bg-card)] hover:opacity-80 text-[var(--text-main)] rounded-2xl font-black text-sm transition-colors border border-[var(--border-main)]"
          >
            <ArrowLeft size={16} />
            KEMBALI KE BERANDA
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default VerifySurat;
