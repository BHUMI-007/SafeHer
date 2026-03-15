const CACHE_NAME = 'safeher-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/map.html',
  '/track.html',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap'
];

// Install service worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('SafeHer: Caching files for offline use');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate service worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          return response;
        }
        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Cache new responses
            if (!response || response.status !== 200) {
              return response;
            }
            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });
            return response;
          })
          .catch(() => {
            // Return offline page if network fails
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline SOS
self.addEventListener('sync', (event) => {
  if (event.tag === 'sos-sync') {
    event.waitUntil(syncSOS());
  }
});

async function syncSOS() {
  // When back online, sync any pending SOS alerts
  const cache = await caches.open('safeher-sos-queue');
  const keys = await cache.keys();

  for (const key of keys) {
    const response = await cache.match(key);
    const sosData = await response.json();

    try {
      await fetch('https://safeher-backend.onrender.com/api/sos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sosData)
      });
      await cache.delete(key);
      console.log('SafeHer: Synced offline SOS alert');
    } catch (err) {
      console.log('SafeHer: Still offline, will retry');
    }
  }
}