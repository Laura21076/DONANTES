// error-handler.js - Manejo robusto de errores globales

console.log('🛡️ Inicializando manejo global de errores...');

const EXTENSION_ERRORS = [
  'message channel closed',
  'Extension context invalidated',
  'chrome-extension://',
  'moz-extension://',
  'Attempting to use a disconnected port object',
  'Could not establish connection',
  'listener indicated an asynchronous response'
];

function isExtensionError(message) {
  if (!message || typeof message !== 'string') return false;
  return EXTENSION_ERRORS.some(pattern => message.toLowerCase().includes(pattern.toLowerCase()));
}

// Manejo de errores JavaScript generales
window.addEventListener('error', function(event) {
  const message = event.message || '';
  const source = event.filename || '';

  if (isExtensionError(message) || isExtensionError(source)) {
    console.log('⚠️ Error de extensión ignorado:', message);
    event.preventDefault();
    return true;
  }

  console.error('💥 Error JavaScript:', {
    message,
    source,
    line: event.lineno,
    column: event.colno,
    stack: event.error ? event.error.stack : 'N/A'
  });

  return false;
}, true);

// Manejo de promises rechazadas
window.addEventListener('unhandledrejection', function(event) {
  const reason = event.reason;
  const message = reason && reason.message ? reason.message : String(reason);

  if (isExtensionError(message)) {
    console.log('⚠️ Promise rejection de extensión ignorado:', message);
    event.preventDefault();
    return;
  }

  console.error('💥 Promise Rejection:', {
    reason,
    message,
    stack: reason && reason.stack ? reason.stack : 'N/A'
  });
}, true);

// CSP Violation Handler
document.addEventListener('securitypolicyviolation', function(event) {
  const directive = event.violatedDirective;
  const source = event.sourceFile;
  const blockedURI = event.blockedURI;

  if (isExtensionError(source) || isExtensionError(blockedURI)) {
    console.log('⚠️ CSP violation de extensión ignorado:', {
      directive,
      source,
      blockedURI
    });
    return;
  }

  console.error('🚫 CSP Violation:', {
    directive,
    blockedURI,
    source,
    line: event.lineNumber
  });
});

// Captura errores de red
function setupNetworkErrorHandling() {
  const originalFetch = window.fetch;

  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(error => {
      if (!isExtensionError(error.message)) {
        console.error('🌐 Network Error:', {
          url: args[0],
          error: error.message
        });
      }
      throw error;
    });
  };
}

setupNetworkErrorHandling();

// Firebase Error Handler
window.handleFirebaseError = function(error, context = 'Firebase') {
  console.error(`🔥 ${context} Error:`, {
    code: error.code,
    message: error.message,
    stack: error.stack
  });

  const errorMessages = {
    'auth/user-not-found': 'Usuario no encontrado. Verifica tu email.',
    'auth/wrong-password': 'Contraseña incorrecta.',
    'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
    'auth/network-request-failed': 'Error de red. Verifica tu conexión.',
    'auth/invalid-email': 'Email inválido.',
    'auth/user-disabled': 'Usuario deshabilitado.',
    'auth/operation-not-allowed': 'Operación no permitida.',
    'permission-denied': 'Permisos insuficientes.',
    'unavailable': 'Servicio no disponible. Intenta más tarde.'
  };

  return errorMessages[error.code] || error.message || 'Error desconocido';
};

console.log('✅ Manejo global de errores inicializado');

export { isExtensionError, setupNetworkErrorHandling };
