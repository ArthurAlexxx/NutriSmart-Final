// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v14';

const urlsToCache = [
  '/',
  '/manifest.json?v=2', // A query string força a revalidação
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
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de fetch segura
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignora requisições que não devem ser cacheadas
  if (
    req.method !== 'GET' ||
    !req.url.startsWith('http') ||
    req.url.includes('/api/') ||
    req.url.includes('chrome-extension')
  ) {
    return; // Deixa o navegador cuidar
  }

  // Estratégia "Network First" para o manifest.json
  // Garante que o app sempre tenha as configurações mais recentes.
  if (req.url.includes('manifest.json')) {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          const resClone = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, resClone));
          return networkRes;
        })
        .catch(() => caches.match(req)) // Fallback para o cache se a rede falhar
    );
    return;
  }
  
  // Estratégia "Stale-While-Revalidate" para as páginas HTML (rotas do Next)
  // Serve rápido do cache, mas busca uma nova versão em segundo plano.
  if (req.headers.get('accept').includes('text/html')) {
    event.respondWith(
        caches.open(CACHE_NAME).then(cache => {
            return cache.match(req).then(cachedResponse => {
                const fetchedResponsePromise = fetch(req).then(networkResponse => {
                    if (networkResponse && networkResponse.status === 200) {
                        cache.put(req, networkResponse.clone());
                    }
                    return networkResponse;
                }).catch(() => cachedResponse); // Se a rede falhar, mantém o cache

                return cachedResponse || fetchedResponsePromise;
            });
        })
    );
    return;
  }

  // Estratégia "Cache First" para todos os outros assets estáticos (imagens, fontes, etc.)
  event.respondWith(
    caches.match(req).then(cacheRes => {
      // Se estiver no cache, retorna do cache
      if (cacheRes) return cacheRes;

      // Se não, busca na rede, salva no cache e retorna
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
