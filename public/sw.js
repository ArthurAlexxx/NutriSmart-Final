// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v14';

// Apenas assets REAIS e estáticos vão no pré-cache
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png?v=1',
  '/icons/icon-512x512.png?v=1',
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

// Estratégia de fetch
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

  // Network First para manifest para garantir que esteja sempre atualizado
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

  // Stale-While-Revalidate para o HTML principal
  if (req.mode === 'navigate') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache => {
        // Tenta pegar da rede primeiro para ter o conteúdo mais fresco
        return fetch(req)
          .then(networkResponse => {
            // Se bem-sucedido, atualiza o cache e retorna a resposta da rede
            if (networkResponse.status === 200) {
              cache.put(req, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Se a rede falhar, retorna o que estiver no cache
            return cache.match(req);
          });
      })
    );
    return;
  }

  // Cache First para todos os outros assets estáticos
  event.respondWith(
    caches.match(req).then(cacheRes => cacheRes || fetch(req).then(networkRes => {
      // Condição de segurança para cachear apenas respostas válidas
      if (
        networkRes &&
        networkRes.status === 200 &&
        networkRes.type === 'basic'
      ) {
        caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes.clone()));
      }
      return networkRes;
    }))
  );
});
