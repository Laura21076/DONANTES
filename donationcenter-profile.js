/**
 * donationcenter-profile.js
 * 
 * MEJORAS IMPLEMENTADAS:
 * 1. Se verifica autenticación de Firebase antes de cargar el perfil
 * 2. Se eliminaron event handlers inline (onclick, onchange) del HTML
 * 3. Todos los event listeners se manejan en este archivo JS externo
 * 4. Se muestra feedback visual cuando el usuario no está autenticado
 */

import { getProfile, updateProfile, updatePassword, uploadProfilePhoto } from './profile.js';
import { auth } from './firebase.js';
import { getCurrentUser } from './auth.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Mostrar Toast - función para mostrar mensajes al usuario
function showToast(message, type = "success") {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const toastBody = toast.querySelector('.toast-body');
  if (!toastBody) return;
  toastBody.textContent = message;
  toast.classList.remove('bg-success', 'bg-danger', 'bg-warning');
  toast.classList.add(type === 'success' ? 'bg-success' : (type === 'warning' ? 'bg-warning' : 'bg-danger'));
  const bsToast = bootstrap.Toast.getOrCreateInstance(toast);
  bsToast.show();
}

/**
 * MEJORA: Función para mostrar feedback visual cuando no hay usuario autenticado
 * En lugar de lanzar error de consola, muestra un mensaje amigable al usuario
 */
function mostrarEstadoNoAutenticado() {
  const profileDisplayName = document.getElementById('profileDisplayName');
  const profileDisplayEmail = document.getElementById('profileDisplayEmail');
  
  if (profileDisplayName) {
    profileDisplayName.textContent = 'No autenticado';
  }
  if (profileDisplayEmail) {
    profileDisplayEmail.textContent = 'Inicia sesión para ver tu perfil';
  }
  
  // Mostrar mensaje informativo (no error)
  showToast('Por favor inicia sesión para acceder a tu perfil', 'warning');
}

/**
 * MEJORA: Cargar perfil solo si el usuario está autenticado
 * Se verifica firebase.auth().currentUser antes de solicitar datos
 */
async function cargarPerfil() {
  // MEJORA: Verificar que existe usuario autenticado antes de cargar perfil (robusto)
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    console.log('No hay usuario autenticado, mostrando estado de no autenticado');
    mostrarEstadoNoAutenticado();
    return;
  }
  
  try {
    const perfil = await getProfile();
    console.log("Perfil recibido:", perfil);

    // Header
    document.getElementById('profileDisplayName').textContent =
      perfil.displayName && perfil.displayName.trim()
        ? perfil.displayName
        : ((perfil.firstName || "") + " " + (perfil.lastName || "")).trim() || 'Mi Perfil';
    document.getElementById('profileDisplayEmail').textContent = perfil.email || "";

    // Foto de perfil
    const photoContainer = document.getElementById('profilePhotoDisplay');
    if (photoContainer) {
      photoContainer.innerHTML = ''; // Limpia el div
      if (perfil.photoURL) {
        const img = document.createElement('img');
        img.src = perfil.photoURL;
        img.alt = "Foto de perfil";
        img.classList.add('img-fluid', 'rounded-circle');
        img.style.maxWidth = "110px";
        photoContainer.appendChild(img);
      } else {
        // Ícono por defecto
        photoContainer.innerHTML = '<i class="fas fa-user-circle"></i>';
      }
    }

    // Campos del formulario
    if (document.getElementById('firstName'))  document.getElementById('firstName').value  = perfil.firstName || '';
    if (document.getElementById('lastName'))   document.getElementById('lastName').value   = perfil.lastName || '';
    if (document.getElementById('email'))      document.getElementById('email').value      = perfil.email || '';
    if (document.getElementById('phone'))      document.getElementById('phone').value      = perfil.phone || '';
    if (document.getElementById('address'))    document.getElementById('address').value    = perfil.address || '';
    if (document.getElementById('city'))       document.getElementById('city').value       = perfil.city || '';
    if (document.getElementById('zipCode'))    document.getElementById('zipCode').value    = perfil.zipCode || '';
    if (document.getElementById('state'))      document.getElementById('state').value      = perfil.state || '';

    // Limpia los campos sensibles de contraseña
    if (document.getElementById('currentPassword')) document.getElementById('currentPassword').value = "********";
    if (document.getElementById('newPassword'))     document.getElementById('newPassword').value = "";
  } catch (err) {
    console.error("Error cargando perfil:", err);
    showToast("No se pudo cargar el perfil: " + (err?.message || err), "danger");
  }
}

/**
 * MEJORA: Subida de foto de perfil - manejada por event listener en lugar de inline
 */
async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // MEJORA: Verificar autenticación antes de subir foto (robusto)
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    showToast('Debes iniciar sesión para subir una foto', 'warning');
    return;
  }
  
  try {
    document.getElementById('saveProfileSpinner').classList.remove('d-none');
    await uploadProfilePhoto(file);
    await cargarPerfil(); // Refresca la foto
    showToast("Foto de perfil actualizada.");
  } catch (err) {
    showToast("Ocurrió un error al subir la foto: " + (err?.message || err), "danger");
  } finally {
    document.getElementById('saveProfileSpinner').classList.add('d-none');
  }
}

/**
 * MEJORA: Mostrar/ocultar contraseña - función movida de inline a JS externo
 */
function togglePasswordVisibility(id) {
  const input = document.getElementById(id);
  const icon  = document.getElementById(id + 'Icon');
  if (!input || !icon) return;
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = "password";
    icon.classList.add('fa-eye');
    icon.classList.remove('fa-eye-slash');
  }
}

/**
 * MEJORA: Configurar todos los event listeners al cargar el DOM
 * Esto reemplaza los event handlers inline en el HTML
 */
function setupEventListeners() {
  // MEJORA: Event listener para el botón de volver (antes: onclick inline)
  const backBtn = document.getElementById('backToDonationsBtn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      window.location.href = 'donationcenter.html';
    });
  }
  
  // MEJORA: Event listener para el overlay de foto (antes: onclick inline)
  // Requiere ambos elementos: overlay y input
  const photoOverlay = document.getElementById('profilePhotoOverlay');
  const photoUploadInput = document.getElementById('photoUpload');
  if (photoOverlay && photoUploadInput) {
    photoOverlay.addEventListener('click', () => {
      photoUploadInput.click();
    });
  }
  
  // MEJORA: Event listener para subida de foto (antes: onchange inline)
  // Solo requiere el input, independiente del overlay
  if (photoUploadInput) {
    photoUploadInput.addEventListener('change', handlePhotoUpload);
  }
  
  // MEJORA: Event listeners para toggle de contraseñas (antes: onclick inline)
  const toggleCurrentPasswordBtn = document.getElementById('toggleCurrentPassword');
  if (toggleCurrentPasswordBtn) {
    toggleCurrentPasswordBtn.addEventListener('click', () => {
      togglePasswordVisibility('currentPassword');
    });
  }
  
  const toggleNewPasswordBtn = document.getElementById('toggleNewPassword');
  if (toggleNewPasswordBtn) {
    toggleNewPasswordBtn.addEventListener('click', () => {
      togglePasswordVisibility('newPassword');
    });
  }
  
  // Event listener para el formulario de perfil
  const profileForm = document.getElementById('profileForm');
  if (profileForm) {
    profileForm.addEventListener('submit', handleProfileSubmit);
  }
}

/**
 * Handler para el envío del formulario de perfil
 */
async function handleProfileSubmit(e) {
  e.preventDefault();
  
  // MEJORA: Verificar autenticación antes de guardar (robusto)
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    showToast('Debes iniciar sesión para actualizar tu perfil', 'warning');
    return;
  }
  
  const btn = document.getElementById('saveProfileBtn');
  const spinner = document.getElementById('saveProfileSpinner');
  
  if (spinner) spinner.classList.remove('d-none');
  if (btn) btn.disabled = true;
  
  try {
    const data = {
      firstName: document.getElementById('firstName').value.trim(),
      lastName: document.getElementById('lastName').value.trim(),
      phone: document.getElementById('phone').value.trim(),
      address: document.getElementById('address').value.trim(),
      city: document.getElementById('city').value.trim(),
      state: document.getElementById('state').value,
      zipCode: document.getElementById('zipCode').value.trim(),
    };
    await updateProfile(data);

    // Si hay nueva contraseña, cambiarla
    const newPassword = document.getElementById('newPassword').value;
    if (newPassword && newPassword.length >= 6) {
      await updatePassword(newPassword);
      showToast("Perfil y contraseña actualizados correctamente.");
    } else {
      showToast("Perfil actualizado correctamente.");
    }

    await cargarPerfil(); // Refresca la info por si el nombre/foto cambia
    document.getElementById('newPassword').value = "";
  } catch (err) {
    showToast("No se pudo actualizar el perfil: " + (err?.message || err), "danger");
  } finally {
    if (spinner) spinner.classList.add('d-none');
    if (btn) btn.disabled = false;
  }
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
  cargarPerfil();
  setupEventListeners();
});
