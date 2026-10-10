/**
 * =====================================================================
 * SERVICE WORKER — COLOMBIANOPEDIA (MODO PWA OFFLINE COMPLETO)
 * =====================================================================
 */

const CACHE_NAME = 'colombianopedia-v1.2';

const PRECACHE_RESOURCES = [
  './',
  './index.html',
  './precolombina.html',
  './muiscas.html',
  './colonia.html',
  './independencia.html',
  './siglo-xix.html',
  './siglo-xx.html',
  './geografia-y-geologia.html',
  './memoria.html',
  './iceberg-violencia.html',
  './otras-culturas.html',
  './ciudades-historicas.html',
  './leyendas-ancestrales.html',
  './mentes-y-figuras.html',
  './css/style.css',
  './js/main.js',
  './js/atlas-indigena.js',
  './js/centro-verdad.js',
  './manifest.json',
  './assets/images/icon-colombianopedia.svg',
  './assets/images/colombia_departments.svg',
  './data/censo_maestro_115_pueblos_indigenas.json',
  './data/cev_datos_forenses_dih.json',
  './data/cev_relato_historico_etapas.json',
  './data/cev_hallazgos_recomendaciones.json',
  './data/cev_territorio_etnico_humano.json'
];

// Instalación: Pre-almacenamiento en caché de la concha de la app y datos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline portal shell...');
      return cache.addAll(PRECACHE_RESOURCES).catch((err) => {
        console.warn('[ServiceWorker] Some pre-cache resources could not be fetched:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activación: Purga de cachés obsoletas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((name) => {
          if (name !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercepción de peticiones (Stale-While-Revalidate para contenido dinámico, Cache-First para estáticos)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Ignorar peticiones de otros esquemas (ej: chrome-extension://)
  if (!event.request.url.startsWith('http')) return;

  // Para peticiones de navegación y datos JSON: Stale-While-Revalidate
  if (event.request.mode === 'navigate' || url.pathname.endsWith('.json') || url.pathname.endsWith('.html')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Si no hay red y estamos navegando, devolver index si no hay caché
            return cachedResponse || caches.match('./index.html');
          });

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Para imágenes y recursos estáticos: Cache-First con recarga en segundo plano
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Fallback silencioso si no hay conexión
        return new Response('', { status: 408, statusText: 'Offline' });
      });
    })
  );
});
