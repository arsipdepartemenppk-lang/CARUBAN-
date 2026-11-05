/**
 * Dispatches a global toast event that can be caught by the ToastProvider.
 */
export function dispatchGlobalToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  const event = new CustomEvent('global-toast', { detail: { message, type } });
  window.dispatchEvent(event);
}

export function initGlobalErrorHandlers() {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    if (args.length > 0) {
      const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || args[0]?.toString() || '');
      if (msg.includes('[vite]') || msg.includes('WebSocket') || msg.includes('websocket')) {
        return;
      }
    }
    originalConsoleError.apply(console, args);
  };

  const originalConsoleLog = console.log;
  console.log = (...args) => {
    if (args.length > 0) {
      const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || args[0]?.toString() || '');
      if (msg.includes('[vite]') && msg.includes('websocket')) {
        return;
      }
    }
    originalConsoleLog.apply(console, args);
  };

  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    if (args.length > 0) {
      const msg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || args[0]?.toString() || '');
      if (msg.includes('[vite]') || msg.includes('WebSocket') || msg.includes('websocket')) {
        return;
      }
    }
    originalConsoleWarn.apply(console, args);
  };

  window.onerror = (message, source, lineno, colno, error) => {
    console.error('Global Error:', { message, source, lineno, colno, error });
  };

  window.onunhandledrejection = (event) => {
    const reasonStr = typeof event.reason === 'string' 
      ? event.reason 
      : (event.reason?.message || event.reason?.toString() || '');
      
    if (
      reasonStr.includes('[vite]') || 
      reasonStr.includes('WebSocket') || 
      reasonStr.includes('websocket') ||
      reasonStr.includes('ws://') ||
      reasonStr.includes('wss://')
    ) {
      event.preventDefault();
      return;
    }
    
    if (event.reason && event.reason.type === 'error' && (event.reason.target instanceof WebSocket || (event.reason.target && event.reason.target.constructor && event.reason.target.constructor.name === 'WebSocket'))) {
      event.preventDefault();
      return;
    }
    
    console.error('Unhandled Rejection:', event.reason);
    
    let message = 'Terjadi kesalahan sistem';
    if (typeof event.reason?.message === 'string' && event.reason.message.includes('Failed to fetch dynamically imported module')) {
      message = 'Gagal memuat modul. Mencoba memuat ulang...';
    } else if (event.reason?.message) {
      try {
        const parsed = JSON.parse(event.reason.message);
        if (parsed.error) {
          message = `Kesalahan: ${typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error)}`;
        }
      } catch (e) {
        message = `Kesalahan: ${typeof event.reason.message === 'string' ? event.reason.message : JSON.stringify(event.reason.message)}`;
      }
    }
    
    dispatchGlobalToast(message, 'error');
  };
}

/**
 * Automatically retries a function that returns a promise.
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await new Promise((resolve) => setTimeout(resolve, delay));
    return retry(fn, retries - 1, delay * 2);
  }
}
