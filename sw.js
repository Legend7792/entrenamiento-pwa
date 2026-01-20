const CACHE_VERSION = "v14"; // Cambiar en cada actualización
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;
const urlsToCache = [
  `/index.html?v=${CACHE_VERSION}`,
  `/app.js?v=${CACHE_VERSION}`,
  `/style.css?v=${CACHE_VERSION}`,
  `/manifest.json?v=${CACHE_VERSION}`,
  `/beep.mp3?v=${CACHE_VERSION}`
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);

  // Network-first para archivos de la app (HTML, JS, CSS, manifest)
  if ([".html", ".js", ".css", "manifest.json"].some(ext => requestUrl.pathname.endsWith(ext))) {
    event.respondWith(
      fetch(`${requestUrl.pathname}?v=${CACHE_VERSION}`)
        .then(resp => {
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, resp.clone()));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first para archivos estáticos (imágenes, mp3)
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request))
    );
  }
});

// Mensajes desde la app
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting(); // Fuerza reemplazo del SW
  }
});
