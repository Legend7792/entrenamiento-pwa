const CACHE_VERSION = "v14";
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

const APP_SHELL = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/manifest.json",
  "/beep.mp3"
];

/* ======================
   INSTALL
====================== */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

/* ======================
   ACTIVATE
====================== */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ======================
   FETCH
====================== */
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Solo manejar requests del mismo origen
  if (url.origin !== location.origin) return;

  // HTML → Network First
  if (event.request.destination === "document") {
    event.respondWith(
      fetch(event.request)
        .then(resp => {
          const copy = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy));
          return resp;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // JS / CSS / manifest → Stale While Revalidate
  if (
    event.request.destination === "script" ||
    event.request.destination === "style" ||
    url.pathname.endsWith("manifest.json")
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(resp => {
          caches.open(CACHE_NAME).then(c => c.put(event.request, resp.clone()));
          return resp;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Audio / imágenes → Cache First
  event.respondWith(
    caches.match(event.request).then(resp => resp || fetch(event.request))
  );
});

/* ======================
   MENSAJES
====================== */
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
