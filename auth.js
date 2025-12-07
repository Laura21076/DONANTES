// --- auth.js completo ---
// Incluye: login, logout robusto, registro, recuperación de contraseña,
// actualización de usuario, Google login, listeners de usuario y todo lo necesario.

// Dependencias externas de Firebase y funciones auxiliares
import { saveToken, getToken, clearTokens } from './db.js';         // Implementa tu propio saveToken etc
import { showSpinner, hideSpinner, handleAuthError } from './ui.js';
import { auth } from './firebase.js'; // Instancia de Firebase Auth

import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// --- Sesión multi-tab Logout sync ---
if (typeof window !== "undefined") {
  window.addEventListener("storage", function(event) {
    if (event.key === "logout") {
      window.location.href = "login.html";
    }
  });
}

// --- Obteniendo siempre el usuario actual de forma robusta ---
let __authInitPromise = null;
let __authInitDone = false;
export function getCurrentUser() {
  if (__authInitDone) return Promise.resolve(auth.currentUser);
  if (__authInitPromise) return __authInitPromise;
  __authInitPromise = new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      __authInitDone = true;
      resolve(user);
    });
  });
  return __authInitPromise;
}
window.getCurrentUser = getCurrentUser;

// Obtener un idToken válido
export async function getIdToken() {
  const user = await getCurrentUser();
  if (!user) throw { code: "UNAUTHORIZED", message: "No autenticado" };
  return await user.getIdToken();
}
window.getIdToken = getIdToken;

// --- LOGIN CON EMAIL Y PASSWORD ---
export async function login(email, password) {
  showSpinner();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    console.log('[auth.js] Firebase idToken:', idToken?.substring(0, 30) + '...');
    // Solicita el JWT del backend usando el idToken de Firebase
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    console.log('[auth.js] POST /api/auth/firebase status:', response.status);
    if (!response.ok) throw new Error('No se pudo obtener el JWT del backend');
    const { token: jwt } = await response.json();
    console.log('[auth.js] JWT recibido del backend:', jwt?.substring(0, 30) + '...');
    // Guarda el JWT del backend
    await saveToken('access', jwt);
    return userCredential.user;
  } catch (error) {
    console.error('[auth.js] Error en login:', error);
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

// --- LOGIN CON GOOGLE POPUP ---
export async function loginWithGoogle() {
  showSpinner();
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await result.user.getIdToken();
    await saveToken('access', idToken);
    return result.user;
  } catch (error) {
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

// --- REGISTRO DE USUARIO ---
export async function register(email, password, displayName) {
  showSpinner();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }
    const idToken = await userCredential.user.getIdToken();
    console.log('[auth.js] Firebase idToken (register):', idToken?.substring(0, 30) + '...');
    // Solicita el JWT del backend usando el idToken de Firebase
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken })
    });
    console.log('[auth.js] POST /api/auth/firebase (register) status:', response.status);
    if (!response.ok) throw new Error('No se pudo obtener el JWT del backend');
    const { token: jwt } = await response.json();
    console.log('[auth.js] JWT recibido del backend (register):', jwt?.substring(0, 30) + '...');
    // Guarda el JWT del backend
    await saveToken('access', jwt);
    return userCredential.user;
  } catch (error) {
    console.error('[auth.js] Error en register:', error);
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

// --- LOGOUT ROBUSTO MULTI-TAB ---
export async function logout() {
  showSpinner();
  try {
    await signOut(auth);   // Cierra sesión Firebase corriente
    await clearTokens();   // Borra cualquier token de app extra
    window.localStorage.setItem("logout", Date.now()); // Notifica otras pestañas
    window.location.href = "login.html";
  } catch (error) {
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

// --- RECUPERAR CONTRASEÑA POR EMAIL ---
export async function resetPassword(email) {
  showSpinner();
  try {
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

// --- ACTUALIZAR PERFIL USUARIO (displayName, email, password) ---
export async function updateUserProfile(data) {
  const user = await getCurrentUser();
  if (!user) throw { code: "UNAUTHORIZED", message: "No autenticado" };
  if (data.displayName) await updateProfile(user, { displayName: data.displayName });
  if (data.email && data.email !== user.email) await updateEmail(user, data.email);
  if (data.password) await updatePassword(user, data.password);
  return user;
}

// --- LISTENER DE CAMBIO DE SESIÓN ---
export function onUserAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
window.onUserAuthStateChange = onUserAuthStateChange;

// --- EXTRA: OBTENER SOLO EL TOKEN DE ACCESO DE STORAGE ---
export async function getSavedToken() {
  return await getToken('access');
}

// --- EXTRA ÚTIL: Checa si el usuario está autenticado ---
export async function isAuthenticated() {
  const user = await getCurrentUser();
  return !!user;
}

// --- ASOCIAR FUNCIONALIDAD AL BOTÓN DE LOGOUT DESDE HTML ---
// (Pon esto en el main js después que cargues auth.js)
// import { logout } from './auth.js';
// document.getElementById('logoutBtn').addEventListener('click', (e) => {
//   e.preventDefault();
//   logout();
// });
