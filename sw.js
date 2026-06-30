// sw.js — Gym Tracker v95
// FIXES: SyntaxError corruption, duplicate handler, CDN caching, cache self-healing

const CACHE_VERSION = "v95";
const CACHE_NAME    = "gym-tracker-v95";

const BASE = new URL("./", self.location.href).pathname;

// ── Assets propios de la app ──────────────────────────────
const APP_ASSETS = [
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

// ── CDN externos necesarios para funcionar offline ────────
// Supabase se importa desde CDN en cloud.js — hay que cachearlo
// para que la cadena de módulos ES no falle sin conexión
const CDN_ASSETS = [
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"
];

// ─────────────────────────────────────────────────────────
// INSTALL — precache robusto con reparación automática
// ─────────────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {

      // 1. Cachear todos los assets propios (allSettled = no falla si uno falla)
      await Promise.allSettled(
        APP_ASSETS.map(url =>
          cache.add(url).catch(err =>
            console.warn("[SW] No se pudo cachear:", url, err.message)
          )
        )
      );

      // 2. Cachear CDN con fetch CORS explícito
      await Promise.allSettled(
        CDN_ASSETS.map(async url => {
          try {
            const response = await fetch(url, { mode: "cors" });
            if (response.ok) {
              await cache.put(url, response);
              console.log("[SW] CDN cacheado:", url);
            }
          } catch (err) {
            console.warn("[SW] No se pudo cachear CDN:", url, err.message);
          }
        })
      );

      console.log("[SW] v95 instalado — cache completo");
    })
  );
});

// ─────────────────────────────────────────────────────────
// ACTIVATE — limpieza de versiones antiguas + auto-reparación
// ─────────────────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      // 1. Eliminar caches de versiones antiguas
      const keys = await caches.keys();
      await Promise.all(
        keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null))
      );

      // 2. Tomar control de todos los clientes activos
      await self.clients.claim();

      // 3. Auto-reparación: si el cache está vacío o muy incompleto → reconstruir
      const cache  = await caches.open(CACHE_NAME);
      const cached = await cache.keys();

      if (cached.length < Math.floor(APP_ASSETS.length * 0.7)) {
        console.warn("[SW] Cache incompleto (" + cached.length + "/" + APP_ASSETS.length + " assets), reparando...");
        await Promise.allSettled(
          APP_ASSETS.map(url =>
            cache.add(url).catch(() => {})
          )
        );
        await Promise.allSettled(
          CDN_ASSETS.map(async url => {
            try {
              const response = await fetch(url, { mode: "cors" });
              if (response.ok) await cache.put(url, response);
            } catch {}
          })
        );
        // Notificar a los clientes que el cache fue reparado
        const clients = await self.clients.matchAll();
        clients.forEach(client =>
          client.postMessage({ type: "CACHE_REPAIRED", version: CACHE_VERSION })
        );
        console.log("[SW] Cache reparado automáticamente");
      }

      console.log("[SW] v95 activado");
    })()
  );
});

// ─────────────────────────────────────────────────────────
// FETCH — estrategias por tipo de recurso
// ─────────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);

  // ── Supabase API y Anthropic → solo red, con fallback JSON offline ──
  if (
    url.hostname.includes("supabase.co") ||
    url.hostname.includes("anthropic.com")
  ) {
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

  // ── CDN conocidos (Supabase JS, etc.) → Cache-First ──────────────────
  // Son necesarios para que los módulos ES arranquen offline
  const isCDN = CDN_ASSETS.some(cdn =>
    event.request.url.startsWith(cdn.split("@2/")[0])
  );
  if (isCDN) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(event.request).then(async cached => {
          if (cached) return cached;
          // No está en cache → red + guardar
          try {
            const response = await fetch(event.request, { mode: "cors" });
            if (response.ok) cache.put(event.request, response.clone());
            return response;
          } catch {
            return new Response("", { status: 503 });
          }
        })
      )
    );
    return;
  }

  // ── Otros orígenes externos → solo red ───────────────────────────────
  if (url.origin !== self.location.origin) {
    event.respondWith(
      fetch(event.request).catch(() => new Response("", { status: 503 }))
    );
    return;
  }

  // ── Recursos propios → Cache-First + actualización en background ─────
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(event.request).then(cached => {

        // Intento de red en background para mantener cache fresco
        const networkFetch = fetch(event.request).then(response => {
          if (response && response.status === 200 && event.request.method === "GET") {
            cache.put(event.request, response.clone());
          }
          return response;
        }).catch(() => null);

        // Servir desde cache si está disponible
        if (cached) return cached;

        // No está en cache → esperar red
        return networkFetch.then(response => {
          if (response) return response;

          // Sin cache y sin red → fallback para navegación
          if (event.request.mode === "navigate") {
            return cache.match(BASE + "index.html").then(r =>
              r || new Response(
                `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gym Tracker — Sin conexión</title>
  <style>
    *{box-sizing:border-box}
    body{background:#121212;color:#fff;font-family:system-ui,sans-serif;
         display:flex;align-items:center;justify-content:center;
         height:100vh;margin:0;text-align:center;padding:20px}
    .box{max-width:320px}
    .icon{font-size:52px;margin-bottom:16px}
    h2{font-size:20px;margin:0 0 12px}
    p{color:#aaa;line-height:1.5;font-size:14px;margin-bottom:20px}
    button{background:#4a9eff;color:#fff;border:none;padding:12px 28px;
           border-radius:8px;font-size:15px;cursor:pointer;font-weight:600}
    button:active{opacity:0.8}
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">📴</div>
    <h2>Sin conexión</h2>
    <p>Abre la app con conexión al menos una vez para activar el modo offline completo.</p>
    <button onclick="location.reload()">🔄 Reintentar</button>
  </div>
</body>
</html>`,
                { status: 200, headers: { "Content-Type": "text/html;charset=utf-8" } }
              )
            );
          }

          return new Response("", { status: 503 });
        });
      })
    )
  );
});

// ─────────────────────────────────────────────────────────
// MESSAGE — comunicación bidireccional app ↔ SW
// ─────────────────────────────────────────────────────────
self.addEventListener("message", event => {

  // Forzar activación del nuevo SW (llamado por el usuario desde la app)
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Limpiar todo el cache (desde "Actualizar app" en el sidebar)
  if (event.data?.type === "CLEAR_CACHE") {
    event.waitUntil(
      caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
    );
  }

  // Verificación de salud: comprobar integridad del cache
  if (event.data?.type === "HEALTH_CHECK") {
    event.waitUntil(
      (async () => {
        const cache     = await caches.open(CACHE_NAME);
        const indexOk   = !!(await cache.match(BASE + "index.html"));
        const appJsOk   = !!(await cache.match(BASE + "app.js"));
        const styleCssOk= !!(await cache.match(BASE + "style.css"));
        const healthy   = indexOk && appJsOk && styleCssOk;

        // Si el cache está dañado → reparar automáticamente si hay red
        let repaired = false;
        if (!healthy && navigator.onLine) {
          console.warn("[SW] Health check: cache dañado, reparando...");
          await Promise.allSettled(
            APP_ASSETS.map(url => cache.add(url).catch(() => {}))
          );
          await Promise.allSettled(
            CDN_ASSETS.map(async url => {
              try {
                const r = await fetch(url, { mode: "cors" });
                if (r.ok) await cache.put(url, r);
              } catch {}
            })
          );
          repaired = true;
        }

        // Responder al cliente
        const clients = await self.clients.matchAll();
        clients.forEach(client =>
          client.postMessage({
            type:    "HEALTH_RESULT",
            healthy: healthy || repaired,
            repaired,
            version: CACHE_VERSION
          })
        );
      })()
    );
  }

  // Reconstruir cache completo bajo demanda
  if (event.data?.type === "REBUILD_CACHE") {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        await Promise.allSettled(
          APP_ASSETS.map(url => cache.add(url).catch(() => {}))
        );
        await Promise.allSettled(
          CDN_ASSETS.map(async url => {
            try {
              const r = await fetch(url, { mode: "cors" });
              if (r.ok) await cache.put(url, r);
            } catch {}
          })
        );
        const clients = await self.clients.matchAll();
        clients.forEach(client =>
          client.postMessage({ type: "CACHE_REBUILT", version: CACHE_VERSION })
        );
        console.log("[SW] Cache reconstruido bajo demanda");
      })()
    );
  }
});
