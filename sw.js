const CACHE_VERSION = "v16"; // Cambia esto cada vez que actualices archivos
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/app.js?v=16",
  "/style.css?v=16",
  "/manifest.json?v=16",
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
  const req = event.request;

  // Solo GET
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // HTML → Network first
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, clone));
          return resp;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // JS / CSS / MP3 / manifest → Cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;

      return fetch(req).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return resp;
      }).catch(() => {
        // Si falla el fetch y no hay cache → mensaje de error offline
        return new Response("Archivo no disponible offline", { status: 503 });
      });
    })
  );
});

// ==============================
// MENSAJES
// ==============================
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
