const CACHE_VERSION = "v89";
const CACHE_NAME    = "gym-tracker-v89";

// BASE calculado dinámicamente — funciona desde cualquier ruta de despliegue
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

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn("[SW] Cache install parcial:", err))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: "SW_UPDATED", version: CACHE_VERSION }))
      ))
  );
});

self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  if (url.hostname.includes("supabase") || url.hostname.includes("anthropic.com")) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503, headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }
  event.respondWith(
    fetch(event.request).then(response => {
      if (response && response.status === 200 && event.request.method === "GET") {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
      }
      return response;
    }).catch(() =>
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        if (event.request.mode === "navigate") return caches.match(BASE + "index.html");
      })
    )
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "CLEAR_CACHE") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  }
});
