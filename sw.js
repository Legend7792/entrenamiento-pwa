const CACHE_VERSION = "v41"; // 👈 Incrementa siempre
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

// TODOS los archivos de tu app
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./auth.js",
  "./cloud.js",
  "./rutinaUsuario.js",
  "./userState.js",
  "./selectorRutinas.js",
  "./themes.js",
  "./editorRutinas.js",
  "./style.css",
  "./manifest.json",
  "./beep.mp3",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// ==============================
// INSTALL - CACHEAR TODO
// ==============================
self.addEventListener("install", event => {
  console.log('SW: Instalando versión', CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Cacheando archivos');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// ==============================
// ACTIVATE - LIMPIAR CACHES VIEJOS
// ==============================
self.addEventListener("activate", event => {
  console.log('SW: Activando versión', CACHE_VERSION);
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('SW: Borrando cache viejo', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// ==============================
// FETCH - ESTRATEGIA CACHE FIRST
// ==============================
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // Para Supabase: siempre intentar red, si falla dejar que la app lo maneje
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.com') ||
    url.hostname.includes('supabase.in')
  ) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Si no hay internet, devolver respuesta que indique offline
          return new Response(
            JSON.stringify({ error: 'offline', message: 'Sin conexión' }),
            { 
              status: 503,
              headers: { 'Content-Type': 'application/json' }
            }
          );
        })
    );
    return;
  }

  // Para recursos locales: CACHE FIRST (offline-first)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          console.log('SW: Sirviendo desde cache:', event.request.url);
          return cached;
        }

        // Si no está en cache, intentar descargar
        return fetch(event.request)
          .then(response => {
            // Solo cachear respuestas exitosas de tipo GET
            if (
              !response || 
              response.status !== 200 || 
              event.request.method !== 'GET'
            ) {
              return response;
            }

            // Clonar y guardar en cache
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(error => {
            console.log('SW: Fallo al cargar:', event.request.url);
            
            // Si es una navegación, devolver index.html del cache
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            
            throw error;
          });
      })
  );
});

// ==============================
// MENSAJES (para control manual)
// ==============================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then(keys => {
        return Promise.all(keys.map(key => caches.delete(key)));
      })
    );
  }
});

// ==============================
// SYNC - SINCRONIZACIÓN EN BACKGROUND
// ==============================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Aquí podrías añadir lógica de sincronización automática
  console.log('SW: Sincronizando datos en background');
}

