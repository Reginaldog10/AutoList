const CACHE_NAME = 'autolist-catalogo-v9';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './logo.png',
  './Banner.png',
  './icon.png',
  './icon-192.png',
  './icon-512.png'
];

// Instalação do Service Worker e Caching do App Shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching App Shell');
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação do Service Worker e limpeza de caches antigos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removendo cache antigo:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar requisições (Estratégia Cache-First para assets locais e Network-Only para a API)
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Evitar interceptar chamadas para a API do Google Sheets ou scripts externos
  if (url.origin === 'https://script.google.com' || url.origin === 'https://script.googleusercontent.com') {
    return; // Deixa ir direto para a rede (no-cache)
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse; // Retorna do cache se encontrado
        }
        
        // Caso contrário, busca na rede
        return fetch(event.request).then(response => {
          // Salva novas imagens de fontes ou CDNs no cache dinâmico se necessário
          if (event.request.url.indexOf('fonts.googleapis.com') !== -1 || event.request.url.indexOf('fonts.gstatic.com') !== -1) {
            return caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, response.clone());
              return response;
            });
          }
          return response;
        });
      }).catch(() => {
        // Fallback para quando estiver offline e o asset não estiver no cache
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      })
  );
});
