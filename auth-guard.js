// auth-guard.js - Middleware para proteger páginas que requieren autenticación

import './error-handler.js'; // Cargar manejo de errores desde la raíz
import { getCurrentUser } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase.js';

/**
 * Lista de páginas que requieren autenticación
 */
const PROTECTED_PAGES = [
  'donationcenter.html',
  'donationcenter-profile.html',
  'requests.html',
  'dashboard.html'
];

/**
 * Lista de páginas públicas que no requieren autenticación
 */
const PUBLIC_PAGES = [
  'login.html',
  'register.html',
  'reset-password.html',
  'index.html'
];

/**
 * Verificar si la página actual requiere autenticación
 */
function isProtectedPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  return PROTECTED_PAGES.some(page => currentPage.includes(page.replace('.html', '')));
}

/**
 * Verificar si la página actual es pública
 */
function isPublicPage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  return PUBLIC_PAGES.some(page => currentPage.includes(page.replace('.html', '')));
}

/**
 * Redirigir a la página de login o mostrar advertencia
 */
function redirectToLogin() {
  const currentPath = window.location.pathname;

  // Si el usuario intenta acceder directamente a páginas protegidas, mostrar advertencia
  if (isProtectedPage()) {
    console.warn('🚫 Acceso denegado: Mostrando advertencia');
    createAccessDeniedOverlay();
    return;
  }

  // Para otros casos, redireccionar normalmente
  console.warn('🚫 Acceso denegado: Redirigiendo a login');
  window.location.href = 'login.html';
}

/**
 * Crear overlay de acceso denegado
 */
function createAccessDeniedOverlay() {
  // Remover overlay anterior si existe
  const existingOverlay = document.getElementById('accessDeniedOverlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'accessDeniedOverlay';
  overlay.innerHTML = `
    <style>
      #accessDeniedOverlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #2D1B44, #5a4574);
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        animation: fadeIn 0.3s ease-in;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .access-denied-card {
        background: white;
        border-radius: 20px;
        padding: 40px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.3s ease-out;
      }

      @keyframes slideUp {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .warning-icon {
        font-size: 4rem;
        color: #e74c3c;
        margin-bottom: 20px;
      }

      .access-title {
        color: #2D1B44;
        font-size: 1.8rem;
        font-weight: 700;
        margin-bottom: 15px;
      }

      .access-message {
        color: #666;
        font-size: 1.1rem;
        margin-bottom: 30px;
        line-height: 1.5;
      }

      .btn-login {
        background: linear-gradient(135deg, #6f42c1, #9561e2);
        color: white;
        padding: 12px 30px;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        box-shadow: 0 4px 15px rgba(111, 66, 193, 0.3);
        margin: 0 10px;
      }

      .btn-login:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(111, 66, 193, 0.4);
      }

      .btn-back {
        background: #f8f9fa;
        color: #6c757d;
        padding: 12px 30px;
        border: 2px solid #dee2e6;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        margin: 0 10px;
      }

      .btn-back:hover {
        background: #e9ecef;
        border-color: #adb5bd;
      }
    </style>
    <div class="access-denied-card">
      <i class="fas fa-exclamation-triangle warning-icon"></i>
      <h2 class="access-title">¡Acceso Denegado!</h2>
      <p class="access-message">
        No puedes acceder a esta página sin estar autenticado.<br>
        Por favor, inicia sesión para continuar.
      </p>
      <div>
        <button class="btn-login" onclick="goToLogin()">
          <i class="fas fa-sign-in-alt me-2"></i>Iniciar Sesión
        </button>
        <button class="btn-back" onclick="goBack()">
          <i class="fas fa-arrow-left me-2"></i>Volver
        </button>
      </div>
    </div>
  `;

  // Funciones para los botones
  window.goToLogin = function() {
    window.location.href = 'login.html';
  };

  window.goBack = function() {
    window.history.length > 1 ? window.history.back() : window.location.href = '/';
  };

  document.body.appendChild(overlay);
  console.log('🚫 Mostrando advertencia de acceso denegado');
}

/**
 * Redirigir a la página principal para usuarios ya autenticados
 */
function redirectToMain() {
  console.log('✅ Usuario ya autenticado, redirigiendo a página principal');
  window.location.href = 'donationcenter.html';
}

/**
 * Inicializar protección de rutas
 */
async function initializeAuthGuard() {
  // Solo ejecutar si estamos en una página específica (no en el índice)
  if (window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
    return; // Permitir acceso al índice principal
  }

  console.log('🛡️ Inicializando auth-guard...');

  // Esperar a que Firebase esté completamente inicializado
  try {
    // Verificación rápida de autenticación
    const user = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout esperando autenticación'));
      }, 100); // Reducido a 100ms para mayor velocidad

      const unsubscribe = onAuthStateChanged(auth, (user) => {
        clearTimeout(timeout);
        unsubscribe();
        resolve(user);
      });
    });

    if (isProtectedPage()) {
      if (!user) {
        console.warn(`🔒 Página protegida sin autenticación: ${window.location.pathname}`);
        window.location.replace('login.html');
        return false;
      }
      console.log(`✅ Acceso autorizado a página protegida: ${window.location.pathname} - Usuario: ${user.email}`);
      // Restaurar visibilidad completa
      document.documentElement.style.display = '';
      document.body.style.display = '';
      document.documentElement.style.opacity = '';
    } else if (isPublicPage() && user) {
      console.log(`ℹ️ Usuario autenticado accediendo a página pública: ${window.location.pathname}`);
      // Solo redirigir si específicamente están en login
      if (window.location.pathname.includes('login.html')) {
        redirectToMain();
        return false;
      }
    }

  } catch (error) {
    console.error('❌ Error en auth-guard:', error);

    if (isProtectedPage()) {
      console.warn('🔒 Error verificando autenticación, redirigiendo a login');
      window.location.replace('login.html');
      return false;
    }
  }

  return true;
}

// Auto-inicializar cuando se carga el módulo
const currentPage = window.location.pathname.split('/').pop() || 'index.html';
const isProtected = PROTECTED_PAGES.some(page => currentPage.includes(page.replace('.html', '')));

if (isProtected) {
  console.log('🔐 Página protegida detectada, verificando autenticación rápidamente...');
}

document.addEventListener('DOMContentLoaded', () => {
  initializeAuthGuard();
});

let authChecked = false;

onAuthStateChanged(auth, (user) => {
  if (!authChecked) {
    authChecked = true;

    if (user) {
      console.log('🔐 Estado de autenticación: Usuario conectado -', user.email);
      if (isProtectedPage()) {
        document.documentElement.style.display = '';
        document.body.style.display = '';
        document.documentElement.style.opacity = '';
      }
    } else {
      console.log('🔓 Estado de autenticación: Usuario desconectado');
      if (isProtectedPage()) {
        console.warn('🚫 Redirigiendo a login - usuario no autenticado');
        window.location.replace('login.html');
      }
    }
  } else {
    if (user) {
      console.log('🔐 Usuario sigue autenticado');
    } else {
      console.log('🔓 Usuario se desconectó');
      if (isProtectedPage()) {
        redirectToLogin();
      }
    }
  }
});

const AuthGuard = initializeAuthGuard;
export { AuthGuard, initializeAuthGuard, isProtectedPage, isPublicPage };
