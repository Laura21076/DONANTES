// donation-center-init.js - Inicialización del centro de donaciones
// Separado para cumplir con CSP (Content Security Policy)

// Service Worker Registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js')
    .then(registration => console.log('SW registrado:', registration.scope))
    .catch(error => console.log('Error SW:', error));
}

// Inicializar SessionManager para PWA
import('./session-manager.js').then(module => {
  const SessionManager = module.default;
  const sessionManager = new SessionManager();
  window.sessionManager = sessionManager;
  console.log('📱 SessionManager cargado en donation center');
});
