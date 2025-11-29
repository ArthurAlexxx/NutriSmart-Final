// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v9';

// Apenas assets REAIS e estáticos vão no pré-cache
const urlsToCache = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instala o service worker
self.addEventListener('install', event => {
  console.log('SW instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Cache First APENAS para assets estáticos
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignora coisas que não devem ser cacheadas
  if (
    req.method !== 'GET' ||
    !req.url.startsWith('http') ||
    req.destination === 'document' ||   // HTML (evita cachear páginas)
    req.url.includes('/api/') ||
    req.url.includes('chrome-extension')
  ) {
    return; // deixa o navegador lidar
  }

  event.respondWith(
    caches.match(req).then(cacheRes => {
      if (cacheRes) return cacheRes;

      return fetch(req).then(networkRes => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          networkRes.type === 'basic'
        ) {
          const clone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, clone);
          });
        }

        return networkRes;
      });
    })
  );
});
