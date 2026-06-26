const CACHE_VERSION = "v94";
const CACHE_NAME    = "gym-tracker-v94";

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

// ── Install: precache robusto (no falla si un recurso falta) ─────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.allSettled(
        ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn("[SW] No se pudo cachear:", url, err)
          )
        )
      );
    })
  );
});

// ── Activate: limpia versiones antiguas ──────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: Cache-First + background refresh ──────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // APIs externas → solo red, con fallback offline
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

  // Otros orígenes externos (CDN) → solo red
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request).catch(() => new Response("", { status: 503 })));
    return;
  }

  // Recursos propios → Cache-First + background refresh
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200 && event.request.method === "GET") {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null);

        if (cached) {
          // Servir caché inmediatamente, actualizar en background
          return cached;
        }

        // No está en caché: intentar red
        return fetchPromise.then(response => {
          if (response) return response;
          // Fallback offline para navegación
          if (event.request.mode === "navigate") {
            return cache.match(BASE + "index.html").then(r =>
              r || new Response(
                "<!DOCTYPE html><html><body style='background:#121212;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center'><div><h2>📴 Sin conexión</h2><p>Abre la app con conexión al menos una vez para poder usarla offline.</p></div></body></html>",
                { status: 200, headers: { "Content-Type": "text/html" } }
              )
            );
          }
          return new Response("", { status: 503 });
        });
      })
    )
  );
});

// ── Mensajes desde la app ──────────────────────────────────
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});ent-Type": "text/html" } }
              )
            );
          }
          return new Response("", { status: 503 });
        });
      })
    )
  );
});

// ── Mensajes desde la app ────────────────────────────
self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") {
    // Solo activar cuando el usuario lo confirma explícitamente
    self.skipWaiting();
  }
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }
});
