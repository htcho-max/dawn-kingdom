// Offline support: the game is one HTML file plus a few static assets.
// The cache name carries the build version, so a new deploy replaces the old cache.
const VERSION = '__VERSION__';
const CACHE = 'dawn-' + VERSION;
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/maskable-512.png', 'icons/apple-touch-icon.png'];
const DEV = VERSION.startsWith('__'); // unbuilt source: stay out of the way
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

self.addEventListener('install', (e) => {
  if (DEV) return self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('dawn-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (DEV || req.method !== 'GET') return;
  const url = new URL(req.url);
  // Page: network first so updates show up, cache when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copy = res.clone(); caches.open(CACHE).then((c) => c.put('index.html', copy)); return res;
    }).catch(() => caches.match('index.html')));
    return;
  }
  // Same-origin assets and web fonts: cache first, fill the cache as we go.
  if (url.origin === location.origin || FONTS.test(req.url)) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
      return res;
    })));
  }
});
