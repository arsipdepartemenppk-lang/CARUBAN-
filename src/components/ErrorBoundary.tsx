import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    const lastCrash = sessionStorage.getItem('last_crash_time');
    const now = Date.now();
    
    if (!lastCrash || (now - parseInt(lastCrash)) > 30000) {
      sessionStorage.setItem('last_crash_time', now.toString());
      console.log('Attempting auto-recovery...');
      
      try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (!key.includes('firebase:authUser')) {
            localStorage.removeItem(key);
          }
        });
      } catch (e) {
        console.error('Failed to clear local storage during recovery', e);
      }
      
      window.location.reload();
    }
  }

  private handleReset = () => {
    sessionStorage.removeItem('last_crash_time');
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      let errorMessage = 'Terjadi kesalahan yang tidak terduga.';
      let errorDetails = '';
      try {
        if (this.state.error?.message) {
          const parsed = JSON.parse(this.state.error.message);
          if (parsed.error) {
            errorMessage = `Kesalahan Firestore: ${parsed.error}`;
            errorDetails = `Operasi: ${parsed.operationType} pada ${parsed.path || 'unknown'}`;
          }
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
          <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-[32px] p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-rose-500/10 rounded-[24px] flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
              <AlertTriangle className="text-rose-500" size={40} />
            </div>
            
            <h1 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">Sistem Terhenti</h1>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>
            {errorDetails && (
              <div className="bg-black/40 rounded-2xl p-4 mb-8 text-left border border-white/5">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Detail Teknis</p>
                <p className="text-xs font-mono text-zinc-300 break-all">{errorDetails}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-white text-black rounded-2xl font-bold text-sm hover:bg-zinc-200 transition-all active:scale-95"
              >
                <RefreshCcw size={18} />
                Muat Ulang
              </button>
              <button
                onClick={this.handleGoHome}
                className="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 text-white rounded-2xl font-bold text-sm hover:bg-zinc-700 transition-all active:scale-95"
              >
                <Home size={18} />
                Beranda
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
