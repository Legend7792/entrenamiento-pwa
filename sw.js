// sw.js — Gym Tracker v99
//
// Estrategia (cambió respecto a v95):
//  * Los archivos de la app se guardan TODOS juntos al instalar una versión nueva (todo o nada).
//    Antes cada archivo se actualizaba por separado en segundo plano, y se podía abrir la app
//    con app.js de una versión y auth.js de otra (los módulos no encajaban entre sí).
//  * Una versión nueva se instala en segundo plano y la app pregunta al usuario si actualiza.
//  * IMPORTANTE para quien publique cambios: hay que subir CACHE_VERSION en cada despliegue;
//    si no, los móviles seguirán con la versión guardada.
//  * Supabase ya no se necesita para arrancar (se carga solo al usar la nube), así que no se
//    precarga; si se descarga alguna vez se guarda para reutilizarlo.

const CACHE_VERSION = "v99";
const CACHE_NAME    = "gym-tracker-v99";

const BASE = new URL("./", self.location.href).pathname;

// Imprescindibles: si falla alguno, la instalación falla y se mantiene la versión anterior
const APP_CRITICOS = [
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
  BASE + "ordenar.js",
  BASE + "ui.js",
  BASE + "aiImport.js",
  BASE + "nav.js",
  BASE + "audioStore.js",
  BASE + "plantillas.js",
  BASE + "style.css",
  BASE + "manifest.json"
];

// Opcionales: si alguno falla no se bloquea la instalación
const APP_OPCIONALES = [
  BASE + "beep.mp3",
  BASE + "icons/icon-180.png",
  BASE + "icons/icon-192.png",
  BASE + "icons/icon-512.png",
  BASE + "icons/icon-maskable-192.png",
  BASE + "icons/icon-maskable-512.png"
];

const APP_ASSETS = [...APP_CRITICOS, ...APP_OPCIONALES];

// 'reload' evita que la caché HTTP del navegador/GitHub Pages nos entregue una copia vieja al instalar
const pedir = url => new Request(url, { cache: "reload" });

async function guardar(cache, url) {
  const resp = await fetch(pedir(url));
  if (!resp.ok) throw new Error(url + " → HTTP " + resp.status);
  await cache.put(url, resp);
}

// ─────────────────────────────────────────────────────────
// INSTALL — todo o nada para lo crítico
// ─────────────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_CRITICOS.map(u => guardar(cache, u)));          // si falla uno → falla la instalación
    await Promise.allSettled(APP_OPCIONALES.map(u => guardar(cache, u)));
    console.log("[SW] " + CACHE_VERSION + " instalado");
  })());
});

// ─────────────────────────────────────────────────────────
// ACTIVATE — limpieza de versiones antiguas
// ─────────────────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
    console.log("[SW] " + CACHE_VERSION + " activado");
  })());
});

// ─────────────────────────────────────────────────────────
// FETCH
// ─────────────────────────────────────────────────────────
const PAGINA_OFFLINE = `<!DOCTYPE html>
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
</html>`;

const respuestaOffline = () => new Response(PAGINA_OFFLINE, {
  status: 200, headers: { "Content-Type": "text/html;charset=utf-8" }
});

self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // ── Supabase API y Anthropic → solo red, con respuesta JSON si no hay conexión ──
  if (url.hostname.endsWith("supabase.co") || url.hostname.endsWith("anthropic.com")) {
    event.respondWith(
      fetch(req).catch(() =>
        new Response(JSON.stringify({ error: "offline" }), {
          status: 503, headers: { "Content-Type": "application/json" }
        })
      )
    );
    return;
  }

  // ── Librería de Supabase en jsDelivr (y sus dependencias): red primero, caché como respaldo ──
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.includes("/@supabase/")) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const resp = await fetch(req);
        if (resp.ok) event.waitUntil(cache.put(req, resp.clone()));
        return resp;
      } catch {
        return (await cache.match(req)) || new Response("", { status: 503 });
      }
    })());
    return;
  }

  // ── Otros orígenes → no se tocan ──
  if (url.origin !== self.location.origin) return;
  // ── Solo se cachean GET ──
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const esNavegacion = req.mode === "navigate";

    // Navegación: ignorar ?accion=… de los accesos directos para encontrar index.html en caché
    const cached = await cache.match(req, { ignoreSearch: esNavegacion });
    if (cached) return cached;

    try {
      const resp = await fetch(req);
      if (resp && resp.status === 200) event.waitUntil(cache.put(req, resp.clone()));
      return resp;
    } catch {
      if (esNavegacion) {
        return (await cache.match(BASE + "index.html")) || respuestaOffline();
      }
      return new Response("", { status: 503 });
    }
  })());
});

// ─────────────────────────────────────────────────────────
// MESSAGE — comunicación app ↔ SW
// ─────────────────────────────────────────────────────────
async function avisarClientes(msg) {
  const clients = await self.clients.matchAll();
  clients.forEach(c => c.postMessage(msg));
}

async function reconstruir(cache) {
  await Promise.allSettled(APP_ASSETS.map(u => guardar(cache, u)));
}

self.addEventListener("message", event => {
  const tipo = event.data?.type;

  // Activar la versión nueva (el usuario aceptó actualizar)
  if (tipo === "SKIP_WAITING") self.skipWaiting();

  // Borrar toda la caché (botón "Actualizar app")
  if (tipo === "CLEAR_CACHE") {
    event.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  }

  // Comprobar que los archivos principales siguen en caché; si faltan y hay red, se reponen
  if (tipo === "HEALTH_CHECK") {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const faltan = [];
      for (const u of APP_CRITICOS) if (!(await cache.match(u))) faltan.push(u);
      let reparado = false;
      if (faltan.length) {
        const resultados = await Promise.allSettled(faltan.map(u => guardar(cache, u)));
        reparado = resultados.every(r => r.status === "fulfilled");
      }
      await avisarClientes({
        type: "HEALTH_RESULT",
        healthy: faltan.length === 0 || reparado,
        repaired: reparado,
        version: CACHE_VERSION
      });
    })());
  }

  // Reconstruir la caché bajo demanda
  if (tipo === "REBUILD_CACHE") {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      await reconstruir(cache);
      await avisarClientes({ type: "CACHE_REBUILT", version: CACHE_VERSION });
    })());
  }
});
