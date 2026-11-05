/**
 * Offline Member Cache Utility for Field Visits (Caruban Core PWA)
 * Synchronizes critical member records to both Service Worker CacheStorage and Local Storage
 * to ensure seamless offline access in remote or low-connectivity areas during visits.
 */

const LOCAL_STORAGE_KEY = 'caruban_offline_critical_members';
const LAST_SYNC_KEY = 'caruban_offline_members_last_sync';

export interface OfflineCacheStatus {
  count: number;
  lastUpdated: string | null;
  isAvailable: boolean;
}

/**
 * Cache members in Service Worker CacheStorage and localStorage fallback
 */
export async function cacheCriticalMemberData(members: any[]): Promise<boolean> {
  if (!members || !Array.isArray(members)) return false;

  const timestamp = new Date().toISOString();

  // 1. Save to LocalStorage fallback
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(members));
    localStorage.setItem(LAST_SYNC_KEY, timestamp);
  } catch (e) {
    console.warn('LocalStorage quota or write error:', e);
  }

  // 2. Dispatch to Service Worker CacheStorage
  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_CRITICAL_MEMBER_DATA',
        payload: members
      });
    }

    // Direct CacheStorage API access if available
    if ('caches' in window) {
      const cache = await caches.open('caruban-member-data-v2');
      const response = new Response(JSON.stringify(members), {
        headers: {
          'Content-Type': 'application/json',
          'X-Caruban-Cache-Time': timestamp,
          'X-Caruban-Count': String(members.length)
        }
      });
      await cache.put('/offline-cache/critical-members.json', response);
    }

    return true;
  } catch (err) {
    console.error('Failed to cache critical member data in Service Worker:', err);
    return false;
  }
}

/**
 * Retrieve cached members when offline or during zero-connectivity visits
 */
export async function getCachedMemberData(): Promise<{ members: any[]; source: 'sw_cache' | 'local_storage' | 'none'; lastUpdated: string | null }> {
  // 1. Try Service Worker CacheStorage first
  if ('caches' in window) {
    try {
      const cache = await caches.open('caruban-member-data-v2');
      const cachedResponse = await cache.match('/offline-cache/critical-members.json');
      if (cachedResponse) {
        const data = await cachedResponse.json();
        const lastUpdated = cachedResponse.headers.get('X-Caruban-Cache-Time');
        if (Array.isArray(data) && data.length > 0) {
          return { members: data, source: 'sw_cache', lastUpdated };
        }
      }
    } catch (e) {
      console.warn('CacheStorage read error:', e);
    }
  }

  // 2. Fallback to LocalStorage
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    const lastUpdated = localStorage.getItem(LAST_SYNC_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return { members: parsed, source: 'local_storage', lastUpdated };
      }
    }
  } catch (e) {
    console.warn('LocalStorage read error:', e);
  }

  return { members: [], source: 'none', lastUpdated: null };
}

/**
 * Check offline cache status
 */
export async function getOfflineCacheStatus(): Promise<OfflineCacheStatus> {
  const cached = await getCachedMemberData();
  return {
    count: cached.members.length,
    lastUpdated: cached.lastUpdated,
    isAvailable: cached.members.length > 0
  };
}
