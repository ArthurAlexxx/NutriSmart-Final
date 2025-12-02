// public/sw.js

const CACHE_NAME = 'nutrinea-cache-v2';
const urlsToCache = [
  '/',
  '/manifest.json',
  // Adicione aqui outros recursos estáticos que você sempre quer disponíveis offline
  // Ex: '/images/logo.png', '/styles/main.css'
];

// Evento de Instalação: Ocorre quando o Service Worker é instalado pela primeira vez.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto. Adicionando URLs ao cache inicial.');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalação concluída. Pulando a espera para ativar imediatamente.');
        return self.skipWaiting(); // Força a ativação do novo Service Worker
      })
  );
});

// Evento de Ativação: Ocorre após a instalação. É aqui que limpamos caches antigos.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Ativação concluída. Clientes controlados.');
        return self.clients.claim(); // Torna o Service Worker ativo o controlador da página imediatamente.
    })
  );
});


// Evento Fetch: Intercepta todas as requisições de rede.
// Estratégia: Network First (Tenta a rede primeiro, se falhar, usa o cache)
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não são GET (ex: POST, PUT)
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignora requisições do Firebase, para não interferir com a comunicação em tempo real.
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('firebaseinstallations.googleapis.com')) {
    return;
  }

  event.respondWith(
    // 1. Tenta buscar o recurso na rede.
    fetch(event.request)
      .then((networkResponse) => {
        // Se a requisição de rede for bem-sucedida, clonamos a resposta.
        // A original vai para o navegador, e a clone vai para o cache.
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Atualiza o cache com a nova versão da rede.
            cache.put(event.request, responseClone);
          });
        return networkResponse;
      })
      .catch(() => {
        // 2. Se a rede falhar (usuário offline), tenta encontrar no cache.
        return caches.match(event.request)
          .then((cachedResponse) => {
            // Se encontrar no cache, retorna a resposta cacheada.
            // Se não encontrar, a promessa é rejeitada e o navegador mostrará o erro padrão de offline.
            return cachedResponse;
          });
      })
  );
});
