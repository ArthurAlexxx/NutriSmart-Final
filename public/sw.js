// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v9';

// Apenas assets REAIS e estáticos vão no pré-cache
const urlsToCache = [
  '/',
  '/manifest.json', // Mantemos como fallback genérico
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

// Estratégia de cache
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignora não-GET, API, extensões e chrome-extension
  if (
    req.method !== 'GET' ||
    !req.url.startsWith('http') ||
    req.url.includes('/api/') ||
    req.url.includes('chrome-extension')
  ) {
    return; // Deixa o navegador cuidar
  }
  
  // Estratégia "Network First" para o manifest.json
  if (req.url.includes('manifest.json')) {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          // Se a busca na rede for bem-sucedida, atualiza o cache
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, networkRes.clone());
          });
          return networkRes;
        })
        .catch(() => {
          // Se a rede falhar, tenta pegar do cache
          return caches.match(req);
        })
    );
    return;
  }

  // Estratégia "Cache First" para todos os outros assets estáticos
  event.respondWith(
    caches.match(req).then(cacheRes => {
      // Se estiver no cache → retorna
      if (cacheRes) return cacheRes;

      // Se não, busca na rede e tenta salvar SE for seguro
      return fetch(req).then(networkRes => {
        if (
          networkRes &&
          networkRes.status === 200 &&
          networkRes.type === 'basic' // Cacheia apenas assets do mesmo domínio
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
