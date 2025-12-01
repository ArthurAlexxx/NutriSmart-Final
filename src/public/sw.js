// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v16'; // Incremented version
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Adicione aqui outras rotas ou assets estáticos que você quer que funcionem offline
  // Ex: '/about', '/pricing'
];

// Instala o Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativa o Service Worker e limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Intercepta as requisições de rede
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') {
    // Para navegação, sempre tenta a rede primeiro (Stale-While-Revalidate para HTML)
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/');
      })
    );
    return;
  }
  
  // Para outros assets (CSS, JS, imagens), usa a estratégia Cache First
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se encontrar no cache, retorna
        if (response) {
          return response;
        }

        // Se não, busca na rede
        return fetch(event.request).then(
          response => {
            // Se a resposta não for válida, retorna ela mesma
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona a resposta para poder guardar no cache e retornar
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        );
      })
    );
});
