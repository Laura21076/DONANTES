import './error-handler.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase.js';

// Páginas protegidas
const PROTECTED_PAGES = [
  'donationcenter.html',
  'donationcenter-profile.html',
  'requests.html',
  'dashboard.html'
];

// Páginas públicas
const PUBLIC_PAGES = [
  'login.html',
  'register.html',
  'reset-password.html',
  'index.html'
];

// Helpers
function getCurrentPage() {
  return window.location.pathname.split('/').pop() || 'index.html';
}
function isProtectedPage() {
  const page = getCurrentPage();
  return PROTECTED_PAGES.some(p => page.startsWith(p.replace('.html', '')));
}
function isPublicPage() {
  const page = getCurrentPage();
  return PUBLIC_PAGES.some(p => page.startsWith(p.replace('.html', '')));
}

function redirectToLogin() {
  window.location.replace('login.html');
}
function redirectToMain() {
  window.location.replace('donationcenter.html');
}

// Guarda si ya checamos el guard (para evitar dobles/triples execs)
let authChecked = false;

// La función principal: sólo debe llamarse UNA vez por carga de página
function initializeAuthGuard() {
  if (window.location.pathname === '/' || window.location.pathname.endsWith('/')) return;

  if (authChecked) return; // Previene dobles checadas
  authChecked = true;

  // Mostrar espera (opcional)
  document.documentElement.style.opacity = '0.5';

  // Escuchar cambios de user siempre que la página esté cargada
  onAuthStateChanged(auth, (user) => {
    document.documentElement.style.opacity = '';

    const page = getCurrentPage();
    if (isProtectedPage()) {
      // Página protegida
      if (!user) {
        console.warn(`🔒 No autenticado, redirigiendo a login desde ${page}`);
        redirectToLogin();
      } else {
        console.log(`✅ Acceso autorizado a ${page}, user: ${user.email}`);
        // Puede restaurar visibilidad especial aquí si quieres
      }
    } else if (isPublicPage() && user) {
      // Página pública, usuario YA autenticado (redirige sólo en login)
      if (page === 'login.html') {
        console.log(`🟢 Usuario autenticado intentando entrar a login (redirijo a main): ${user.email}`);
        redirectToMain();
      }
    }
  });
}
// Auto-inicializar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { initializeAuthGuard(); });
} else {
  initializeAuthGuard();
}

export { initializeAuthGuard, isProtectedPage, isPublicPage };
