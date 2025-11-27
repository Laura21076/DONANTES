import { getProfile, updateProfile, updatePassword, uploadProfilePhoto } from './profile.js';

// Mostrar Toast
function showToast(message, type = "success") {
  const toast = document.getElementById('toast');
  if (!toast) return;
  const toastBody = toast.querySelector('.toast-body');
  if (!toastBody) return;
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

// Subida de foto de perfil
window.handlePhotoUpload = async function (event) {
  const file = event.target.files[0];
  if (!file) return;
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
};

// Attach event listeners for CSP compatibility
function attachProfileEventListeners() {
  // Back to donations button
  const backBtn = document.querySelector('.btn-back-to-donations');
  if (backBtn) {
    backBtn.addEventListener('click', function() {
      window.location.href = 'donationcenter.html';
    });
  }

  // Profile photo overlay click
  const photoOverlay = document.getElementById('profilePhotoOverlay');
  const photoUpload = document.getElementById('photoUpload');
  if (photoOverlay && photoUpload) {
    photoOverlay.addEventListener('click', function() {
      photoUpload.click();
    });
  }

  // Photo upload change handler
  if (photoUpload) {
    photoUpload.addEventListener('change', function(event) {
      window.handlePhotoUpload(event);
    });
  }

  // Toggle password visibility buttons
  document.querySelectorAll('.btn-toggle-password').forEach(btn => {
    btn.addEventListener('click', function() {
      const targetId = this.dataset.target;
      window.togglePasswordVisibility(targetId);
    });
  });
}

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
  cargarPerfil();
  attachProfileEventListeners();
});
