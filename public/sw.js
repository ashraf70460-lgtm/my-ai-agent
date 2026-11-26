// PULMONOLOGIST-AGENT offline support: app shell cached, network-first so updates show immediately.
const VERSION = 'pulmo-v3.1';
const BASE = '/';
const SHELL = [BASE, BASE + 'index.html', BASE + 'app.css', BASE + 'data.js', BASE + 'data/config.json', BASE + 'data/trials.js', BASE + 'data/guidelines.js', BASE + 'data/subspecialties.js', BASE + 'js/core.js', BASE + 'js/pdf.js', BASE + 'js/v-home.js', BASE + 'js/v-research.js', BASE + 'js/v-evidence.js', BASE + 'js/v-library.js', BASE + 'js/v-more.js', BASE + 'js/app.js', BASE + 'vendor/pdfmake.min.js', BASE + 'vendor/vfs_fonts.js', BASE + 'manifest.webmanifest', BASE + 'icons/icon.svg', BASE + 'icons/icon-192.png'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('pulmo-') && k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then((m) => m || caches.match(BASE + 'index.html'))));
});
