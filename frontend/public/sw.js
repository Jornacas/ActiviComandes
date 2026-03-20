// Service Worker minimo para habilitar PWA install
const CACHE_NAME = 'activicomandes-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first strategy: siempre ir a la red, no cachear
  event.respondWith(fetch(event.request));
});
