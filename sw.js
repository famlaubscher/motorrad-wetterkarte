// Simple PWA Service Worker for Moto Wetter
const VERSION = 'mw-v1.4.1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(APP_SHELL)).then(self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))),
  );
  self.clients.claim();
});

// Runtime caching
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Network-first for API calls (open-meteo) to keep data fresh
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(
      fetch(event.request).then(res => {
        const clone = res.clone();
        caches.open(VERSION).then(cache => cache.put(event.request, clone)).catch(()=>{});
        return res;
      }).catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for tiles and static libs (Leaflet, CARTO tiles, unpkg)
  if (
    url.hostname.includes('basemaps.cartocdn.com') ||
    url.hostname.includes('unpkg.com') ||
    url.pathname.endsWith('.css') || url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.png') || url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('.json')
  ) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(networkRes => {
          caches.open(VERSION).then(cache => cache.put(event.request, networkRes.clone())).catch(()=>{});
          return networkRes;
        }).catch(()=>cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Default: try network, fallback to cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
