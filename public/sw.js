// public/sw.js

const CACHE_NAME = 'nutrinea-cache-v2';
const urlsToCache = [
  '/',
  '/dashboard',
  '/login',
  '/register',
  '/manifest.json',
  '/icon.png',
  // Adicione aqui outros recursos estáticos que você quer cachear
  // Ex: '/styles/globals.css', '/scripts/main.js'
];

self.addEventListener('install', (event) => {
  // Realiza a instalação do Service Worker e armazena os recursos em cache
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Estratégia: Network First, caindo para Cache
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a requisição à rede for bem-sucedida, clona e armazena no cache
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se a rede falhar, tenta buscar do cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Se não estiver no cache, você pode retornar uma página offline padrão
            // return caches.match('/offline.html');
          });
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            // Deleta caches antigos
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
