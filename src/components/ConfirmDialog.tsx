import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Info, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTheme } from './ThemeProvider';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDestructive?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Setuju',
  cancelLabel = 'Batal',
  onConfirm,
  onCancel,
  isDestructive = true
}) => {
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={cn(
              "relative w-full max-w-md border rounded-[32px] overflow-hidden shadow-2xl",
              isDark ? "bg-zinc-950 border-zinc-900" : "bg-white border-zinc-100"
            )}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors",
                  isDestructive ? "bg-rose-500/10 text-rose-500" : "bg-emerald-500/10 text-emerald-500"
                )}>
                  {isDestructive ? <ShieldAlert size={28} /> : <Info size={28} />}
                </div>
                <button 
                  onClick={onCancel}
                  className={cn(
                    "p-2 rounded-xl transition-colors",
                    isDark ? "hover:bg-zinc-900 text-zinc-600 hover:text-zinc-400" : "hover:bg-zinc-100 text-zinc-400 hover:text-zinc-900"
                  )}
                >
                  <X size={20} />
                </button>
              </div>

              <h3 className={cn("text-2xl font-black mb-2 uppercase tracking-tight", isDark ? "text-white" : "text-zinc-900")}>
                {title}
              </h3>
              <p className={cn("text-sm leading-relaxed mb-8", isDark ? "text-zinc-500" : "text-zinc-600")}>
                {message}
              </p>

              <div className="flex flex-col sm:flex-row gap-3 dialog-buttons">
                <button
                  onClick={onCancel}
                  className={cn(
                    "flex-1 px-6 py-4 rounded-2xl border font-bold transition-all active:scale-95 text-sm uppercase tracking-widest",
                    isDark ? "border-zinc-900 hover:bg-zinc-900 text-zinc-500 hover:text-white" : "border-zinc-200 hover:bg-zinc-50 text-zinc-400 hover:text-zinc-700"
                  )}
                >
                  {cancelLabel}
                </button>
                <button
                  ref={confirmButtonRef}
                  onClick={async () => {
                    try {
                      await onConfirm();
                    } catch (error) {
                      console.error('Confirm error:', error);
                    }
                  }}
                  className={cn(
                    "flex-1 px-6 py-4 rounded-2xl font-black transition-all active:scale-95 text-white text-sm uppercase tracking-widest shadow-xl",
                    isDestructive 
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-500/20" 
                      : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
