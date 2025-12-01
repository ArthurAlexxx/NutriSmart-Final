// public/sw.js

const CACHE_NAME = 'nutrinea-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/offline.html'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

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
    ).then(() => self.clients.claim()) // Force the new service worker to take control immediately
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Ignore non-GET requests and requests from browser extensions
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return;
  }

  // Cache-First strategy for navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        return fetch(request)
          .then(response => {
            // If the fetch is successful, cache it and return the response
            cache.put(request, response.clone());
            return response;
          })
          .catch(() => {
            // If the fetch fails, try to serve from cache, falling back to the offline page
            return cache.match(request)
              .then(response => response || cache.match('/offline.html'));
          });
      })
    );
    return;
  }

  // Stale-While-Revalidate for other assets (CSS, JS, images)
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(request).then(response => {
        // Return from cache immediately if available
        const fetchPromise = fetch(request).then(networkResponse => {
          // If the request is for a resource from our origin, cache it
          if (request.url.startsWith(self.location.origin)) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return the cached response if it exists, otherwise wait for the network
        return response || fetchPromise;
      });
    }).catch(() => {
        // Generic fallback for any other failed asset fetch, although this is less likely
        // with the stale-while-revalidate strategy. For images, this could be a placeholder.
        if (request.headers.get('accept').includes('image')) {
            // You could return a placeholder image from cache here if you have one
        }
        // For other requests, just let the network failure propagate
    })
  );
});
