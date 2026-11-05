import React, { lazy } from 'react';
import { retry } from '../utils/errorHandling';

/**
 * A wrapper for lazy loading components with automatic retries and fallback UI.
 */
export function lazyWithRetry(
  importFn: () => Promise<{ default: React.ComponentType<any> }>,
  retries = 3,
  delay = 1000
) {
  return lazy(() => 
    retry(importFn, retries, delay).catch((err) => {
      console.error('Failed to load component after retries:', err);
      return {
        default: () => (
          <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center gap-4 bg-zinc-950/50 rounded-3xl border border-zinc-900 m-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Gagal Memuat Halaman</h3>
              <p className="text-zinc-400 text-sm max-w-xs mx-auto mb-6">Terjadi masalah saat mengambil data halaman. Silakan muat ulang atau periksa koneksi internet Anda.</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all active:scale-95"
              >
                Muat Ulang Halaman
              </button>
            </div>
          </div>
        )
      };
    })
  );
}
