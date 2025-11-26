// Utilidad para manejar reintentos de autenticación con Firebase
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
        
        // Si es el error de "too many attempts", esperar menos tiempo
        if (error.code === 'auth/too-many-requests') {
          const delay = Math.min(this.baseDelay * Math.pow(2, attempt), this.maxDelay);
          console.log(`⏱️ Esperando ${delay/1000} segundos antes del siguiente intento...`);
          await this.sleep(delay);
          continue;
        }
        
        // Si es otro tipo de error, no reintentar
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

  // Método específico para limpiar bloqueos temporales
  async clearAuthBlocks() {
    try {
      console.log('🧹 Intentando limpiar bloqueos de autenticación...');
      
      // Limpiar localStorage relacionado con Firebase
      const firebaseKeys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('firebase') || key.includes('auth'))) {
          firebaseKeys.push(key);
        }
      }
      
      firebaseKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removido: ${key}`);
      });
      
      // Limpiar sessionStorage también
      const sessionKeys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('firebase') || key.includes('auth'))) {
          sessionKeys.push(key);
        }
      }
      
      sessionKeys.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`🗑️ Removido de session: ${key}`);
      });
      
      console.log('✅ Bloqueos de autenticación limpiados');
      return true;
    } catch (error) {
      console.error('❌ Error al limpiar bloqueos:', error);
      return false;
    }
  }

  // Mostrar mensaje amigable para errores de rate limit
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

// Instancia global
export const authRetryHandler = new AuthRetryHandler();

// Función de conveniencia para autenticación con reintentos
export async function signInWithRetry(auth, email, password) {
  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
  
  return authRetryHandler.executeWithRetry(
    signInWithEmailAndPassword,
    auth,
    email,
    password
  );
}

// Función de conveniencia para registro con reintentos
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