// Auth Guard - Protección de páginas que requieren autenticación
import { auth } from '../services/firebase.js';
import { getToken } from '../services/db.js';

export class AuthGuard {
  constructor() {
    this.protectedPages = [
      'donationcenter.html',
      'requests.html', 
      'profile.html',
      'dashboard.html'
    ];
  }

  // Verificar si la página actual requiere autenticación
  isProtectedPage() {
    const currentPath = window.location.pathname;
    return this.protectedPages.some(page => currentPath.includes(page));
  }

  // Verificar autenticación completa (Firebase + Tokens)
  async isFullyAuthenticated() {
    try {
      // 1. Verificar usuario Firebase
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) {
        console.log('❌ No hay usuario Firebase');
        return false;
      }

      // 2. Verificar tokens válidos
      const accessToken = await getToken('access');
      const refreshToken = await getToken('refresh');
      
      if (!accessToken || !refreshToken) {
        console.log('❌ Tokens faltantes');
        return false;
      }

      console.log('✅ Usuario completamente autenticado:', firebaseUser.email);
      return true;

    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      return false;
    }
  }

  // Proteger página actual si es necesario
  async protectCurrentPage() {
    if (!this.isProtectedPage()) {
      console.log('📄 Página pública - acceso libre');
      return true;
    }

    console.log('🛡️ Verificando acceso a página protegida...');
    const isAuth = await this.isFullyAuthenticated();
    
    if (!isAuth) {
      console.log('🔄 Redirigiendo a login - autenticación requerida');
      this.redirectToLogin();
      return false;
    }

    console.log('✅ Acceso autorizado a página protegida');
    return true;
  }

  // Redirigir a login con mensaje
  redirectToLogin() {
    // Guardar página de destino para después del login
    sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
    
    // Mostrar mensaje si es posible
    if (window.showToast) {
      window.showToast('info', 'Necesitas iniciar sesión para acceder a esta página');
    }
    
    // Redirigir después de un pequeño delay para mostrar el mensaje
    setTimeout(() => {
      window.location.href = './login.html';
    }, 1000);
  }

  // Redirigir después del login exitoso
  redirectAfterLogin() {
    const redirectPath = sessionStorage.getItem('redirectAfterLogin');
    sessionStorage.removeItem('redirectAfterLogin');
    
    if (redirectPath && redirectPath !== '/pages/login.html') {
      console.log('🔄 Redirigiendo a página solicitada:', redirectPath);
      window.location.href = redirectPath;
    } else {
      console.log('🔄 Redirigiendo a donaciones por defecto');
      window.location.href = './donationcenter.html';
    }
  }

  // Limpiar autenticación
  async clearAuthentication() {
    try {
      // Limpiar tokens
      await Promise.all([
        localStorage.removeItem('access_token'),
        localStorage.removeItem('refresh_token'),
        sessionStorage.clear()
      ]);
      
      // Cerrar sesión Firebase
      if (auth.currentUser) {
        await auth.signOut();
      }
      
      console.log('🧹 Autenticación limpiada completamente');
      return true;
    } catch (error) {
      console.error('❌ Error limpiando autenticación:', error);
      return false;
    }
  }
}

// Instancia global
export const authGuard = new AuthGuard();

// Función de conveniencia para usar en páginas
window.checkPageAuth = async function() {
  return await authGuard.protectCurrentPage();
};

console.log('🛡️ AuthGuard inicializado');