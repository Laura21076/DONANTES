// change-password.js (o el nombre que uses) - Mostrar/ocultar contraseñas en formulario de cambio de contraseña

import './toggle-password.js';

// Mostrar/ocultar contraseña actual
const toggleCurrentPasswordBtn = document.getElementById('toggleCurrentPassword');
const currentPasswordInput = document.getElementById('currentPassword');
const currentPasswordIcon = document.getElementById('currentPasswordIcon');
if (toggleCurrentPasswordBtn && currentPasswordInput && currentPasswordIcon) {
  toggleCurrentPasswordBtn.addEventListener('click', () => {
    window.togglePasswordVisibility('currentPassword', 'currentPasswordIcon');
  });
}

// Mostrar/ocultar nueva contraseña
const toggleNewPasswordBtn = document.getElementById('toggleNewPassword');
const newPasswordInput = document.getElementById('newPassword');
const newPasswordIcon = document.getElementById('newPasswordIcon');
if (toggleNewPasswordBtn && newPasswordInput && newPasswordIcon) {
  toggleNewPasswordBtn.addEventListener('click', () => {
    window.togglePasswordVisibility('newPassword', 'newPasswordIcon');
  });
}
