import 'toggle-password.js';

// Mostrar/ocultar contraseña en registro
const toggleRegisterPasswordBtn = document.getElementById('toggleRegisterPassword');
const registerPasswordInput = document.getElementById('registerPassword');
const registerPasswordIcon = document.getElementById('registerPasswordIcon');
if (toggleRegisterPasswordBtn && registerPasswordInput && registerPasswordIcon) {
  toggleRegisterPasswordBtn.addEventListener('click', () => {
    window.togglePasswordVisibility('registerPassword', 'registerPasswordIcon');
  });
}

const toggleConfirmPasswordBtn = document.getElementById('toggleConfirmPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const confirmPasswordIcon = document.getElementById('confirmPasswordIcon');
if (toggleConfirmPasswordBtn && confirmPasswordInput && confirmPasswordIcon) {
  toggleConfirmPasswordBtn.addEventListener('click', () => {
    window.togglePasswordVisibility('confirmPassword', 'confirmPasswordIcon');
  });
}
import { auth, db } from 'firebase.js';
import { createUserWithEmailAndPassword, updateProfile } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { showToast } from 'ui.js';

const registerForm = document.getElementById('registerForm');

if (registerForm) {
  // Validar que las contraseñas coincidan
  const password = document.getElementById('registerPassword');
  const confirmPassword = document.getElementById('confirmPassword');

  confirmPassword?.addEventListener('input', () => {
    if (password.value !== confirmPassword.value) {
      confirmPassword.setCustomValidity('Las contraseñas no coinciden');
    } else {
      confirmPassword.setCustomValidity('');
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!registerForm.checkValidity()) {
      e.stopPropagation();
      registerForm.classList.add('was-validated');
      return;
    }

    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const passwordValue = document.getElementById('registerPassword').value.trim();
    const confirmPasswordValue = document.getElementById('confirmPassword').value.trim();
    const submitBtn = registerForm.querySelector('button[type="submit"]');

    // Validar que las contraseñas coincidan
    if (passwordValue !== confirmPasswordValue) {
      showToast('error', 'Las contraseñas no coinciden');

      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Registrando...';

      // 1. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, passwordValue);
      const user = userCredential.user;

      // 2. Actualizar perfil con nombre completo
      const displayName = `${firstName} ${lastName}`;
      await updateProfile(user, { displayName });

      // 3. Crear documento en Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        displayName,
        email,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Mostrar mensaje y redirigir
      showToast('success', '¡Registro exitoso! Ahora puedes iniciar sesión.');
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 800);

    } catch (error) {
      console.error('Error al registrar:', error);

      let errorMessage = 'Error al registrar usuario';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este correo ya está registrado';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Correo electrónico inválido';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'La contraseña es muy débil (mínimo 6 caracteres)';
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'El registro de usuarios está deshabilitado';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showToast('error', errorMessage);

      submitBtn.disabled = false;
      submitBtn.textContent = 'Registrarse';
    }
  });
}

