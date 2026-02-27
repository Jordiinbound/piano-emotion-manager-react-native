/**
 * TunerOfflineStorage — Almacenamiento offline con IndexedDB
 * 
 * Gestiona el almacenamiento local de:
 * - Perfiles de pianos
 * - Historial de afinaciones
 * - Calibraciones de inharmonicidad
 * - Cola de sincronización para cuando haya conexión
 * 
 * Patrón: Offline-first con Background Sync
 */

const DB_NAME = 'piano_emotion_tuner';
const DB_VERSION = 1;

// Store names
const STORES = {
  PROFILES: 'piano_profiles',
  TUNING_RECORDS: 'tuning_records',
  CALIBRATIONS: 'calibrations',
  SETTINGS: 'tuner_settings',
  SYNC_QUEUE: 'sync_queue',
} as const;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SyncQueueItem {
  id?: number;
  action: 'create' | 'update' | 'delete';
  store: string;
  data: any;
  timestamp: number;
  synced: boolean;
}

// ─── Database initialization ────────────────────────────────────────────────

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Piano profiles store
      if (!db.objectStoreNames.contains(STORES.PROFILES)) {
        const profileStore = db.createObjectStore(STORES.PROFILES, { keyPath: 'id' });
        profileStore.createIndex('name', 'name', { unique: false });
        profileStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      
      // Tuning records store
      if (!db.objectStoreNames.contains(STORES.TUNING_RECORDS)) {
        const tuningStore = db.createObjectStore(STORES.TUNING_RECORDS, { keyPath: 'id' });
        tuningStore.createIndex('profileId', 'profileId', { unique: false });
        tuningStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      
      // Calibrations store
      if (!db.objectStoreNames.contains(STORES.CALIBRATIONS)) {
        const calibStore = db.createObjectStore(STORES.CALIBRATIONS, { keyPath: 'profileId' });
      }
      
      // Settings store
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
      }
      
      // Sync queue store
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
        syncStore.createIndex('synced', 'synced', { unique: false });
        syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    
    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// ─── Generic CRUD operations ────────────────────────────────────────────────

async function getAll<T>(storeName: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function put<T>(storeName: string, data: T): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Sync Queue ─────────────────────────────────────────────────────────────

async function addToSyncQueue(item: Omit<SyncQueueItem, 'id'>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    store.add(item);
    tx.oncomplete = () => {
      // Request background sync if available
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((registration) => {
          (registration as any).sync?.register('sync-tuning-data');
        }).catch(() => {});
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const index = store.index('synced');
    const request = index.getAll(false);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function markSynced(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SYNC_QUEUE, 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        item.synced = true;
        store.put(item);
      }
      tx.oncomplete = () => resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

// ─── Settings helpers ───────────────────────────────────────────────────────

async function getSetting<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORES.SETTINGS, 'readonly');
      const store = tx.objectStore(STORES.SETTINGS);
      const request = store.get(key);
      request.onsuccess = () => {
        resolve(request.result?.value ?? defaultValue);
      };
      request.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

async function setSetting<T>(key: string, value: T): Promise<void> {
  return put(STORES.SETTINGS, { key, value });
}

// ─── Network status ─────────────────────────────────────────────────────────

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

export function onNetworkChange(callback: (online: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  
  const handleOnline = () => callback(true);
  const handleOffline = () => callback(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}

// ─── Service Worker registration ────────────────────────────────────────────

export async function registerServiceWorker(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    
    console.log('[PWA] Service Worker registered:', registration.scope);
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Every hour
    
  } catch (error) {
    console.warn('[PWA] Service Worker registration failed:', error);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

export const TunerOfflineStorage = {
  // Database
  openDB,
  
  // Profiles
  getAllProfiles: () => getAll(STORES.PROFILES),
  getProfile: (id: string) => getById(STORES.PROFILES, id),
  saveProfile: (profile: any) => put(STORES.PROFILES, profile),
  deleteProfile: (id: string) => deleteById(STORES.PROFILES, id),
  
  // Tuning records
  getAllTuningRecords: () => getAll(STORES.TUNING_RECORDS),
  getTuningRecord: (id: string) => getById(STORES.TUNING_RECORDS, id),
  saveTuningRecord: (record: any) => put(STORES.TUNING_RECORDS, record),
  deleteTuningRecord: (id: string) => deleteById(STORES.TUNING_RECORDS, id),
  
  // Calibrations
  getCalibration: (profileId: string) => getById(STORES.CALIBRATIONS, profileId),
  saveCalibration: (calibration: any) => put(STORES.CALIBRATIONS, calibration),
  
  // Settings
  getSetting,
  setSetting,
  
  // Sync
  addToSyncQueue,
  getPendingSyncItems,
  markSynced,
  
  // Network
  isOnline,
  onNetworkChange,
  
  // PWA
  registerServiceWorker,
};

export default TunerOfflineStorage;
