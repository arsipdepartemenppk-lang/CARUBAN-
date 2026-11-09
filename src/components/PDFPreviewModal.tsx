import React from 'react';
import { X, Printer, Download, Eye, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

interface PDFPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPrint: () => void;
  organisasi: 'IPNU' | 'IPPNU' | 'BERSAMA';
  letterContentRef: React.RefObject<HTMLDivElement>;
  letterTitle?: string;
  letterNumber?: string;
  isAuthorityViolated?: boolean;
}

export const PDFPreviewModal: React.FC<PDFPreviewModalProps> = ({
  isOpen,
  onClose,
  onPrint,
  organisasi,
  letterContentRef,
  letterTitle = 'Surat Resmi',
  letterNumber = '',
  isAuthorityViolated = false
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-4xl bg-[var(--bg-card)] border border-[var(--border-main)] rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[92vh]"
        >
          {/* Modal Header */}
          <div className="p-4 bg-[var(--bg-app)] border-b border-[var(--border-main)] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Eye size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-[var(--text-main)]">
                    Pratinjau Cetak / PDF Resmi (A4)
                  </h3>
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Standar PP {organisasi}
                  </span>
                </div>
                {letterNumber && (
                  <p className="font-mono text-xs text-zinc-400 truncate max-w-md mt-0.5">
                    {letterNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrint}
                disabled={isAuthorityViolated}
                className={
                  isAuthorityViolated
                    ? "px-4 py-2 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 font-bold text-xs flex items-center gap-1.5 cursor-not-allowed opacity-80"
                    : "px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition-all active:scale-95"
                }
              >
                <Printer size={15} /> {isAuthorityViolated ? 'Penerbitan Diblokir' : 'Cetak / Unduh PDF'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Sheet Preview Container */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-zinc-950 flex justify-center custom-scrollbar">
            <div 
              className={cn(
                "w-full max-w-[760px] bg-white text-black p-8 sm:p-12 shadow-2xl rounded-lg min-h-[960px] border border-gray-300",
                organisasi === 'IPPNU' ? "font-serif" : "font-sans"
              )}
              style={{
                fontFamily: organisasi === 'IPPNU' 
                  ? "'Times New Roman', Times, serif" 
                  : 'Arial, Helvetica, sans-serif'
              }}
            >
              {letterContentRef.current ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: letterContentRef.current.innerHTML }} 
                  className="preview-sheet-rendered"
                />
              ) : (
                <div className="text-center py-20 text-gray-400 text-sm">
                  Sedang memuat pratinjau dokumen...
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer Info */}
          <div className="p-3 bg-[var(--bg-app)] border-t border-[var(--border-main)] flex items-center justify-between text-[11px] text-zinc-400 shrink-0">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Sesuai Pedoman Administrasi Hasil Konbes II IPNU 2024 & Konbes IPPNU 2024
            </span>
            <span className="text-zinc-500 font-mono">
              21 x 29.7 cm (Standar Kertas A4)
            </span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
