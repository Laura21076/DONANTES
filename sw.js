// Versión actual de la aplicación con cache-busting
const VERSION = `v2.8.0-${Date.now()}`;
const CACHE_NAME = `donationcenter-${VERSION}`;
const RUNTIME_CACHE = `runtime-cache-${VERSION}`;
const FORCE_UPDATE = true;
const urlsToCache = [
  "./",
  "index.html",
  "login.html",
  "register.html",
  "donationcenter.html",
  "requests.html",
  "reset-password.html",
  "auth-required.html",
  "styles.css",
  "index.css",
  "donationcenter.css",
  "auth.css",
  "requests.css",
  "two-factor.css",
  "script.js",
  "session-manager.js",
  "login.js",
  "register.js",
  "donationcenter.js",
  "profile.js",
  "requests-page.js",
  "reset-password.js",
  "auth.js",
  "firebase.js"
];
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(key => {
      if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
        return caches.delete(key);
      }
    })))
  );
  self.clients.claim();
});
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
