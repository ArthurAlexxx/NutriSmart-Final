// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icon.png',
  '/offline.html' // Uma página de fallback offline
];

// 1. Instalação: Adiciona os arquivos principais ao cache.
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. Ativação: Limpa caches antigos para garantir que a versão mais recente seja usada.
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

// 3. Fetch (NOVA ADIÇÃO CRÍTICA): Intercepta as requisições de rede.
// Isso é necessário para que o Chrome considere o app "instalável".
self.addEventListener('fetch', event => {
  // Estratégia: Network First (Tenta a rede, se falhar, usa o cache)
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        // Se a requisição para a rede foi bem-sucedida,
        // clona a resposta e a armazena no cache para uso offline futuro.
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      })
      .catch(() => {
        // Se a requisição de rede falhar (ex: offline),
        // tenta encontrar uma resposta no cache.
        return caches.match(event.request)
          .then(cachedResponse => {
            // Se encontrarmos no cache, retornamos a resposta cacheada.
            // Se não, para requisições de navegação, retorna a página de fallback.
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.mode === 'navigate') {
              return caches.match('/offline.html');
            }
            // Para outros tipos de requisição (imagens, etc.), apenas falha.
            return new Response("Network error and not in cache", {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});