import { saveToken, getToken, clearTokens } from "./db.js";
import { showSpinner, hideSpinner, handleAuthError } from "../utils/ui.js";
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

// Estado global de autenticación
let currentUser = null;
const authListeners = new Set();

// Verificar si hay un usuario autenticado con timeout
export async function getUser() {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timeout verificando autenticación'));
    }, 5000);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      clearTimeout(timeout);
      unsubscribe();
      
      if (user) {
        currentUser = user;
        console.log('✅ Usuario autenticado:', user.email);
        resolve(user);
      } else {
        currentUser = null;
        console.log('❌ No hay usuario autenticado');
        resolve(null);
      }
    });
  });
}

// Obtener usuario actual (síncrono)
export function getCurrentUser() {
  if (!currentUser) return null;
  
  // Devolver información completa del usuario
  return {
    uid: currentUser.uid,
    email: currentUser.email,
    displayName: currentUser.displayName,
    photoURL: currentUser.photoURL,
    emailVerified: currentUser.emailVerified,
    phoneNumber: currentUser.phoneNumber,
    createdAt: currentUser.metadata?.creationTime,
    lastLoginAt: currentUser.metadata?.lastSignInTime
  };
}

// Obtener token ID del usuario actual
export async function getIdToken() {
  // Esperar a que Firebase Auth se inicialice si no hay usuario actual
  if (!currentUser) {
    console.log("⚠️ No hay usuario actual, esperando inicialización de Firebase...");
    await new Promise(resolve => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        if (user) {
          currentUser = user;
          unsubscribe();
          resolve();
        } else {
          // Reducir timeout para experiencia más fluida
          setTimeout(() => {
            unsubscribe();
            resolve();
          }, 1000); // Reducido de 3000ms a 1000ms
        }
      });
    });
  }
  
  if (!currentUser) {
    console.log("❌ No hay usuario autenticado después de esperar");
    throw new Error('No hay token de acceso');
  }
  
  try {
    const token = await currentUser.getIdToken(false); // No forzar refresh para mejor performance
    console.log("✅ Token ID obtenido correctamente");
    return token;
  } catch (error) {
    console.error("❌ Error al obtener token ID:", error);
    throw new Error('Error obteniendo token de acceso');
    return null;
  }
}

// Suscribirse a cambios de autenticación
export function subscribeToAuth(callback) {
  authListeners.add(callback);
  callback(currentUser);
  return () => authListeners.delete(callback);
}

// Inicializar listener de Firebase Auth
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (user) {
    const token = await user.getIdToken();
    await saveToken('access', token);
  } else {
    await clearTokens();
  }
  authListeners.forEach(listener => listener(user));
});

// Verificar y refrescar token si es necesario
export async function refreshTokenIfNeeded() {
  if (!currentUser) return null;
  
  try {
    const token = await getToken('access');
    if (!token) return null;

    // Decodificar token sin verificar
    const payload = JSON.parse(atob(token.split('.')[1]));
    const timeToExpire = payload.exp * 1000 - Date.now();

    // Refrescar si expira en menos de 5 minutos
    if (timeToExpire < 300000) {
      return await refreshSession();
    }
    return token;
  } catch (error) {
    console.error('Error al verificar token:', error);
    return null;
  }
}

export async function loginWithEmail(email, password) {
  try {
    showSpinner();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const token = await userCredential.user.getIdToken();
    await saveToken('access', token);
    return userCredential.user;
  } catch (error) {
    console.error('Error en inicio de sesión:', error);
    handleAuthError({
      code: error.code,
      message: getAuthErrorMessage(error.code)
    });
    return null;
  } finally {
    hideSpinner();
  }
}

export async function logout() {
  try {
    showSpinner();
    await signOut(auth);
    await clearTokens();
    window.location.href = '/pages/login.html';
  } catch (error) {
    console.error('Error al cerrar sesión:', error);
    handleAuthError({
      code: 'LOGOUT_ERROR',
      message: 'Error al cerrar sesión'
    });
  } finally {
    hideSpinner();
  }
}

async function refreshSession() {
  if (!currentUser) return null;
  
  try {
    showSpinner();
    const token = await currentUser.getIdToken(true); // Force refresh
    await saveToken('access', token);
    return token;
  } catch (error) {
    console.error('Error al refrescar sesión:', error);
    handleAuthError({
      code: 'REFRESH_ERROR',
      message: 'Error al renovar la sesión'
    });
    return null;
  } finally {
    hideSpinner();
  }
}

export async function startApp() {
  try {
    // Páginas públicas que no requieren autenticación
    const publicPages = ['login.html', 'register.html', 'reset-password.html', 'index.html'];
    const currentPath = window.location.pathname;
    const currentPage = currentPath.split('/').pop() || 'index.html';
    
    // Si estamos en una página pública, no verificar autenticación
    if (publicPages.includes(currentPage)) {
      console.log('Página pública detectada:', currentPage);
      return;
    }

    // Para páginas protegidas, verificar autenticación
    console.log('Verificando autenticación para:', currentPage);
    
    return new Promise((resolve) => {
      onAuthStateChanged(auth, async (user) => {
        if (!user) {
          console.log('Usuario no autenticado, redirigiendo a login');
          window.location.href = 'login.html';
          return;
        }

        console.log('Usuario autenticado:', user.email);
        try {
          const token = await user.getIdToken();
          await saveToken('access', token);
          resolve();
        } catch (error) {
          console.error('Error al obtener token:', error);
          window.location.href = 'login.html';
        }
      });
    });
  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    window.location.href = 'login.html';
  }
}

// Función auxiliar para mensajes de error
function getAuthErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'El correo electrónico no es válido',
    'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
    'auth/user-not-found': 'No existe una cuenta con este correo',
    'auth/wrong-password': 'Contraseña incorrecta',
    'auth/email-already-in-use': 'Este correo ya está registrado',
    'auth/operation-not-allowed': 'Operación no permitida',
    'auth/weak-password': 'La contraseña es muy débil',
    'auth/network-request-failed': 'Error de conexión',
    'auth/requires-recent-login': 'Por favor, vuelve a iniciar sesión para realizar esta operación',
    'auth/popup-blocked': 'El navegador bloqueó la ventana emergente',
    'auth/popup-closed-by-user': 'Ventana de autenticación cerrada',
    'auth/cancelled-popup-request': 'Operación cancelada',
    'auth/account-exists-with-different-credential': 'Ya existe una cuenta con este email',
    'permission-denied': 'Sin permisos suficientes. Revisa la configuración de Firebase.',
    'unauthenticated': 'Debes iniciar sesión para realizar esta acción',
    'default': 'Error de autenticación'
  };
  return messages[code] || messages.default;
}

// Registro de nuevo usuario
export async function registerWithEmail(email, password, displayName) {
  try {
    showSpinner();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Actualizar perfil con nombre
    if (displayName) {
      await updateProfile(userCredential.user, { displayName });
    }

    const token = await userCredential.user.getIdToken();
    await saveToken('access', token);
    return userCredential.user;
  } catch (error) {
    console.error('Error en registro:', error);
    handleAuthError({
      code: error.code,
      message: getAuthErrorMessage(error.code)
    });
    return null;
  } finally {
    hideSpinner();
  }
}

// Login con Google
export async function loginWithGoogle() {
  try {
    showSpinner();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({
      prompt: 'select_account'
    });
    
    const result = await signInWithPopup(auth, provider);
    const token = await result.user.getIdToken();
    await saveToken('access', token);
    return result.user;
  } catch (error) {
    console.error('Error en login con Google:', error);
    handleAuthError({
      code: error.code,
      message: getAuthErrorMessage(error.code)
    });
    return null;
  } finally {
    hideSpinner();
  }
}

// Recuperación de contraseña
export async function resetPassword(email) {
  try {
    showSpinner();
    await sendPasswordResetEmail(auth, email);
    return true;
  } catch (error) {
    console.error('Error al enviar email de recuperación:', error);
    handleAuthError({
      code: error.code,
      message: getAuthErrorMessage(error.code)
    });
    return false;
  } finally {
    hideSpinner();
  }
}

// Actualizar perfil del usuario
export async function updateUserProfile(updates) {
  try {
    showSpinner();
    const user = auth.currentUser;
    if (!user) throw new Error('No hay usuario autenticado');

    if (updates.displayName || updates.photoURL) {
      await updateProfile(user, {
        displayName: updates.displayName,
        photoURL: updates.photoURL
      });
    }

    if (updates.email) {
      await updateEmail(user, updates.email);
    }

    if (updates.password) {
      await updatePassword(user, updates.password);
    }

    return true;
  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    handleAuthError({
      code: error.code,
      message: getAuthErrorMessage(error.code)
    });
    return false;
  } finally {
    hideSpinner();
  }
}

// Verificar estado de autenticación
export function isAuthenticated() {
  return auth.currentUser !== null;
}

export function goToApp() {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = "/pages/login.html";
    return;
  }
  window.location.href = "/pages/donationcenter.html";
}

// Función para proteger páginas que requieren autenticación
export function requireAuth() {
  const user = getCurrentUser();
  const publicPages = ['/pages/login.html', '/pages/register.html', '/pages/reset-password.html', '/pages/index.html'];
  const currentPath = window.location.pathname;
  
  // Si no hay usuario y no estamos en una página pública, redirigir al login
  if (!user && !publicPages.some(page => currentPath.endsWith(page) || currentPath === '/' || currentPath.endsWith('/index.html'))) {
    window.location.href = '/pages/login.html';
    return false;
  }
  
  return !!user;
}
