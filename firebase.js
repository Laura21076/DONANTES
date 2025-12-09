// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyBaBir5mquN-xK-6H-92Wcf_Mp6muY4cSQ",
  authDomain: "donantes-400ba.firebaseapp.com",
  databaseURL: "https://donantes-400ba-default-rtdb.firebaseio.com",
  projectId: "donantes-400ba",
  storageBucket: "donantes-400ba.appspot.com",
  messagingSenderId: "202152301689",
  appId: "1:202152301689:web:5485bb0344ba6a821030a8",
  measurementId: "G-NR3LS2M6YV"
};

import { getApps } from 'https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js';
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  connectAuthEmulator
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { getAnalytics, isSupported } from 'https://www.gstatic.com/firebasejs/10.7.2/firebase-analytics.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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

// ==== Firebase config ====
const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY'),
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('FIREBASE_APP_ID'),
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID')
};

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
// ==== Firebase config ====
const firebaseConfig = {
  apiKey: getEnvVar('FIREBASE_API_KEY') || "AIzaSyBaBir5mquN-xK-6H-92Wcf_Mp6muY4cSQ",
  authDomain: getEnvVar('FIREBASE_AUTH_DOMAIN') || "donantes-400ba.firebaseapp.com",
  projectId: getEnvVar('FIREBASE_PROJECT_ID') || "donantes-400ba",
  storageBucket: getEnvVar('FIREBASE_STORAGE_BUCKET') || "donantes-400ba.appspot.com",
  messagingSenderId: getEnvVar('FIREBASE_MESSAGING_SENDER_ID') || "202152301689",
  appId: getEnvVar('FIREBASE_APP_ID') || "1:202152301689:web:5485bb0344ba6a821030a8",
  measurementId: getEnvVar('FIREBASE_MEASUREMENT_ID') || "G-NR3LS2M6YV"

export { app, auth, db, storage, analytics };
