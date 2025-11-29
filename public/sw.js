// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v8';

// Apenas assets REAIS e estáticos vão no pré-cache
const urlsToCache = [
  '/',
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
  self.skipWaiting(); // ativa mais rápido
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim(); // aplica a todos os clientes sem recarregar
});

// Estratégia segura: Cache First APENAS para assets estáticos
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignora não-GET, API, extensões e chrome-extension
  if (
    req.method !== 'GET' ||
    !req.url.startsWith('http') ||
    req.url.includes('/api/') ||          // evita quebrar API
    req.url.includes('chrome-extension')  // evita erro
  ) {
    return; // deixa o navegador cuidar
  }

  event.respondWith(
    caches.match(req).then(cacheRes => {
      // Se estiver no cache → retorna
      if (cacheRes) return cacheRes;

      // Se não, busca na rede e tenta salvar SE for seguro
      return fetch(req).then(networkRes => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          networkRes.type === 'basic'
        ) {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, resClone);
          });
        }
        return networkRes;
      });
    })
  );
});
