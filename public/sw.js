// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v12';

// Apenas assets REAIS e estáticos vão no pré-cache
const urlsToCache = [
  '/',
  '/manifest.json?v=2',
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
    req.url.includes('/api/') ||
    req.url.includes('chrome-extension')
  ) {
    return; // deixa o navegador cuidar
  }

  // Network First para manifest para garantir que ele esteja sempre atualizado
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

  // Cache First para todos os outros assets estáticos
  event.respondWith(
    caches.match(req).then(cacheRes => {
      // Se estiver no cache → retorna
      if (cacheRes) return cacheRes;

      // Se não, busca na rede e tenta salvar SE for seguro
      return fetch(req).then(networkRes => {
        // Cacheia apenas recursos básicos (do mesmo domínio) e bem-sucedidos
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
