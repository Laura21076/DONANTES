// Script para gestionar el perfil del usuario

import { storage } from './firebase.js';
import { getFirestore, doc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

import { getCurrentUser, getIdToken, subscribeToAuth } from './auth.js';
import { 
  getProfile, 
  updateProfile, 
  updatePassword,
  uploadProfilePhoto
} from './profile.js';

import './toggle-password.js';

console.log("🔄 PROFILE.JS CARGADO - TIMESTAMP:", new Date().toISOString());

// ---- Elementos del DOM
const profileForm = document.getElementById("profileForm");
const firstNameInput = document.getElementById("firstName");
const lastNameInput = document.getElementById("lastName");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phone");
const addressInput = document.getElementById("address");
const cityInput = document.getElementById("city");
const stateInput = document.getElementById("state");
const zipCodeInput = document.getElementById("zipCode");
const newPasswordInput = document.getElementById("newPassword");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const saveProfileText = document.getElementById("saveProfileText");
const saveProfileSpinner = document.getElementById("saveProfileSpinner");
const photoUploadInput = document.getElementById("profilePhotoInput");
const profilePhotoDisplay = document.getElementById("profilePhotoDisplay");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileDisplayEmail = document.getElementById("profileDisplayEmail");

const firestore = getFirestore();
const auth = getAuth();

let authInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 Página de perfil cargada, verificando auth...");

  const checkAuthAndLoadProfile = () => {
    const currentUser = getCurrentUser();
    if (currentUser) {
      loadUserProfile();
    } else {
      setTimeout(() => {
        const retryUser = getCurrentUser();
        if (retryUser) {
          loadUserProfile();
        } else {
          window.location.replace("login.html");
        }
      }, 100);
    }
  };

  checkAuthAndLoadProfile();

  subscribeToAuth((user) => {
    if (!authInitialized) {
      authInitialized = true;
      if (user) {
        loadUserProfile();
      }
    }
  });
});

async function loadUserProfile() {
  try {
    let user;
    try {
      user = getCurrentUser();
    } catch {
      window.location.href = "login.html";
      return;
    }
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    if (emailInput) emailInput.value = user.email || "";
    if (profileDisplayEmail) profileDisplayEmail.textContent = user.email || "";

    if (user.displayName && !user.displayName.includes('@')) {
      const nameParts = user.displayName.split(' ');
      if (firstNameInput && nameParts.length) firstNameInput.value = nameParts[0];
      if (lastNameInput && nameParts.length > 1) lastNameInput.value = nameParts.slice(1).join(' ');
    }

    try {
      const profile = await getProfile();

      if (profile && typeof profile === 'object') {
        if (firstNameInput) firstNameInput.value = profile.firstName || "";
        if (lastNameInput) lastNameInput.value = profile.lastName || "";
        if (phoneInput) phoneInput.value = profile.phone || "";
        if (addressInput) addressInput.value = profile.address || "";
        if (cityInput) cityInput.value = profile.city || "";
        if (stateInput) stateInput.value = profile.state || "";
        if (zipCodeInput) zipCodeInput.value = profile.zipCode || "";

        const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
        if (profileDisplayName) {
          if (fullName) profileDisplayName.textContent = fullName;
          else if (profile.displayName) profileDisplayName.textContent = profile.displayName;
          else profileDisplayName.textContent = user.email?.split("@")[0] || "Usuario";
        }

        if (profilePhotoDisplay) {
          if (profile.photoURL) {
            profilePhotoDisplay.innerHTML = `<img src="${profile.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
          } else if (user.photoURL) {
            profilePhotoDisplay.innerHTML = `<img src="${user.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
          }
        }
      } else {
        useFallbackData(user);
      }
    } catch {
      useFallbackData(user);
    }
    displayCurrentPassword();
  } catch (error) {
    console.error("❌ Error general en loadUserProfile:", error);
  }
}

function useFallbackData(user) {
  const displayName = user.displayName || "";
  const nameParts = displayName.split(" ");
  if (nameParts.length >= 2) {
    if (firstNameInput) firstNameInput.value = nameParts[0];
    if (lastNameInput) lastNameInput.value = nameParts.slice(1).join(" ");
    if (profileDisplayName) profileDisplayName.textContent = displayName;
  } else if (displayName) {
    if (firstNameInput) firstNameInput.value = displayName;
    if (profileDisplayName) profileDisplayName.textContent = displayName;
  } else if (profileDisplayName) {
    profileDisplayName.textContent = user.email?.split("@")[0] || "Usuario";
  }
  if (profilePhotoDisplay && user.photoURL) {
    profilePhotoDisplay.innerHTML = `<img src="${user.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  }
}

window.handlePhotoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showNotification("Por favor selecciona un archivo de imagen válido", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    showNotification("La imagen debe ser menor a 5MB", "error");
    return;
  }
  try {
    const reader = new FileReader();
    reader.onload = (e) => {
      profilePhotoDisplay.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    };
    reader.readAsDataURL(file);

    showNotification("Subiendo foto de perfil...", "info");
    const result = await uploadProfilePhoto(file);
    showNotification("Foto de perfil actualizada exitosamente", "success");
    updateNavbarProfile();
  } catch (error) {
    showNotification("Error al subir la foto de perfil", "error");
    const user = getCurrentUser();
    if (user?.photoURL) {
      profilePhotoDisplay.innerHTML = `<img src="${user.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
      profilePhotoDisplay.innerHTML = `<i class="fas fa-user-circle"></i>`;
    }
  }
};

profileForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  saveProfileBtn.disabled = true;
  saveProfileText.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
  saveProfileSpinner.classList.remove("d-none");
  try {
    const profileData = {
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim(),
      city: cityInput.value.trim(),
      state: stateInput.value,
      zipCode: zipCodeInput.value.trim()
    };
    await updateProfile(profileData);
    const newPassword = newPasswordInput.value.trim();
    if (newPassword) {
      if (newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
      await updatePassword(newPassword);
      newPasswordInput.value = "";
    }
    showNotification('<i class="fas fa-check-circle me-2"></i>Perfil actualizado exitosamente', "success");
    await loadUserProfile();
  } catch (error) {
    showNotification('<i class="fas fa-exclamation-triangle me-2"></i>' + (error.message || "Error al actualizar perfil"), "error");
  } finally {
    saveProfileBtn.disabled = false;
    saveProfileText.textContent = "Actualizar perfil";
    saveProfileSpinner.classList.add("d-none");
  }
});

photoUploadInput?.addEventListener("change", window.handlePhotoUpload);

// Mostrar ícono de contraseña actual
function displayCurrentPassword() {
  const currentPasswordField = document.getElementById('currentPassword');
  if (currentPasswordField) {
    currentPasswordField.value = '••••••••';
  }
}

// Validación de código postal (sólo números)
zipCodeInput?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

// Validación de teléfono básico
phoneInput?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9()\-\s]/g, "");
});

// Mostrar notificaciones
function showNotification(message, type = "info") {
  const notification = document.createElement("div");
  notification.className = `alert alert-${type === "error" ? "danger" : type === "success" ? "success" : "info"} alert-dismissible fade show`;
  notification.style.position = "fixed";
  notification.style.top = "20px";
  notification.style.right = "20px";
  notification.style.zIndex = "9999";
  notification.style.minWidth = "300px";
  notification.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

// Actualizar foto en navbar después de actualizar perfil
async function updateNavbarProfile() {
  try {
    const profile = await getProfile();
    if (typeof window.updateNavbarProfile === 'function') {
      window.updateNavbarProfile(profile);
    }
    const profileIcon = document.getElementById('profileIcon');
    if (profileIcon && profile?.photoURL) {
      profileIcon.outerHTML = `
        <img id="profileIcon" 
             src="${profile.photoURL}" 
             class="profile-photo rounded-circle border border-2 border-purple" 
             width="40" 
             height="40" 
             alt="Foto de perfil"
             style="object-fit: cover; cursor: pointer;">
      `;
    }
  } catch (error) {
    console.error('Error al actualizar navbar:', error);
  }
}

// Mostrar ícono de MFA si está activo
async function updateMFAIcon() {
  try {
    const resp = await fetch('/api/auth/2fa-simple/status', { credentials: 'include' });
    const data = await resp.json();
    const mfaIcon = document.getElementById('mfaStatusIcon');
    if (data && data.enabled && mfaIcon) {
      mfaIcon.style.display = 'inline-block';
    } else if (mfaIcon) {
      mfaIcon.style.display = 'none';
    }
  } catch (e) {}
}
document.addEventListener('DOMContentLoaded', updateMFAIcon);
