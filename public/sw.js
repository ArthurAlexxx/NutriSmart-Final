// public/sw.js

const CACHE_NAME = 'nutrinea-cache-v14';
const urlsToCache = [
  '/',
  '/manifest.json?v=14',
  '/icons/icon-192x192.png?v=1',
  '/icons/icon-512x512.png?v=1',
  '/offline.html'
];

// Install
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    })
  );
});

// Activate
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});

// Fetch
self.addEventListener('fetch', event => {
  const request = event.request;

  // Filter invalid requests (chrome-extension://, edge://, file://, etc)
  if (
    request.method !== 'GET' ||
    !request.url.startsWith('http') // block extension schemes
  ) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;

        const fetchRequest = request.clone();

        return fetch(fetchRequest).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then(cache => {

            // REAL FIX: only cache same-origin HTTP requests
            if (
              request.url.startsWith('http') &&
              request.url.startsWith(self.location.origin)
            ) {
              cache.put(request, responseToCache);
            }

          });

          return response;
        });
      })
      .catch(() => {
        return caches.match('/offline.html');
      })
  );
});
