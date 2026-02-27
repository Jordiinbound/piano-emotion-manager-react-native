/**
 * Service Worker — Piano Emotion PWA
 * 
 * Estrategia: Cache-first para assets estáticos, Network-first para API.
 * Soporta Background Sync para sincronización diferida.
 */

const CACHE_NAME = 'piano-emotion-v1';
const STATIC_CACHE = 'piano-emotion-static-v1';
const DYNAMIC_CACHE = 'piano-emotion-dynamic-v1';

// Assets estáticos que se cachean al instalar
const PRECACHE_URLS = [
  '/',
  '/tuner',
  '/advanced-tools',
];

// ─── Install ────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_URLS);
      })
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('[SW] Precache failed (non-critical):', err);
        return self.skipWaiting();
      })
  );
});

// ─── Activate ───────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== STATIC_CACHE && name !== DYNAMIC_CACHE && name !== CACHE_NAME)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// ─── Fetch Strategy ─────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;
  
  // API requests: Network-first with cache fallback
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/trpc/')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Static assets (JS, CSS, images, fonts): Cache-first
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }
  
  // Navigation requests: Network-first (SPA)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }
  
  // Default: Network-first
  event.respondWith(networkFirstStrategy(request));
});

function isStaticAsset(pathname) {
  return /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|ico|json)$/i.test(pathname) ||
         pathname.startsWith('/_next/static/') ||
         pathname.startsWith('/assets/');
}

async function cacheFirstStrategy(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    // Offline fallback
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

async function networkFirstStrategy(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    
    // For navigation requests, return cached index
    if (request.mode === 'navigate') {
      const cachedIndex = await caches.match('/');
      if (cachedIndex) return cachedIndex;
    }
    
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// ─── Background Sync ────────────────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tuning-data') {
    event.waitUntil(syncTuningData());
  }
});

async function syncTuningData() {
  try {
    // Open IndexedDB to get pending sync items
    const db = await openDB();
    const tx = db.transaction('sync_queue', 'readonly');
    const store = tx.objectStore('sync_queue');
    const request = store.getAll();
    
    return new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const items = request.result;
        if (items.length === 0) {
          resolve();
          return;
        }
        
        for (const item of items) {
          try {
            const response = await fetch(item.url, {
              method: item.method,
              headers: item.headers,
              body: JSON.stringify(item.body),
            });
            
            if (response.ok) {
              // Remove from queue
              const deleteTx = db.transaction('sync_queue', 'readwrite');
              deleteTx.objectStore('sync_queue').delete(item.id);
            }
          } catch (e) {
            console.warn('[SW] Sync failed for item:', item.id);
          }
        }
        resolve();
      };
      request.onerror = reject;
    });
  } catch (e) {
    console.error('[SW] Background sync error:', e);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('piano_emotion_sync', 1);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Push Notifications (future) ────────────────────────────────────────────

self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'Piano Emotion', {
      body: data.body || '',
      icon: '/assets/images/icon.png',
      badge: '/assets/images/favicon.png',
    })
  );
});
