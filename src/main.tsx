import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import ErrorBoundary from './components/ErrorBoundary';

// PWA registration is handled by vite-plugin-pwa


// Handle global error suppression for non-fatal dev server websocket & iframe constraints
window.addEventListener('error', (e) => {
  const msg = e.message || '';
  if (
    msg.includes('WebSocket closed without opened') ||
    msg.includes('publickey-credentials-create') ||
    msg.includes('publickey-credentials-get') ||
    msg.includes('Timeout starting video source') ||
    msg.includes('Cannot transition to a new state') ||
    msg.includes('AbortError')
  ) {
    e.preventDefault();
    e.stopImmediatePropagation?.();
    return;
  }
  if (msg.includes('Failed to fetch dynamically imported module') || msg.includes('Importing a module script failed')) {
    console.warn('Chunk load error detected. Attempting to reload...');
    const lastReload = sessionStorage.getItem('chunk_load_reload');
    const now = Date.now();
    if (!lastReload || (now - parseInt(lastReload)) > 30000) {
      sessionStorage.setItem('chunk_load_reload', now.toString());
      window.location.reload();
    }
  }
});

window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason?.message || e.reason?.toString?.() || '';
  if (
    reason.includes('WebSocket closed without opened') ||
    reason.includes('publickey-credentials-create') ||
    reason.includes('publickey-credentials-get') ||
    reason.includes('auth/invalid-credential') ||
    reason.includes('auth/network-request-failed') ||
    reason.includes('Could not reach Cloud Firestore backend') ||
    reason.includes('Backend didn\'t respond within 10 seconds') ||
    reason.includes('Timeout starting video source') ||
    reason.includes('Cannot transition to a new state') ||
    reason.includes('AbortError')
  ) {
    e.preventDefault();
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
