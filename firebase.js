import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, connectAuthEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// Importar manejo de errores
import '../utils/error-handler.js';

// Cargar variables de entorno desde el objeto window para el frontend
const getEnvVar = (key) => {
  if (typeof window === 'undefined' || !window.__ENV__) {
    console.error('window.__ENV__ no está definido. Asegúrate de cargar config/env.js antes de firebase.js');
    return undefined;
  }
  return window.__ENV__[key];
};

// Verificar que todas las variables de entorno requeridas estén presentes
const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID'
];

for (const envVar of requiredEnvVars) {
  if (!getEnvVar(envVar)) {
    console.error(`Variable de entorno requerida no encontrada: ${envVar}`);
  }
}

const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
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

  // Forzar persistencia local de sesión para evitar logout inmediato
  import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js').then(({ setPersistence, browserLocalPersistence }) => {
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('✅ Persistencia de sesión configurada a local');
      })
      .catch((error) => {
        console.error('❌ Error configurando persistencia de sesión:', error);
      });
  });

  // Configurar timeouts más largos y menos restrictivos para auth
  auth.settings = {
    appVerificationDisabledForTesting: false
  };

  // Configurar límites de intentos menos restrictivos
  if (auth.tenantId !== null) {
    // Configuración para reducir restricciones de Firebase Auth
    auth._config = {
      ...auth._config,
      rateLimitTimeout: 30000, // 30 segundos en lugar de 15 minutos
      maxAttempts: 10, // Más intentos permitidos
      backoffMultiplier: 1.5 // Factor de backoff más suave
    };
  }

  console.log('✅ Firebase inicializado correctamente');
  console.log('🔧 Límites de autenticación configurados para desarrollo');

  // Solo inicializar analytics si está soportado en el navegador
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

  // Conectar a emuladores solo si se habilita explícitamente
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
  
  // En caso de error de Firebase, mostrar mensaje más útil
  if (error.code === 'auth/network-request-failed') {
    console.error('🌐 Error de red: Verifica tu conexión a internet y que Firebase esté configurado correctamente');
    console.error('💡 Posibles soluciones:');
    console.error('   1. Verifica que estés conectado a internet');
    console.error('   2. Verifica que las reglas de CSP permitan conexiones a Firebase');
    console.error('   3. Verifica que el proyecto de Firebase esté activo');
  }
  
  throw error;
}

export { app, auth, db, storage, analytics };