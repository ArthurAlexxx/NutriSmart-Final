// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Evento de instalação: abre o cache e adiciona os arquivos principais.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de ativação: limpa caches antigos.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});


// Evento de fetch: implementa a estratégia "Network First".
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não são GET (como POST, etc.)
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Se a resposta da rede for bem-sucedida, clona, armazena no cache e retorna.
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        return networkResponse;
      })
      .catch(() => {
        // Se a rede falhar, tenta buscar do cache.
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Se não estiver no cache, retorna uma resposta de erro genérica (ou uma página offline padrão)
            // Para APIs, é importante retornar um erro para que a aplicação possa tratá-lo.
            if (event.request.url.includes('/api/')) {
                 return new Response(JSON.stringify({ error: 'Offline' }), {
                    headers: { 'Content-Type': 'application/json' },
                    status: 503 // Service Unavailable
                });
            }
            // Para outras requisições (páginas), você pode retornar uma página offline.
            // Por simplicidade, vamos apenas deixar falhar para que o navegador mostre sua página de erro offline.
            return Response.error();
          });
      })
  );
});
