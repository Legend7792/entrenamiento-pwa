/*************************
 * SW DEFINITIVO PWA ENTRENAMIENTO
 *************************/

const CACHE_VERSION = "v13"; // Incrementa cada vez que subas cambios
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

// Archivos estáticos que se cachearán
const urlsToCache = [
  '/app.js',
  '/style.css',
  '/beep.mp3',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

// INSTALL: cache inicial
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // activa SW inmediatamente
  );
});

// ACTIVATE: borrar caches antiguos
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
  self.clients.claim(); // toma control de todas las pestañas
});

// FETCH: network-only para HTML y manifest, network-first para JS/CSS, cache-first para lo demás
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // network-only: HTML y manifest siempre de la red
  if (requestUrl.pathname.endsWith('index.html') || requestUrl.pathname.endsWith('manifest.json')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // network-first para JS y CSS
  if (['.js', '.css'].some(ext => requestUrl.pathname.endsWith(ext))) {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // cache-first para otros assets (mp3, iconos)
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

// Mensajes desde la app (botón "Forzar actualización")
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // fuerza que el SW activo se reemplace
  }
});
