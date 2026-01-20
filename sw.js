// sw.js definitivo para PWA Entrenamiento
const CACHE_VERSION = "v14"; // Incrementar con cada actualización
const CACHE_NAME = `entrenamiento-cache-${CACHE_VERSION}`;

// Archivos que sí queremos cachear offline
const urlsToCache = [
  "/app.js?v=14",
  "/style.css?v=14",
  "/beep.mp3?v=14",
  "/icons/icon-192.png",
  "/icons/icon-512.png"
];

// Instalación del SW
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting()) // fuerza activar SW nuevo
  );
});

// Activación del SW
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // borrar caches antiguos
          }
        })
      )
    )
  );
  self.clients.claim(); // toma control inmediato de todas las ventanas
});

// Fetch: network-first para HTML y manifest, cache-first para archivos estáticos
self.addEventListener("fetch", event => {
  const requestUrl = new URL(event.request.url);

  // network-first para index.html y manifest.json
  if (requestUrl.pathname.endsWith("index.html") || requestUrl.pathname.endsWith("manifest.json")) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // actualizar cache opcional
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request)) // fallback si no hay red
    );
  } else {
    // cache-first para todo lo demás
    event.respondWith(
      caches.match(event.request)
        .then(resp => resp || fetch(event.request).then(fetchResp => {
          // opcional: guardar en cache dinámico
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, fetchResp.clone()));
          return fetchResp;
        }))
    );
  }
});

// Escucha mensajes desde la app para forzar actualización
self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
