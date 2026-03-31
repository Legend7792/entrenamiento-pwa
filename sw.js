// sw.js corregido
const CACHE_VERSION = "v92"; // Incrementamos versión
const CACHE_NAME    = "gym-tracker-" + CACHE_VERSION;

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

// Instalación: Cacheamos todo de golpe
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log("[SW] Cacheando assets críticos");
        return cache.addAll(ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación: Limpieza de cachés antiguos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log("[SW] Borrando caché antiguo:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// EVENTO FETCH CORREGIDO
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // 1. Ignorar peticiones externas (Supabase, API, etc.) - Ir a red siempre
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

  // 2. Estrategia para archivos locales: CACHE FIRST (Rapidez total)
  // Esto evita la pantalla negra porque primero busca en el teléfono.
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      if (cachedResponse) {
        // Devolvemos lo que hay en caché PERO actualizamos el caché en segundo plano
        // (Stale-while-revalidate)
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse));
          }
        }).catch(() => {}); // Fallo silencioso de red
        
        return cachedResponse;
      }

      // Si no está en caché, vamos a la red
      return fetch(event.request).catch(() => {
        // Si falla la red y es una navegación, devolver el index.html
        if (event.request.mode === "navigate") {
          return caches.match(BASE + "index.html");
        }
      });
    })
  );
});

