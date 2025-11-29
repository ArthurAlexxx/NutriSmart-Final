const CACHE_NAME = 'nutrinea-cache-v10';

const urlsToCache = [
  '/',
  '/manifest.json?v=2', // Versão mais recente
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instala o SW
self.addEventListener('install', event => {
  console.log('SW instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => key !== CACHE_NAME && caches.delete(key))
    ))
  );
  self.clients.claim();
});

// Estratégia de fetch
self.addEventListener('fetch', event => {
  const req = event.request;

  if (
    req.method !== 'GET' ||
    !req.url.startsWith('http') ||
    req.url.includes('/api/') ||
    req.url.includes('chrome-extension')
  ) return;

  // Network First para manifest
  if (req.url.includes('manifest.json')) {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
          return networkRes;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache First para todos os outros assets
  event.respondWith(
    caches.match(req).then(cacheRes => cacheRes || fetch(req).then(networkRes => {
      if (networkRes && networkRes.status === 200 && networkRes.type === 'basic') {
        caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
      }
      return networkRes;
    }))
  );
});
