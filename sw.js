const CACHE_VERSION = "v19";
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

// Archivos CRÍTICOS (sin estos la app no vive)
const CORE_ASSETS = [
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
      return cache.addAll(CORE_ASSETS);
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
  if (event.request.method !== "GET") return;

  // 1️⃣ NAVEGACIÓN (abrir app, recargar, volver desde background)
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("/index.html").then(cached => {
        if (cached) return cached;

        // Fallback de emergencia (si Android limpió algo)
        return fetch("/index.html").catch(() =>
          new Response(
            "<h1>App no disponible offline</h1>",
            { headers: { "Content-Type": "text/html" } }
          )
        );
      })
    );
    return;
  }

  // 2️⃣ ARCHIVOS ESTÁTICOS (JS, CSS, audio, etc.)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request)
        .then(resp => {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, clone);
          });
          return resp;
        })
        .catch(() => cached);
    })
  );
});

// ==============================
// MENSAJES (actualización forzada)
// ==============================
self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
