const CACHE_VERSION = "v14";
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
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ==============================
// ACTIVATE
// ==============================
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
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
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // HTML → Network first (actualiza solo)
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // JS / CSS / MP3 / demás → Cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      });
    })
  );
});

// ==============================
// MENSAJES
// ==============================
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
