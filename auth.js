// auth.js
import { saveToken, getToken, clearTokens } from './db.js';
import { showSpinner, hideSpinner, handleAuthError } from './ui.js';
import { auth } from './firebase.js';
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

// --- FUNCIONES DE AUTENTICACIÓN ---

/**
 * Iniciar sesión con email y contraseña.
 */
export async function login(email, password) {
  showSpinner();
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);

    const idToken = await userCredential.user.getIdToken();
    await saveToken('access', idToken);

    return userCredential.user;
  } catch (error) {
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

/**
 * Registrar una nueva cuenta.
 */
export async function register(email, password, displayName) {
  showSpinner();
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Asignar nombre
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    // Guardar token
    const idToken = await userCredential.user.getIdToken();
    await saveToken('access', idToken);

    return userCredential.user;
  } catch (error) {
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}


/**
 * Salir de la sesión.
 */
export async function logout() {
  showSpinner();
  try {
    await signOut(auth);
    await clearTokens();
  } catch (error) {
    handleAuthError(error);
    throw error;
  } finally {
    hideSpinner();
  }
}

/**
 * Obtener usuario actual de Firebase Auth (objeto User, o null)
 */
export function getCurrentUser() {
  return auth.currentUser;
}
window.getCurrentUser = getCurrentUser;

/**
 * Obtener el ID Token actual (actualizado)
 */
export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) throw { code: "UNAUTHORIZED", message: "No autenticado" };
  return await user.getIdToken();
}
window.getIdToken = getIdToken;

/**
 * Restablecer contraseña por email.
 */
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

/**
 * Actualizar perfil del usuario.
 */
export async function updateUserProfile(data) {
  const user = auth.currentUser;
  if (!user) throw { code: "UNAUTHORIZED", message: "No autenticado" };
  if (data.displayName) await updateProfile(user, { displayName: data.displayName });
  if (data.email && data.email !== user.email) await updateEmail(user, data.email);
  if (data.password) await updatePassword(user, data.password);
  return user;
}

/**
 * Listener de cambio de autenticación.
 * @param {Function} callback - Recibe el usuario actual o null.
 */
export function onUserAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback);
}
window.onUserAuthStateChange = onUserAuthStateChange;

