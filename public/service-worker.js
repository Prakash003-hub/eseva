// Service Worker for Subi e sevai PWA
self.addEventListener('install', (e) => {
  console.log('[Service Worker] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Activated');
  return self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  // Pass-through fetch handler required for PWA installation criteria
  e.respondWith(fetch(e.request));
});
