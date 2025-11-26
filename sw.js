// Versión actual de la aplicación con cache-busting
const VERSION = `v2.8.0-${Date.now()}`;
const CACHE_NAME = `donationcenter-${VERSION}`;
const RUNTIME_CACHE = `runtime-cache-${VERSION}`;

// Cache busting automático
const FORCE_UPDATE = true; // Fuerza actualizaciones inmediatas

// Archivos críticos a cachear para funcionamiento offline
const urlsToCache = [
  // Páginas HTML - solo archivos que sabemos que existen
  "./",
  "index.html",
  "login.html", 
  "register.html",
  "donationcenter.html",
  "requests.html",
  "reset-password.html",
  "auth-required.html",
  
  // Estilos CSS
  "styles.css",
  "index.css",
  "donationcenter.css",
  "auth.css",
  "requests.css",
  "two-factor.css",
  
  // JavaScript - Solo archivos existentes
  "script.js",
  "session-manager.js",
  "login.js",
  "register.js",
  "donationcenter.js",
  "profile.js",
  "requests-page.js",
  "reset-password.js",
  
  // JavaScript - Servicios
  "auth.js",
  "firebase.js",
  "db.js",
  "profile.js",
  "articles.js",
  "requests.js",
  "notifications.js",
  
  // JavaScript - Utilidades
  "ui.js",
  
  // Configuración
  "env.js",
  
  // PWA
  "manifest.json",
  "sw.js",
  "pwa-debug.html",
  
  // Assets - Solo imágenes que existen
  "/DONANTES/assets/logo.ico",
  "/DONANTES/assets/logo192.png",
  "/DONANTES/assets/logo512.png",
  
  
  // Archivos HTML especiales
  "verificar-permisos.html",
  "test-edit-delete.html",
  "reinicio-completo.html",
  "clear-cache-force.html",
  
  // CDN externas (críticas)
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css",
  "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css",
  "https://fonts.googleapis.com/css2?family=Rubik:wght@400;600;700&family=Moirai+One&display=swap",
  "https://fonts.gstatic.com/s/rubik/v28/iJWZBXyIfDnIV5PNhY1KTN7Z-Yh-B4iFVUUzdYPFkaVNA6w.woff2",
  "https://fonts.gstatic.com/s/moiraione/v11/2sDcZGJYm4e-k2eP_9twI4J-oeFbJF.woff2"
];

// Instalar y cachear los recursos
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("Archivos cacheados correctamente");
      return cache.addAll(urlsToCache);
    })
  );
});

// Activar y limpiar versiones antiguas del caché
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
  console.log("Service Worker activado, versión:", VERSION);
});

// Interceptar peticiones y servir desde el caché si está disponible
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Ignorar peticiones no GET para mejor rendimiento
  if (request.method !== 'GET') {
    return;
  }
  
// Estrategia Network First solo para APIs externas relevantes en producción
if (
    url.hostname.includes('firebase') || 
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebaseio.com') ||
    url.hostname.includes('firebasestorage.googleapis.com') ||
    url.origin === 'https://donantes-backend-202152301689.northamerica-south1.run.app' ||
    url.pathname.startsWith('/api/')
) {
  event.respondWith(
    fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then(cache => {
            cache.put(request, responseClone);
            setTimeout(() => cache.delete(request), 300000);
          });
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
  return;
}
  // Estrategia Cache First para recursos estáticos con stale-while-revalidate
  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) {
          // Servir desde cache inmediatamente
          // Y actualizar en background
          fetch(request).then(fetchResponse => {
            if (fetchResponse.ok) {
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, fetchResponse);
              });
            }
          }).catch(() => {});
          
          return response;
        }
        
        // Si no está en caché, intentar fetch
        return fetch(request)
          .then(fetchResponse => {
            // Verificar si es una respuesta válida
            if (!fetchResponse || fetchResponse.status !== 200 || fetchResponse.type !== 'basic') {
              return fetchResponse;
            }
            
            // Cachear la respuesta para futuras consultas
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(request, responseToCache);
              });
            
            return fetchResponse;
          })
          .catch(() => {
            // Fallback para páginas HTML no cacheadas
            if (request.headers.get('accept').includes('text/html')) {
              return caches.match('index.html');
            }
          });
      })
  );
});

// ================== NOTIFICACIONES PUSH ==================

// Manejar notificaciones push
self.addEventListener("push", event => {
  console.log("📩 Push notification recibida:", event);
  
  let notificationData = {
    title: "DonantesApp",
    body: "Tienes una nueva notificación",
    icon: "assets/icon-192x192.png",
    badge: "assets/icon-72x72.png",
    vibrate: [100, 50, 100],
    tag: "donantes-notification",
    requireInteraction: false,
    actions: [
      {
        action: "view",
        title: "Ver",
        icon: "assets/icon-view.png"
      },
      {
        action: "dismiss",
        title: "Descartar",
        icon: "assets/icon-dismiss.png"
      }
    ]
  };

  // Si hay datos en el push, usar esos datos
  if (event.data) {
    try {
      const pushData = event.data.json();
      notificationData = {
        ...notificationData,
        ...pushData,
        data: pushData // Guardar data extra para manejar clicks
      };
    } catch (e) {
      console.error("Error al parsear datos de push:", e);
    }
  }

  const promiseChain = self.registration.showNotification(
    notificationData.title,
    notificationData
  );

  event.waitUntil(promiseChain);
});

// Manejar clicks en las notificaciones
self.addEventListener("notificationclick", event => {
  console.log("🔔 Click en notificación:", event);
  
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  if (action === "dismiss") {
    return;
  }

  // Determinar URL de destino
  let targetUrl = "/";
  
  if (data.type === "request_approved") {
    targetUrl = "requests.html";
  } else if (data.type === "new_request") {
    targetUrl = "requests.html";
  } else if (data.articleId) {
    targetUrl = `donationcenter.html`;
  }

  // Abrir la aplicación o navegar a la URL
  event.waitUntil(
    clients.matchAll().then(clientList => {
      // Buscar si ya hay una ventana abierta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.focus();
          client.navigate(targetUrl);
          return;
        }
      }
      
      // Si no hay ventana abierta, abrir una nueva
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Manejar cierre de notificaciones
self.addEventListener("notificationclose", event => {
  console.log("❌ Notificación cerrada:", event.notification.tag);
});

