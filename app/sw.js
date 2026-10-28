/* ANCESTOR — offline cache. Bump CACHE on every deploy. */
const CACHE = 'ancestor-v30';  // v29: build identity, update banner, persisted last error
const FILES = [
  './', './index.html', './css/app.css',
  './js/i18n/core.js', './js/i18n/ui.js', './js/i18n/exercises.js', './js/i18n/screens.js', './js/i18n/acc.js', './js/i18n/ar.js', './js/i18n/v2.js', './js/i18n/science.js', './js/i18n/science2.js', './js/i18n/ex_modes.js', './js/i18n/modes.js', './js/i18n/focus.js', './js/i18n/lesson_bodies_en.js', './js/i18n/lesson_bodies_fr.js', './js/i18n/lesson_bodies_es_de.js', './js/i18n/lesson_bodies_it_nl_ar.js', './js/i18n/print.js', './js/i18n/locale.js',
  './js/data/exercises.js', './js/data/ex_meta.js', './js/data/ex_logging.js', './js/data/anatomy_map.js', './js/data/modules.js', './js/data/evidence.js', './js/data/lessons.js', './js/core/acts.js', './js/core/time.js', './js/core/profile.js', './js/core/store.js',
  './js/engine/progression.js', './js/engine/recovery.js',
  './js/engine/readiness.js', './js/engine/program.js', './js/engine/why.js',
  './js/ui/components.js', './js/ui/screens.js', './js/ui/workout.js', './js/ui/printsheet.js', './js/ui/motion.js', './js/ui/modules.js', './js/ui/science.js', './js/ui/anatomy3d.js', './js/app.js',
  './js/vendor/three-bundle.js', './assets/anatomy-male-mobile.glb',
  './manifest.webmanifest', './img/icon-192.png', './img/icon-512.png'
];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(FILES.map(f => c.add(f)))));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
/* Rest ending posts a notification through this worker, because the page that
   owns the timer may be behind another window. Clicking it brings that window
   forward, or opens the app if there is none — a notification that leads
   nowhere is a dead end with a sound. */
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type:'window', includeUncontrolled:true }).then(list => {
    for (const c of list) {
      if ('focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  }));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
      return res;
    }).catch(() => caches.match('./index.html')))
  );
});
