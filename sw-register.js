// Registro global de Service Worker para todas las páginas PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function() {
    try {
      // Verificar si ya existe un registro activo
      let registration = await navigator.serviceWorker.getRegistration();
      
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
      console.log('Error al registrar el ServiceWorker:', error);
    }
  });
}
