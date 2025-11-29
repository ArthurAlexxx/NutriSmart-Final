// sw.js

const CACHE_NAME = 'nutrinea-cache-v4';
const urlsToCache = [
  '/',
  '/login',
  '/register',
  '/manifest.json',
  // Adicione aqui outros assets estáticos importantes que você queira cachear
  // Ex: '/styles/main.css', '/images/logo.png', etc.
];

// Evento de instalação: abre o cache e adiciona os arquivos principais
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Evento de fetch: responde com o cache se disponível, senão busca na rede
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET ou de extensões do Chrome
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        // Se não está no cache, busca na rede
        return fetch(event.request).then(
          response => {
            // Verifica se recebemos uma resposta válida e se é um protocolo http/https
            if(!response || response.status !== 200 || !['http', 'https'].includes(new URL(response.url).protocol.replace(':', ''))) {
              return response;
            }

            // Clona a resposta. Uma stream só pode ser consumida uma vez.
            // Precisamos de uma para o navegador e outra para o cache.
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

// Evento de ativação: limpa caches antigos
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
