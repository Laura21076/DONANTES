// Login handler
import '../utils/error-handler.js'; // Cargar manejo global de errores
import { auth, db } from '../services/firebase.js';
import { signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { saveToken } from '../services/db.js';
import { showToast } from '../utils/ui.js';
import { authRetryHandler, signInWithRetry } from '../utils/auth-retry.js';
import { authGuard } from '../utils/auth-guard.js';

const loginForm = document.getElementById('loginForm');

if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!loginForm.checkValidity()) {
      e.stopPropagation();
      loginForm.classList.add('was-validated');
      return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    const submitBtn = loginForm.querySelector('button[type="submit"]');


    try {
      submitBtn.disabled = true;
      const spinner = document.getElementById('loginSpinner');
      if (spinner) spinner.classList.remove('d-none');
      submitBtn.querySelector('span').textContent = 'Entrando...';

      // 1. Login con Firebase Auth usando retry handler
      console.log('🔐 Iniciando login con reintentos automáticos...');
      const userCredential = await signInWithRetry(auth, email, password);
      const user = userCredential.user;

      // 2. Crear sesión en backend (sin esperar Firestore para mayor velocidad)
      // Enviar al backend para crear sesión
      const idToken = await user.getIdToken();
      console.log('🪪 idToken obtenido:', idToken);
      const backendUrl = window.__ENV__?.BACKEND_URL || 'http://localhost:4000';
      const resp = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ idToken })
      });

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.error || 'Error en el servidor');
      }

      const data = await resp.json();
      
      // 4. Guardar tokens
      await saveToken('access', data.accessToken);
      await saveToken('refresh', data.refreshToken);

      // 5. Redirección INMEDIATA después del login exitoso
      console.log('✅ Login exitoso - redirigiendo inmediatamente');
      
      // Redirección instantánea sin demoras
      window.location.replace('donationcenter.html');

    } catch (error) {
      console.error('Error al iniciar sesión:', error);
      
      // Manejar errores específicos de rate limiting
      if (authRetryHandler.showRateLimitMessage(error)) {
        console.log('📝 Mensaje de rate limit mostrado');
      } else {
        // Usar el manejador global de errores de Firebase
        const errorMessage = window.handleFirebaseError ? 
          window.handleFirebaseError(error, 'Login') : 
          'Error al iniciar sesión';
        
        showToast('error', errorMessage);
      }
      
      // Si es error de "too many requests", ofrecer limpiar bloqueos
      if (error.code === 'auth/too-many-requests') {
        setTimeout(async () => {
          const cleared = await authRetryHandler.clearAuthBlocks();
          if (cleared) {
            showToast('info', 'Bloqueos de autenticación limpiados. Puedes intentar de nuevo.');
          }
        }, 2000);
      }
      
      submitBtn.disabled = false;
      if (spinner) spinner.classList.add('d-none');
      submitBtn.querySelector('span').textContent = 'Entrar';
    }
  });
}

import '../utils/toggle-password.js';

// Mostrar/ocultar contraseña
const toggleBtn = document.getElementById('toggleLoginPassword');
const passwordInput = document.getElementById('loginPassword');
const passwordIcon = document.getElementById('loginPasswordIcon');
if (toggleBtn && passwordInput && passwordIcon) {
  toggleBtn.addEventListener('click', () => {
    window.togglePasswordVisibility('loginPassword', 'loginPasswordIcon');
  });
}
