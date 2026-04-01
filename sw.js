const CACHE_VERSION = "v95";
const CACHE_NAME    = "gym-tracker-v92";

const BASE = new URL("./", self.location.href).pathname;

const ASSETS = [
  BASE,
  BASE + "index.html",
  BASE + "app.js",
  BASE + "auth.js",
  BASE + "cloud.js",
  BASE + "rutinaUsuario.js",
  BASE + "userState.js",
  BASE + "selectorRutinas.js",
  BASE + "themes.js",
  BASE + "editorRutinas.js",
  BASE + "ui.js",
  BASE + "aiImport.js",
  BASE + "style.css",
  BASE + "manifest.json",
  BASE + "beep.mp3",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png"
];

// ── Install: precargar todos los assets ──────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn("[SW] Cache install parcial:", err))
  );
});

// ── Activate: limpiar cachés viejos ─────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
      ))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION }))
      ))
  );
});

// ── Fetch: estrategia según tipo de recurso ──────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // APIs externas (Supabase, Anthropic) → siempre red, nunca caché
  if (url.hostname.includes("supabase") || url.hostname.includes("anthropic.com")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // Recursos de otros orígenes (CDN jsDelivr para Supabase SDK) → solo red
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response("", { status: 503 })
      )
    );
    return;
  }

  // ── Recursos propios de la app: Cache-First ──────────────────────────────
  // MOTIVO: Con network-first, si la red tarda o falla parcialmente,
  // el fetch puede devolver undefined → pantalla negra.
  // Cache-first garantiza respuesta inmediata y confiable siempre.
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // Tenemos el recurso en caché → servir de inmediato
        // Y actualizar en background si hay conexión (stale-while-revalidate)
        fetch(event.request)
          .then(response => {
            if (response && response.status === 200 && event.request.method === "GET") {
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
            }
          })
          .catch(() => {}); // offline, no pasa nada
        return cached;
      }

      // No está en caché → intentar red
      return fetch(event.request)
        .then(response => {
          if (response && response.status === 200 && event.request.method === "GET") {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Offline y no está en caché
          // Para navegación: devolver index.html cacheado
          if (event.request.mode === "navigate") {
            return caches.match(BASE + "index.html").then(r =>
              r || new Response("<h1>Sin conexión</h1>", {
                status: 200,
                headers: { "Content-Type": "text/html" }
              })
            );
          }
          // Para otros recursos: respuesta vacía pero válida (no undefined)
          return new Response("", { status: 503 });
        });
    })
  );
});

// ── Mensajes desde la app ────────────────────────────
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});
