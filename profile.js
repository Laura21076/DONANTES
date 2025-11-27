// donationcenter-profile.js - Lógica completa para pintar y actualizar formulario de perfil Donantes

import { getProfile, updateProfile, updatePassword, uploadProfilePhoto } from './profile.js';

// Mostrar Toast
function showToast(message, type = "success") {
  const toast = document.getElementById('toast');
  const toastBody = toast.querySelector('.toast-body');
  toastBody.textContent = message;
  toast.classList.remove('bg-success', 'bg-danger');
  toast.classList.add(type === 'success' ? 'bg-success' : 'bg-danger');
  const bsToast = bootstrap.Toast.getOrCreateInstance(toast);
  bsToast.show();
}

// Cargar perfil e inicializar el formulario
async function cargarPerfil() {
  try {
    const perfil = await getProfile();

    // Header
    document.getElementById('profileDisplayName').textContent = perfil.displayName || `${perfil.firstName} ${perfil.lastName}` || 'Mi Perfil';
    document.getElementById('profileDisplayEmail').textContent = perfil.email || "";

    // Foto de perfil
    const photoContainer = document.getElementById('profilePhotoDisplay');
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

    // Campos del formulario
    document.getElementById('firstName').value  = perfil.firstName;
    document.getElementById('lastName').value   = perfil.lastName;
    document.getElementById('email').value      = perfil.email;
    document.getElementById('phone').value      = perfil.phone;
    document.getElementById('address').value    = perfil.address;
    document.getElementById('city').value       = perfil.city;
    document.getElementById('zipCode').value    = perfil.zipCode;
    document.getElementById('state').value      = perfil.state;

    // Limpia los campos sensibles de contraseña
    document.getElementById('currentPassword').value = "********";
    document.getElementById('newPassword').value = "";
  } catch (err) {
    showToast("No se pudo cargar el perfil: " + (err?.message || err), "danger");
  }
}

// Subida de foto de perfil
window.handlePhotoUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;
  try {
    document.getElementById('saveProfileSpinner').classList.remove('d-none');
    const url = await uploadProfilePhoto(file);
    await cargarPerfil(); // Refresca la foto
    showToast("Foto de perfil actualizada.");
  } catch (err) {
    showToast("Ocurrió un error al subir la foto: " + (err?.message || err), "danger");
  } finally {
    document.getElementById('saveProfileSpinner').classList.add('d-none');
  }
};

// Guardar cambios de perfil
document.getElementById('profileForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const btn = document.getElementById('saveProfileBtn');
  document.getElementById('saveProfileSpinner').classList.remove('d-none');
  btn.disabled = true;
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
    document.getElementById('saveProfileSpinner').classList.add('d-none');
    btn.disabled = false;
  }
});

// Mostrar/ocultar contraseña
window.togglePasswordVisibility = function(id) {
  const input = document.getElementById(id);
  const icon  = document.getElementById(id + 'Icon');
  if (input.type === "password") {
    input.type = "text";
    icon.classList.remove('fa-eye');
    icon.classList.add('fa-eye-slash');
  } else {
    input.type = "password";
    icon.classList.add('fa-eye');
    icon.classList.remove('fa-eye-slash');
  }
};

// Inicializar
document.addEventListener('DOMContentLoaded', cargarPerfil);
