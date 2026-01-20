/*************************
 * SERVICE WORKER PWA
 *************************/

const CACHE_NAME = "entrenamiento-v7"; // cambia la versión cada vez que actualices la app
const urlsToCache = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/manifest.json",
  "/beep.mp3"
];

/*************************
 * INSTALL
 *************************/
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // activa inmediatamente el SW
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
            return caches.delete(key); // elimina versiones antiguas
          }
        })
      )
    )
  );
  self.clients.claim(); // fuerza a todas las pestañas a usar la nueva versión
});

/*************************
 * FETCH (Network-first)
 *************************/
self.addEventListener("fetch", event => {
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        // guarda en cache la nueva versión
        const respClone = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, respClone));
        return resp;
      })
      .catch(() => caches.match(event.request)) // fallback offline
  );
});
