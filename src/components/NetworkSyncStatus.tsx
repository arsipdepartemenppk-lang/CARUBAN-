import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, Cloud, CloudOff } from 'lucide-react';
import { syncQueue, SyncItem } from '../services/syncQueue';
import { useToast } from './Toast';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../lib/utils';

export const NetworkSyncStatus: React.FC<{ className?: string }> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingQueue, setPendingQueue] = useState<SyncItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const { showToast } = useToast();

  const refreshQueue = async () => {
    try {
      const q = await syncQueue.getQueue();
      setPendingQueue(q);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('Koneksi internet terhubung kembali. Memulai sinkronisasi otomatis...', 'success');
      handleSyncNow();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Anda dalam Mode Offline. Data tetap disimpan lokal & otomatis sinkron saat online.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    refreshQueue();
    const interval = setInterval(refreshQueue, 6000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleSyncNow = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncQueue.syncAll();
      await refreshQueue();
      if (result.synced > 0) {
        showToast(`${result.synced} data lokal berhasil disinkronisasi ke Cloud Firestore!`, 'success');
      } else if (pendingQueue.length === 0) {
        showToast('Semua data telah tersinkronisasi sempurna.', 'info');
      }
    } catch (e: any) {
      showToast('Gagal sinkronisasi data: ' + e?.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <div 
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer",
          isOnline
            ? pendingQueue.length > 0 
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
              : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        )}
        onClick={handleSyncNow}
        title={isOnline ? "Klik untuk sinkronisasi paksa" : "Offline Mode"}
      >
        {isOnline ? (
          pendingQueue.length > 0 ? (
            <>
              <Cloud size={13} className="text-amber-400" />
              <span>{pendingQueue.length} Antrean</span>
              <RefreshCw size={11} className={cn("text-amber-400", isSyncing && "animate-spin")} />
            </>
          ) : (
            <>
              <CheckCircle2 size={13} className="text-emerald-400" />
              <span className="hidden sm:inline">Tersinkronisasi</span>
            </>
          )
        ) : (
          <>
            <WifiOff size={13} className="text-rose-400" />
            <span>Mode Offline</span>
            {pendingQueue.length > 0 && <span className="bg-rose-600 text-white rounded-full px-1.5 py-0.2 text-[9px] font-black">{pendingQueue.length}</span>}
          </>
        )}
      </div>
    </div>
  );
};
