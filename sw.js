/* ============================================================
   SERVICE WORKER — v6.0 (Modular Architecture)
   Caches all modular CSS/JS files
   ============================================================ */
const CACHE_NAME = 'puzzle-v6';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  // Shared
  './shared/design-system.css',
  './shared/layout.css',
  './shared/overlays.css',
  './shared/utils.js',
  './shared/app.js',
  // Sliding Puzzle
  './games/sliding-puzzle/style.css',
  './games/sliding-puzzle/game.js',
  './games/sliding-puzzle/solver.js',
  // Dama
  './games/dama/style.css',
  './games/dama/game.js',
  // Fonts (cache-bust from Google)
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=Cairo:wght@400;600;700&display=swap',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Network-first for HTML (always fresh)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request).then(r => {
        const clone = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return r;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
      return res;
    }))
  );
});
