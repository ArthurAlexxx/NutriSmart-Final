// public/sw.js

// Increment this version number whenever you update the app
const CACHE_VERSION = 2;
const CACHE_NAME = `nutrinea-cache-v${CACHE_VERSION}`;

const URLS_TO_CACHE = [
  '/',
  '/manifest.json',
  // Add other critical assets you want to cache on install
  // e.g., '/icons/icon-192x192.png', '/offline.html'
];

// Install event: cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch(err => {
        console.error('Failed to open cache', err);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately.
  return self.clients.claim();
});

// Fetch event: serve from network first, then cache
self.addEventListener('fetch', (event) => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // If we get a valid response, cache it and return it.
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return response;
      })
      .catch(() => {
        // If the network request fails, try to get it from the cache.
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // If the request is not in cache, you could return a fallback offline page
            // For now, we just let the browser handle it (which will show a network error).
          });
      })
  );
});
