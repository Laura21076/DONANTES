// env.js
// Configuración de variables de entorno para el frontend
window.__ENV__ = {
  // Firebase Web App config (provided by user)
  FIREBASE_API_KEY: "AIzaSyBaBir5mquN-xK-6H-92Wcf_Mp6muY4cSQ",
  FIREBASE_AUTH_DOMAIN: "donantes-400ba.firebaseapp.com",
  FIREBASE_PROJECT_ID: "donantes-400ba",
  FIREBASE_STORAGE_BUCKET: "donantes-400ba.appspot.com", // ← CORRECTO
  FIREBASE_MESSAGING_SENDER_ID: "202152301689",
  FIREBASE_APP_ID: "1:202152301689:web:5485bb0344ba6a821030a8",
  FIREBASE_MEASUREMENT_ID: "G-NR3LS2M6YV",

  // Backend URL - usando 127.0.0.1 para evitar problemas de DNS
  BACKEND_URL: "https://donantes-backend-202152301689.northamerica-south1.run.app",

  // Environment
  NODE_ENV: "development",

  // Emuladores de Firebase (solo si los tienes corriendo): true/false
  USE_FIREBASE_EMULATOR: false
};

