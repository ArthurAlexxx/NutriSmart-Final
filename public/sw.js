
// This is a network-only Service Worker.
// It's the best strategy for development to avoid caching issues.
// It will not cache any assets and will always fetch from the network.

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  // Skip waiting to ensure the new service worker activates immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  // Take control of all clients as soon as the service worker activates.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Always go to the network.
  // This effectively disables caching for development purposes.
  event.respondWith(fetch(event.request));
});
