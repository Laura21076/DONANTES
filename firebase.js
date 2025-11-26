import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Importar manejo de errores propio
import './error-handler.js';

// Obtiene variable de entorno de window.__ENV__
const getEnvVar = (key) => {
  if (typeof window === 'undefined' || !window.__ENV__) {
    console.error('window.__ENV__ no está definido. Asegúrate de cargar env.js antes de firebase.js');
    return undefined;
  }
  return window.__ENV__[key];
};

// Verifica que TODAS las variables esenciales están
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET' // AÑADIDO AQUÍ por si acaso
];
for (const envVar of requiredEnvVars) {
  if (!getEnvVar(envVar)) {
    console.error(`Variable de entorno requerida no encontrada: ${envVar}`);
  }
}

// Construcción de configuración de Firebase
const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'), // ¡AHORA CORRECTO!
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('FIREBASE_APP_ID'),
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID')
};

let app;
let auth;
let db;
let analytics = null;
let storage;

try {
  console.log('🔧 Inicializando Firebase...');
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);

  // Persistencia local: preferible dentro de un import()
  import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ setPersistence, browserLocalPersistence }) => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('✅ Persistencia de sesión configurada a local');
      })
      .catch((error) => {
        console.error('❌ Error configurando persistencia de sesión:', error);
      });
  });

  // Settings de auth (experimental, solo si lo requieres)
  auth.settings = {
    appVerificationDisabledForTesting: false
  };

  // Solo para desarrolladores avanzados: límites de intentos (opcional)
  if (auth.tenantId !== null) {
    auth._config = {
      ...auth._config,
      rateLimitTimeout: 30000,
      maxAttempts: 10,
      backoffMultiplier: 1.5
    };
  }

  // Analytics solo si es soportado
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
      console.log('📊 Analytics inicializado');
    } else {
      console.log('📊 Analytics no soportado en este navegador');
    }
  }).catch(error => {
    console.warn('⚠️ Error al verificar soporte de analytics:', error);
  });

  // Soporte para emuladores de Firebase (opcional según tu entorno)
  const useEmulators = [true, 'true', 1, '1', 'yes', 'on'].includes(getEnvVar('USE_FIREBASE_EMULATOR'));
  if (useEmulators) {
    try {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('🔧 Conectado a los emuladores de Firebase');
    } catch (error) {
      console.warn('⚠️ Error al conectar con los emuladores:', error);
    }
  }
} catch (error) {
  console.error('❌ Error al inicializar Firebase:', error);
  if (error.code === 'auth/network-request-failed') {
    console.error('🌐 Error de red: Verifica tu conexión a internet y las configuraciones de Firebase');
    console.error('💡 Revisa conexión, CSP, y reglas de Firebase.');
  }
  throw error;
}

export { app, auth, db, storage, analytics };
