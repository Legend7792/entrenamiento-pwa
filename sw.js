// SW definitivo para Entrenamiento PWA
const CACHE_VERSION = "v12"; // incrementa cada actualización
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;
const urlsToCache = [
  '/index.html',
  '/app.js',
  '/style.css',
  '/manifest.json',
  '/beep.mp3',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// INSTALL: cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // fuerza que este SW se active inmediatamente
  );
});

// ACTIVATE: limpiar caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim(); // toma control inmediato de las páginas abiertas
});

// FETCH: network-first para archivos propios, cache-first para estáticos
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // network-first: HTML, JS, CSS, manifest
  if (['.html', '.js', '.css', 'manifest.json'].some(ext => requestUrl.pathname.endsWith(ext))) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          // actualizar cache con la última versión
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(event.request)) // fallback al cache si no hay red
    );
  } else {
    // cache-first para mp3, iconos y otras assets estáticas
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request))
    );
  }
});

// Mensajes desde la app (botón "Forzar actualización")
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // fuerza reemplazo del SW activo
  }
});
