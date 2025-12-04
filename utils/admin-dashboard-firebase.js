/**
 * Dashboard de Administrador - Inicialización Firebase
 * Archivo: admin-dashboard-firebase.js
 */

// Configuración e inicialización de Firebase para el dashboard admin
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore, collection, query, where, orderBy, limit, getDocs } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// Initialize Firebase
const app = initializeApp(window.__ENV__.FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);

// Make available globally
window.firebase = { auth, db };

// Export para uso en otros módulos
export { auth, db };