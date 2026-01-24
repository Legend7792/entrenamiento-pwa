const CACHE_VERSION = "v27";
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./beep.mp3"
];

// ==============================
// INSTALL
// ==============================
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS))
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
        keys.map(key => key !== CACHE_NAME && caches.delete(key))
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

  // NAVEGACIÓN
  if (event.request.mode === "navigate") {
    event.respondWith(
      caches.match("./index.html").then(cached => {
        return cached || fetch(event.request);
      })
    );
    return;
  }

  // RECURSOS
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      return fetch(event.request).then(resp => {
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return resp;
      });
    })
  );
});


self.addEventListener("message", event => {
  if (event.data?.type === "TIMER_FINISHED") {
    self.registration.showNotification("⏱ Tiempo finalizado", {
      body: "El temporizador llegó a 0",
      tag: "timer-finished",
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: "reset-timer",
          title: "Resetear"
        }
      ]
    });
  }
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "reset-timer") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true })
        .then(clients => {
          for (const client of clients) {
            client.postMessage({ type: "RESET_TIMER" });
          }
        })
    );
  }
});


