// public/sw.js
const CACHE_NAME = 'nutrinea-cache-v11';

// Apenas assets REAIS e estáticos vão no pré-cache
const urlsToCache = [
  // A rota '/' não deve ser pré-cacheada, pois queremos que ela venha da rede.
  '/manifest.json?v=2',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instala o service worker
self.addEventListener('install', event => {
  console.log('SW instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Usamos addAll para garantir que o SW só instale se todos os assets forem cacheados.
      return cache.addAll(urlsToCache);
    }).catch(err => {
      console.error('Falha ao pré-cachear assets:', err);
    })
  );
  self.skipWaiting(); // Ativa o novo SW mais rápido.
});

// Ativa e limpa caches antigos
self.addEventListener('activate', event => {
  console.log('SW ativado.');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('Limpando cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim(); // Aplica o novo SW a todos os clientes sem precisar recarregar a página.
});

// Estratégia de fetch: Network First para navegação, Cache First para assets
self.addEventListener('fetch', event => {
  const req = event.request;

  // Ignora requisições que não devem ser cacheadas
  if (req.method !== 'GET' || !req.url.startsWith('http')) {
    return;
  }
  
  // Estratégia Network First para o HTML de navegação
  // Isso garante que o usuário sempre veja a página mais recente.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          // Se bem-sucedido, clona a resposta para o cache
          const copy = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return res;
        })
        .catch(() => {
          // Se a rede falhar, tenta pegar do cache como fallback.
          return caches.match(req);
        })
    );
    return;
  }

  // Estratégia Cache First para todos os outros assets (CSS, JS, imagens)
  event.respondWith(
    caches.match(req).then(cachedResponse => {
      // Se tiver no cache, retorna imediatamente.
      if (cachedResponse) {
        return cachedResponse;
      }
      
      // Se não, busca na rede.
      return fetch(req).then(networkResponse => {
        // Salva a resposta no cache para a próxima vez.
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const resClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(req, resClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
