// sw.js

const CACHE_NAME = 'nutrinea-cache-v17';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.png',
  // Adicione outros recursos estáticos importantes aqui
];

// Instala o Service Worker e armazena os recursos em cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta as solicitações de rede - Estratégia Network First
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request).then(response => {
      // Verifica se recebemos uma resposta válida
      if (!response || response.status !== 200 || response.type !== 'basic') {
        // Se a rede falhar, tenta pegar do cache
        return caches.match(event.request).then(cacheResponse => {
            return cacheResponse || response;
        });
      }

      // Clona a resposta. Uma para o navegador, outra para o cache.
      const responseToCache = response.clone();

      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(event.request, responseToCache);
        });

      return response;
    }).catch(() => {
      // A requisição de rede falhou completamente (provavelmente offline)
      // Tenta encontrar no cache
      return caches.match(event.request);
    })
  );
});
