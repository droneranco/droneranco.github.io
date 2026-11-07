// Ranco · service worker: la app abre sin señal; los datos van siempre por la red.
const CACHE = 'ranco-v3';
const BASE = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(BASE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Pantalla de la app: primero la red (para recibir actualizaciones), si no hay señal, la copia guardada.
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/app\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(function (r) {
      const copia = r.clone();
      caches.open(CACHE).then(function (c) { c.put('index.html', copia); });
      return r;
    }).catch(function () { return caches.match('index.html'); }));
    return;
  }
  // Íconos, manifiesto y tipografía: copia guardada y se refresca por detrás.
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(caches.open(CACHE).then(function (c) {
      return c.match(req).then(function (hit) {
        const red = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(function () { return hit; });
        return hit || red;
      });
    }));
  }
});
