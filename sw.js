/*************************
 * SERVICE WORKER PWA DEFINITIVO
 *************************/

// Cambia esta versión cada vez que actualices app.js o index.html
const CACHE_VERSION = "v9"; 
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

// Archivos a cachear
const urlsToCache = [
  `/index.html?v=${CACHE_VERSION}`,
  `/app.js?v=${CACHE_VERSION}`,
  `/style.css?v=${CACHE_VERSION}`,
  `/manifest.json?v=${CACHE_VERSION}`,
  `/beep.mp3?v=${CACHE_VERSION}`
];

/*************************
 * INSTALL
 *************************/
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // activa SW inmediatamente
  );
});

/*************************
 * ACTIVATE
 *************************/
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // elimina cache viejo
          }
        })
      )
    )
  );
  self.clients.claim(); // fuerza que todas las pestañas usen la nueva versión
});

/*************************
 * FETCH (Network-first con cache fallback)
 *************************/
self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);

  // Forzar cache busting solo para archivos propios de la app
  if (requestUrl.pathname.endsWith(".js") ||
      requestUrl.pathname.endsWith(".css") ||
      requestUrl.pathname.endsWith(".html") ||
      requestUrl.pathname.endsWith("manifest.json")) {

    event.respondWith(
      fetch(`${requestUrl.pathname}?v=${CACHE_VERSION}`)
        .then(resp => {
          // guardar la nueva versión en cache
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
          return resp;
        })
        .catch(() => caches.match(event.request)) // fallback offline
    );

  } else {
    // otros archivos: cache first
    event.respondWith(
      caches.match(event.request).then(resp => resp || fetch(event.request))
    );
  }
});
