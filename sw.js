/**
 * Service Worker for Stroop Test PWA
 * 支援全離線遊玩與極速載入
 */

const CACHE_NAME = 'stroop-pwa-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './src/styles/main.css',
  './src/styles/components.css',
  './src/core/stroop-generator.js',
  './src/core/timer.js',
  './src/core/stats-calculator.js',
  './src/services/storage.js',
  './src/services/audio.js',
  './src/services/haptics.js',
  './src/components/chart.js',
  './src/components/modal.js',
  './src/main.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Safe offline fallback
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
