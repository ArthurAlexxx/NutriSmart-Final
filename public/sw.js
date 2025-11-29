// public/sw.js

const CACHE_NAME = 'nutrinea-cache-v7';
const urlsToCache = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/manifest.json',
];

// Instala o service worker
self.addEventListener('install', event => {
  console.log('Service worker instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto, adicionando URLs ao cache');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Falha ao adicionar URLs ao cache:', error);
      })
  );
});

// Ativa o service worker e limpa caches antigos
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Intercepta requisições de rede
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET e requisições de extensões do Chrome ou de dev
  if (event.request.method !== 'GET' || 
      !event.request.url.startsWith('http')) {
    // Deixa o navegador lidar com a requisição normalmente
    return;
  }

  // Estratégia: Network First (rede primeiro) para recursos dinâmicos (HTML, API)
  // e Cache First para assets estáticos.
  // Para simplificar, vamos usar uma estratégia Cache-First para as URLs pré-cacheadas.
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta estiver no cache, retorna do cache
        if (response) {
          return response;
        }

        // Se não, busca na rede
        return fetch(event.request).then(
          response => {
            // Verifica se recebemos uma resposta válida
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clona a resposta para que possamos colocá-la no cache e retorná-la
            const responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                // Não colocamos requisições POST ou de extensão no cache aqui
                if (event.request.method === 'GET' && event.request.url.startsWith('http')) {
                  cache.put(event.request, responseToCache);
                }
              });

            return response;
          }
        );
      })
  );
});
