const CACHE_VERSION = "v18";
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/app.js",
  "/style.css",
  "/manifest.json",
  "/beep.mp3"
];

// ==============================
// INSTALL
// ==============================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
  self.skipWaiting();
});

// ==============================
// ACTIVATE
// ==============================
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

// ==============================
// FETCH
// ==============================
self.addEventListener("fetch", event => {

  // 👉 NAVEGACIÓN (HTML)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html")
    );
    return;
  }

  // 👉 OTROS ARCHIVOS (JS, CSS, audio, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return resp;
      });
    })
  );
});
