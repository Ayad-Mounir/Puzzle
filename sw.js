/* ============================================================
   SERVICE WORKER — v8.1 (Auto-Update)
   
   آلية التحديث التلقائي:
   - يستمع لرسالة SKIP_WAITING من العميل
   - فور تنشيطه يُرسل رسالة SW_UPDATED لكل النوافذ
   - العميل (utils.js) يعيد تحميل الصفحة تلقائياً
   ============================================================ */
const CACHE_NAME = 'puzzle-v17';

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
  // Snake
  './games/snake/style.css',
  './games/snake/game.js',
  // Memory
  './games/memory/style.css',
  './games/memory/game.js',
];

/* INSTALL — cache everything */
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(c => c.addAll(ASSETS))
      .then(() => {
        // لا نستدعي skipWaiting هنا تلقائياً
        // ننتظر رسالة SKIP_WAITING من العميل
      })
  );
});

/* ACTIVATE — احذف الـ caches القديمة + أرسل إشعار التحديث */
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() => {
        // أرسل رسالة لجميع النوافذ المفتوحة → سيُعيدون التحميل
        self.clients.matchAll({ type: 'window' }).then(clients => {
          clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
        });
      })
  );
});

/* MESSAGE — استقبل SKIP_WAITING من العميل */
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/* FETCH — Network-first للـ HTML، Cache-first لباقي الملفات */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Network-first للـ HTML (دائماً نأخذ أحدث نسخة)
  if (e.request.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const clone = r.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Cache-first لباقي الملفات (CSS, JS, Icons)
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return res;
      });
    })
  );
});
