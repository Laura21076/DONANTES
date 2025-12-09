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
  "firebase.js",
  // Bootstrap y FontAwesome
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
  // Fuentes locales (no Google Fonts)
  "./fonts/Rubik-Regular.ttf",
  "./fonts/Rubik-Light.ttf",
  "./fonts/Rubik-Bold.ttf",
  "./fonts/Rubik-Black.ttf",
  "./fonts/MoiraiOne-Regular.ttf",
  // Assets
  "assets/logo.ico",
  "assets/logo192.png",
  "assets/logo512.png",
  "assets/placeholder.png",
  "assets/S_SDG_inverted_WEB-12.png"
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
  // No interceptar peticiones externas a la API, fuentes remotas ni Firebase Auth
  const url = event.request.url;
  if (
    url.includes('/api/') ||
    url.startsWith('https://fonts.googleapis.com') ||
    url.startsWith('https://fonts.gstatic.com') ||
    url.includes('identitytoolkit.googleapis.com')
  ) {
    return;
  }
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
