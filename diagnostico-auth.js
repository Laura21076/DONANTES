// Diagnóstico de autenticación y tokens Donantes2025
// Instrucciones: Incluye este script en cualquier página protegida (ej: donationcenter.html) para ver el estado de autenticación y tokens en consola.

import { auth } from '../services/firebase.js';
import { getCurrentUser, getIdToken } from '../services/auth.js';
import { getToken } from '../services/db.js';

window.runAuthDiagnostics = async function() {
  console.group('%c🔎 Diagnóstico de Autenticación Donantes2025', 'color: purple; font-weight: bold;');
  try {
    // 1. Estado de usuario Firebase
    const firebaseUser = auth.currentUser;
    if (firebaseUser) {
      console.log('✅ Usuario Firebase:', firebaseUser.email, firebaseUser.uid);
    } else {
      console.warn('❌ No hay usuario autenticado en Firebase (auth.currentUser es null)');
    }

    // 2. Estado de usuario app (getCurrentUser)
    const appUser = getCurrentUser();
    if (appUser) {
      console.log('✅ Usuario app:', appUser.email, appUser.uid);
    } else {
      console.warn('❌ getCurrentUser() retornó null');
    }

    // 3. Token actual (getIdToken)
    try {
      const idToken = await getIdToken();
      console.log('✅ Token ID Firebase:', idToken ? idToken.substring(0, 30) + '...' : null);
    } catch (e) {
      console.error('❌ Error obteniendo ID token:', e);
    }

    // 4. Token guardado en IndexedDB
    try {
      const savedToken = await getToken('access');
      console.log('✅ Token guardado en IndexedDB:', savedToken ? savedToken.substring(0, 30) + '...' : null);
    } catch (e) {
      console.error('❌ Error leyendo token de IndexedDB:', e);
    }

    // 5. Cookies relevantes
    console.log('Cookies:', document.cookie);
  } catch (err) {
    console.error('❌ Error general en diagnóstico:', err);
  }
  console.groupEnd();
};

console.info('%cℹ️ Ejecuta runAuthDiagnostics() en la consola para ver el estado de autenticación.', 'color: purple; font-weight: bold;');
