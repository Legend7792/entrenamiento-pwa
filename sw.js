const CACHE_VERSION = "v66"; // 👈 Incrementa siempre
const CACHE_NAME = `entrenamiento-${CACHE_VERSION}`;

// Archivos críticos (HTML, JS, CSS) - NETWORK FIRST
const CRITICAL_ASSETS = [
  "./index.html",
  "./app.js",
  "./auth.js",
  "./cloud.js",
  "./rutinaUsuario.js",
  "./userState.js",
  "./selectorRutinas.js",
  "./themes.js",
  "./editorRutinas.js",
  "./style.css"
];

// Assets estáticos (imágenes, audio) - CACHE FIRST
const STATIC_ASSETS = [
  "./",
  "./manifest.json",
  "./beep.mp3",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

const ALL_ASSETS = [...CRITICAL_ASSETS, ...STATIC_ASSETS];

// ==============================
// INSTALL - CACHEAR TODO
// ==============================
self.addEventListener("install", event => {
  console.log('✅ SW: Instalando versión', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SW: Cacheando archivos');
        return cache.addAll(ALL_ASSETS);
      })
      .then(() => {
        console.log('💨 SW: Activación inmediata (skipWaiting)');
        return self.skipWaiting();
      })
  );
});

// ==============================
// ACTIVATE - LIMPIAR CACHES VIEJOS
// ==============================
self.addEventListener("activate", event => {
  console.log('🚀 SW: Activando versión', CACHE_VERSION);
  
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ SW: Borrando cache viejo', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      console.log('🎯 SW: Tomando control de clientes');
      return self.clients.claim();
    }).then(() => {
      // Notificar a todos los clientes que hay nueva versión
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// ==============================
// FETCH - ESTRATEGIA INTELIGENTE
// ==============================
self.addEventListener("fetch", event => {
  const url = new URL(event.request.url);
  
  // 1. SUPABASE: Siempre red (nunca cachear)
  if (
    url.hostname.includes('supabase.co') ||
    url.hostname.includes('supabase.com') ||
    url.hostname.includes('supabase.in')
  ) {
    event.respondWith(
      fetch(event.request).catch(() => {
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

  // 2. ARCHIVOS CRÍTICOS (JS, HTML, CSS): NETWORK FIRST
  if (CRITICAL_ASSETS.some(asset => event.request.url.includes(asset.replace('./', '')))) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si la red funciona, actualizar caché
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Si falla la red, usar caché
          console.log('📡 SW: Sin red, usando caché para:', event.request.url);
          return caches.match(event.request);
        })
    );
    return;
  }

  // 3. ASSETS ESTÁTICOS (imágenes, audio): CACHE FIRST
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) {
          return cached;
        }

        return fetch(event.request)
          .then(response => {
            if (
              !response || 
              response.status !== 200 || 
              event.request.method !== 'GET'
            ) {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(error => {
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            throw error;
          });
      })
  );
});

// ==============================
// MENSAJES
// ==============================
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('💨 SW: Forzando activación inmediata');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ SW: Limpiando todas las cachés');
    event.waitUntil(
      caches.keys().then(keys => {
        return Promise.all(keys.map(key => caches.delete(key)));
      })
    );
  }
  
  if (event.data && event.data.type === 'CHECK_VERSION') {
    // Responder con la versión actual
    event.ports[0].postMessage({
      version: CACHE_VERSION
    });
  }
});

// ==============================
// SYNC - SINCRONIZACIÓN EN BACKGROUND
// ==============================
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    console.log('🔄 SW: Sincronizando datos en background');
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Notificar a la app que sincronice
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_DATA'
    });
  });
}
