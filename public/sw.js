// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v6';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/favicon.ico',
  // Adicione aqui outros assets estáticos importantes
  // Ex: '/styles/main.css', '/scripts/main.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Ignora requisições de extensões do Chrome
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  // Ignora requisições que não sejam GET
  if (event.request.method !== 'GET') {
      return;
  }
  // Ignora requisições para o Firebase
  if (event.request.url.includes('firestore.googleapis.com')) {
      return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response; // Retorna do cache
        }

        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          response => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                 // Apenas armazena em cache requisições http/https
                 if (event.request.url.startsWith('http')) {
                    cache.put(event.request, responseToCache);
                 }
              });

            return response;
          }
        );
      })
  );
});

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
