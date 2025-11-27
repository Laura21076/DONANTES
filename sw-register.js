// Registro global de Service Worker para todas las páginas PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    let registration = null;
    
    try {
      // Verificar si ya existe un registro activo
      registration = await navigator.serviceWorker.getRegistration();
      
      if (registration) {
        console.log('ServiceWorker ya registrado:', registration.scope);
        // Verificar actualizaciones
        registration.update().catch(function(err) {
          console.log('Error al verificar actualizaciones del ServiceWorker:', err);
        });
      } else {
        // Registrar nuevo Service Worker
        registration = await navigator.serviceWorker.register('./sw.js');
        console.log('ServiceWorker registrado con éxito:', registration.scope);
      }

      // Esperar a que el Service Worker esté activo si está instalando
      if (registration.installing || registration.waiting) {
        const sw = registration.installing || registration.waiting;
        sw.addEventListener('statechange', function() {
          if (sw.state === 'activated') {
            console.log('ServiceWorker activado y listo');
          }
        });
      } else if (registration.active) {
        console.log('ServiceWorker activo y listo');
      }
    } catch (error) {
      console.error('Error al registrar el ServiceWorker:', error);
      // Intentar limpiar cache y reintentar una vez
      if (error.message && error.message.includes('Failed')) {
        console.log('Intentando limpiar cache y reintentar...');
        try {
          const names = await caches.keys();
          await Promise.all(names.map(function(name) {
            return caches.delete(name);
          }));
        } catch (cacheError) {
          console.error('Error limpiando cache:', cacheError);
        }
      }
    }
    
    // Manejar actualizaciones del Service Worker (fuera del try/catch principal)
    if (registration) {
      registration.addEventListener('updatefound', function() {
        const newWorker = registration.installing;
        console.log('Nueva versión del Service Worker encontrada');
        
        if (newWorker) {
          newWorker.addEventListener('statechange', function() {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('Nueva versión del Service Worker instalada');
            }
          });
        }
      });
    }
  });
  
  // Manejar cambios en el controlador del Service Worker
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    console.log('Service Worker controller ha cambiado');
  });
}
