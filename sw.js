// PWA Service Worker (Snapshot Log)
const VERSION = 'mw-v1.7.0';
const APP_SHELL = ['./','./index.html','./manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(cache => cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k!==VERSION).map(k => caches.delete(k)))) );
  self.clients.claim();
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // Weather: network-first
  if (url.hostname.includes('open-meteo.com')) {
    event.respondWith(fetch(event.request).then(res => {
      caches.open(VERSION).then(cache => cache.put(event.request, res.clone()));
      return res;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  // History JSON: network-first
  if (url.pathname.endsWith('/history/history.json')) {
    event.respondWith(fetch(event.request).then(res => {
      caches.open(VERSION).then(cache => cache.put(event.request, res.clone()));
      return res;
    }).catch(()=>caches.match(event.request)));
    return;
  }
  // Tiles/libs/GPX/static: cache-first
  if (url.hostname.includes('basemaps.cartocdn.com') || url.hostname.includes('unpkg.com') ||
      url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.png') ||
      url.pathname.endsWith('.webmanifest') || url.pathname.endsWith('.json') || url.pathname.endsWith('.gpx')) {
    event.respondWith(caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(networkRes => {
        caches.open(VERSION).then(cache => cache.put(event.request, networkRes.clone()));
        return networkRes;
      }).catch(()=>cached);
      return cached || fetchPromise;
    }));
    return;
  }
  event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
