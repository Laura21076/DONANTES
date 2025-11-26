// Registro global de Service Worker para todas las páginas PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js')
      .then(function(registration) {
        console.log('ServiceWorker registrado con éxito:', registration.scope);
      })
      .catch(function(error) {
        console.log('Error al registrar el ServiceWorker:', error);
      });
  });
}

