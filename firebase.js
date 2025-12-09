// firebase.js
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getFirestore, connectFirestoreEmulator } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAnalytics, isSupported } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-analytics.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";


import './error-handler.js';

// ===== Entorno seguro: solo una instancia de App =====
const getEnvVar = (key) => {
  if (typeof window === 'undefined' || !window.__ENV__) {
    console.error('window.__ENV__ no está definido. Asegúrate de cargar env.js antes de firebase.js');
    return undefined;
  }
  return window.__ENV__[key];
};

const requiredEnvVars = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET'
];
for (const envVar of requiredEnvVars) {
  if (!getEnvVar(envVar)) {
    console.error(`Variable de entorno requerida no encontrada: ${envVar}`);
  }
}


// === Inicializar (ONLY ONCE) ===
// Soporta hot reload y SPA.
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Módulos
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

let analytics = null;

// ======= Persistencia antes de CUALQUIER login =========
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log('✅ Persistencia de sesión configurada a local');
  })
  .catch((error) => {
    console.error('❌ Error configurando persistencia de sesión:', error);
  });

// (Opcional, avanzado: Solo si quieres manipular settings experimentales)
// auth.settings = { ... };

// ======= Analytics (si soportado) =========
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

// ======= Emuladores solo si es necesario =====
const useEmulators = [true, 'true', 1, '1', 'yes', 'on'].includes(getEnvVar('USE_FIREBASE_EMULATOR'));
export { app, auth, db, storage, analytics };
