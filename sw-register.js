// Registro global de Service Worker para todas las páginas PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    let registration = null;
    try {
      registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        console.log('ServiceWorker ya registrado:', registration.scope);
        registration.update().catch(function(err) {
          console.log('Error al verificar actualizaciones del ServiceWorker:', err);
        });
      } else {
        registration = await navigator.serviceWorker.register('./sw.js');
        console.log('ServiceWorker registrado con éxito:', registration.scope);
      }
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
      if (error.message && error.message.includes('Failed')) {
        console.log('Intentando limpiar cache y reintentar...');
        try {
          const names = await caches.keys();
          await Promise.all(names.map(function(name) { return caches.delete(name); }));
          registration = await navigator.serviceWorker.register('./sw.js');
          console.log('ServiceWorker re-registrado:', registration.scope);
        } catch (err2) {
          console.error('Error al limpiar cache y reintentar:', err2);
        }
      }
    }
  });
}
