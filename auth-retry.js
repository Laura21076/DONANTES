// AuthRetryHandler.js
export class AuthRetryHandler {
  constructor() {
    this.maxRetries = 3;
    this.baseDelay = 1000; // 1 segundo
    this.maxDelay = 10000; // 10 segundos máximo
  }

  async executeWithRetry(authFunction, ...args) {
    let lastError = null;
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`🔄 Intento de autenticación ${attempt + 1}/${this.maxRetries}`);
        const result = await authFunction(...args);
        console.log('✅ Autenticación exitosa');
        return result;
      } catch (error) {
        lastError = error;
        console.warn(`❌ Intento ${attempt + 1} fallido:`, error.message);

        // Reintentar solo si el error es demasiados intentos
        if (error.code === 'auth/too-many-requests') {
          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          console.log(`⏱️ Esperando ${delay/1000} segundos antes del siguiente intento...`);
          await this.sleep(delay);
          continue;
        }
        // Si el error no es recuperable, lanza error
        if (this.isNonRetryableError(error)) {
          console.log('❌ Error no recuperable, no reintentando');
          throw error;
        }
        // Esperar antes del siguiente intento
        if (attempt < this.maxRetries - 1) {
          const delay = this.baseDelay * (attempt + 1);
          console.log(`⏱️ Esperando ${delay/1000} segundos antes del siguiente intento...`);
          await this.sleep(delay);
        }
      }
    }
    console.error('❌ Todos los intentos de autenticación fallaron');
    throw lastError;
  }

  isNonRetryableError(error) {
    const nonRetryableErrors = [
      'auth/invalid-email',
      'auth/user-disabled',
      'auth/user-not-found',
      'auth/wrong-password',
      'auth/invalid-credential',
      'auth/email-already-in-use'
    ];
    return nonRetryableErrors.includes(error.code);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async clearAuthBlocks() {
    try {
      console.log('🧹 Limpiando posibles bloqueos de autenticación…');
      // Elimina solo claves relevantes de Firebase auth para evitar conflictos
      const firebasePrefixes = ['firebase:authUser:', 'firebase:authManager:', 'firebase:authEvent:', 'firebase:auth'];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (firebasePrefixes.some(pref => key && key.startsWith(pref))) {
          localStorage.removeItem(key);
          console.log(`🗑️ Removido: ${key}`);
        }
      }
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (firebasePrefixes.some(pref => key && key.startsWith(pref))) {
          sessionStorage.removeItem(key);
          console.log(`🗑️ Removido de session: ${key}`);
        }
      }
      console.log('✅ Bloqueos de autenticación limpiados');
      return true;
    } catch (error) {
      console.error('❌ Error al limpiar bloqueos:', error);
      return false;
    }
  }

  showRateLimitMessage(error) {
    if (error.code === 'auth/too-many-requests') {
      const message = `
        <div class="alert alert-warning alert-dismissible fade show" role="alert">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Demasiados intentos de inicio de sesión</strong><br>
          <small>Estamos aplicando una pausa de seguridad. Inténtalo de nuevo en unos segundos.</small>
          <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
      `;
      const alertContainer = document.getElementById('alert-container') || document.body;
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = message;
      alertContainer.insertBefore(tempDiv.firstElementChild, alertContainer.firstChild);
      return true;
    }
    return false;
  }
}

export const authRetryHandler = new AuthRetryHandler();

export async function signInWithRetry(auth, email, password) {
  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  return authRetryHandler.executeWithRetry(
    signInWithEmailAndPassword,
    auth,
    email,
    password
  );
}

export async function createUserWithRetry(auth, email, password) {
  const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  return authRetryHandler.executeWithRetry(
    createUserWithEmailAndPassword,
    auth,
    email,
    password
  );
}

console.log('🔧 AuthRetryHandler cargado');
