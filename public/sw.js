// public/sw.js

// O nome do cache é fundamental. Altere-o sempre que fizer atualizações nos arquivos.
const CACHE_NAME = 'nutrinea-cache-v5';

// Lista de arquivos essenciais para o funcionamento offline do app.
const urlsToCache = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  // Adicione aqui os caminhos para os ícones principais
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Adicione outros assets importantes (CSS, JS, imagens principais) que você quer que funcionem offline.
  // Ex: '/styles/main.css', '/scripts/main.js'
];

// Evento de Instalação: Ocorre quando o Service Worker é registrado pela primeira vez.
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Aguarda até que o cache seja aberto e todos os arquivos essenciais sejam armazenados.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, adicionando arquivos essenciais.');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Falha ao armazenar arquivos no cache durante a instalação.', error);
      })
  );
});

// Evento de Ativação: Ocorre após a instalação e quando uma nova versão do SW substitui a antiga.
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o cache não estiver na lista de permissões, ele é um cache antigo e deve ser removido.
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Service Worker: Deletando cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Evento de Fetch: Intercepta todas as requisições de rede feitas pela página.
self.addEventListener('fetch', event => {
  // Ignora requisições que não são GET ou que são para extensões do Chrome
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Se a resposta for encontrada no cache, retorna a versão em cache.
        if (response) {
          return response;
        }

        // Se não, faz a requisição à rede.
        return fetch(event.request).then(
          networkResponse => {
            // Se a requisição for bem-sucedida, clona a resposta e a armazena no cache para uso futuro.
            // Ignora requisições de domínios de terceiros para o cache dinâmico.
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && !networkResponse.type.startsWith('cors')) {
              return networkResponse;
            }

            // Somente armazena requisições http ou https
            if (!event.request.url.startsWith('http')) {
                return networkResponse;
            }
            
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });

            return networkResponse;
          }
        );
      })
      .catch(error => {
        // Em caso de falha de rede e sem cache, você pode retornar uma página de fallback offline.
        console.error('Service Worker: Erro de fetch, usuário pode estar offline.', error);
        // Ex: return caches.match('/offline.html');
      })
  );
});
