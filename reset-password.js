import { auth } from 'firebase.js';
import { sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { showToast } from 'ui.js';

const resetRequestForm = document.getElementById('resetRequestForm');

if (resetRequestForm) {
  // Manejar solicitud de reset con Firebase Auth directamente
  resetRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!resetRequestForm.checkValidity()) {
      e.stopPropagation();
      resetRequestForm.classList.add('was-validated');
      return;
    }
    
    const email = document.getElementById('resetEmail').value.trim();
    const submitBtn = resetRequestForm.querySelector('button[type="submit"]');
    
    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';

      // Usar Firebase Auth para enviar email de reset
      await sendPasswordResetEmail(auth, email);

      showToast('success', 'Se han enviado las instrucciones a tu correo');
      resetRequestForm.reset();
      resetRequestForm.classList.remove('was-validated');
      
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);

    } catch (error) {
      console.error('Error:', error);
      
      let errorMessage = 'Error al enviar instrucciones';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No existe una cuenta con este correo';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Correo electrónico inválido';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast('error', errorMessage);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Enviar instrucciones';
    }
  });
}


