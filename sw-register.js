// Registro global de Service Worker para todas las páginas PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('./sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registrado con éxito:', registration.scope);
        
        // Manejar actualizaciones del Service Worker
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
      })
      .catch(function(error) {
        console.error('Error al registrar el ServiceWorker:', error);
        // Intentar limpiar cache y reintentar una vez
        if (error.message && error.message.includes('Failed')) {
          console.log('Intentando limpiar cache y reintentar...');
          caches.keys().then(function(names) {
            return Promise.all(names.map(function(name) {
              return caches.delete(name);
            }));
          }).catch(function(cacheError) {
            console.error('Error limpiando cache:', cacheError);
          });
        }
      });
  });
  
  // Manejar cambios en el controlador del Service Worker
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    console.log('Service Worker controller ha cambiado');
  });
}
