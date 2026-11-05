import { openDB, IDBPDatabase } from 'idb';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';

const DB_NAME = 'CarubanOfflineSyncDB';
const STORE_NAME = 'offline_queue';

export interface SyncItem {
  id?: number;
  data: any;
  type: 'visitasi' | 'attendance' | 'member' | 'surat' | 'agenda';
  action?: 'create' | 'update';
  docId?: string;
  collectionName?: string;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  errorCount?: number;
}

class SyncQueue {
  private dbPromise: Promise<IDBPDatabase>;

  constructor() {
    this.dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, oldVersion) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        }
      },
    });

    // Auto-sync listener when browser reconnects
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Koneksi internet pulih. Memulai sinkronisasi otomatis data offline...');
        this.syncAll();
      });
    }
  }

  async addToQueue(
    data: any, 
    type: 'visitasi' | 'attendance' | 'member' | 'surat' | 'agenda',
    options?: { action?: 'create' | 'update'; docId?: string; collectionName?: string }
  ): Promise<number> {
    const db = await this.dbPromise;
    const id = await db.add(STORE_NAME, {
      data,
      type,
      action: options?.action || 'create',
      docId: options?.docId,
      collectionName: options?.collectionName,
      timestamp: Date.now(),
      status: 'pending',
      errorCount: 0
    });
    return id as number;
  }

  async getQueue(): Promise<SyncItem[]> {
    const db = await this.dbPromise;
    return db.getAll(STORE_NAME);
  }

  async removeFromQueue(id: number): Promise<void> {
    const db = await this.dbPromise;
    await db.delete(STORE_NAME, id);
  }

  async clearQueue(): Promise<void> {
    const db = await this.dbPromise;
    await db.clear(STORE_NAME);
  }

  /**
   * Automatically flushes all pending queue items to Firestore.
   */
  async syncAll(firestoreDb?: any): Promise<{ synced: number; failed: number }> {
    const queue = await this.getQueue();
    if (queue.length === 0) return { synced: 0, failed: 0 };

    let dbInstance = firestoreDb;
    if (!dbInstance) {
      try {
        const { db } = await import('../firebase');
        dbInstance = db;
      } catch (e) {
        console.warn('Could not import Firestore instance for sync:', e);
        return { synced: 0, failed: queue.length };
      }
    }

    let synced = 0;
    let failed = 0;

    for (const item of queue) {
      try {
        let col = item.collectionName;
        if (!col) {
          switch (item.type) {
            case 'attendance': col = 'attendances'; break;
            case 'surat': col = 'suratMasuk'; break;
            case 'visitasi': col = 'visitasis'; break;
            case 'member': col = 'members'; break;
            case 'agenda': col = 'agendas'; break;
            default: col = 'activities';
          }
        }

        if (item.action === 'update' && item.docId) {
          await updateDoc(doc(dbInstance, col, item.docId), item.data);
        } else {
          await addDoc(collection(dbInstance, col), item.data);
        }

        if (item.id) {
          await this.removeFromQueue(item.id);
        }
        synced++;
      } catch (err) {
        console.warn(`Gagal sinkronisasi antrean ID ${item.id}:`, err);
        failed++;
      }
    }

    return { synced, failed };
  }
}

export const syncQueue = new SyncQueue();
