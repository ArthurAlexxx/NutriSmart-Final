const CACHE_NAME = 'nutrinea-cache-v15';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html',
  '/favicon.ico',
  '/icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache and caching basic assets');
      return cache.addAll(urlsToCache);
    }).catch(error => {
      console.error('Failed to cache basic assets during install:', error);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }
  
  // Strategy: Cache First, then Network
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Serve from cache
          return response;
        }

        // Not in cache, go to network
        return fetch(request).then(
          networkResponse => {
            // Check if we received a valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // IMPORTANT: Clone the response. A response is a stream
            // and because we want the browser to consume the response
            // as well as the cache consuming the response, we need
            // to clone it so we have two streams.
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // We only cache requests from our own origin
                if (request.url.startsWith(self.location.origin)) {
                  cache.put(request, responseToCache);
                }
              });

            return networkResponse;
          }
        );
      })
      .catch(() => {
        // If both cache and network fail, show a fallback page.
        // This is crucial for offline functionality.
        return caches.match('/offline.html');
      })
  );
});
