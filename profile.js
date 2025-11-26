// Script para gestionar el perfil del usuario

import { storage } from 'firebase.js';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';



import { getCurrentUser, getIdToken, subscribeToAuth } from "auth.js";
import { 
  getProfile, 
  updateProfile, 
  updatePassword,
  uploadProfilePhoto
} from "profile.js";

console.log("🔄 PROFILE.JS CARGADO - TIMESTAMP:", new Date().toISOString());

// Elementos del DOM
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
const photoUploadInput = document.getElementById("photoUpload");
const profilePhotoDisplay = document.getElementById("profilePhotoDisplay");
const profileDisplayName = document.getElementById("profileDisplayName");
const profileDisplayEmail = document.getElementById("profileDisplayEmail");
const firestore = getFirestore();
const auth = getAuth();

// Verificar autenticación usando subscription
let authInitialized = false;

document.addEventListener("DOMContentLoaded", () => {
  console.log("🔄 Página de perfil cargada, verificando auth...");
  
  // Función para verificar autenticación y cargar perfil
  const checkAuthAndLoadProfile = () => {
    const currentUser = getCurrentUser();
    console.log("🔍 Usuario actual:", currentUser);
    
    if (currentUser) {
      console.log("✅ Usuario encontrado:", currentUser.email);
      loadUserProfile();
    } else {
      console.log("❌ No hay usuario autenticado");
      
      // Verificación rápida antes de redirigir
      setTimeout(() => {
        const retryUser = getCurrentUser();
        if (retryUser) {
          console.log("✅ Usuario encontrado en retry:", retryUser.email);
          loadUserProfile();
        } else {
          console.log("❌ Confirmado: no hay usuario, redirigiendo a login...");
          window.location.replace("login.html");
        }
      }, 100); // Reducido de 1000ms a 100ms para mayor velocidad
    }
  };

  // Verificar inmediatamente
  checkAuthAndLoadProfile();
  
  // También suscribirse como fallback
  subscribeToAuth((user) => {
    if (!authInitialized) {
      authInitialized = true;
      console.log("🔄 Auth inicializado vía subscription, usuario:", user?.email || "ninguno");
      
      if (user) {
        loadUserProfile();
      }
    }
  });
});

// Forzar actualización si phone o address parecen encriptados
function needsDecryptionFix(value) {
  return typeof value === 'string' && value.includes(':') && value.length > 20;
}

async function fixDecryptedProfileIfNeeded(profile) {
  if (needsDecryptionFix(profile.phone) || needsDecryptionFix(profile.address)) {
    try {
      await updateProfile({
        phone: profile.phone && !needsDecryptionFix(profile.phone) ? profile.phone : '',
        address: profile.address && !needsDecryptionFix(profile.address) ? profile.address : '',
      });
      // Recargar perfil tras actualizar
      setTimeout(() => window.location.reload(), 1000);
    } catch (e) {
      console.warn('No se pudo actualizar perfil para desencriptar:', e);
    }
  }
}

// Cargar datos del perfil
async function loadUserProfile() {
  try {
    console.log("🔄 Iniciando carga de perfil de usuario...");
    
    let user;
    try {
      user = getCurrentUser();
      console.log("👤 getCurrentUser() resultado:", user);
    } catch (error) {
      console.error("❌ Error obteniendo usuario:", error);
      window.location.href = "login.html";
      return;
    }
    
    if (!user) {
      console.error("❌ No hay usuario autenticado en loadUserProfile");
      window.location.href = "login.html";
      return;
    }

    console.log("👤 Usuario autenticado completo:", {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      usuario: user
    });
    
    // Cargar datos básicos de Firebase Auth primero
    if (emailInput) {
      emailInput.value = user.email || "";
      console.log("📧 Email cargado en input:", user.email);
    }
    if (profileDisplayEmail) {
      profileDisplayEmail.textContent = user.email || "";
      console.log("📧 Email mostrado en display:", user.email);
    }
    
    // Si hay displayName en Firebase, pre-cargar nombre y apellido como fallback temporal
    if (user.displayName && !user.displayName.includes('@')) {
      const nameParts = user.displayName.split(' ');
      if (firstNameInput && nameParts.length > 0) {
        firstNameInput.value = nameParts[0];
        console.log("👤 Nombre pre-cargado desde displayName (temporal):", nameParts[0]);
      }
      if (lastNameInput && nameParts.length > 1) {
        lastNameInput.value = nameParts.slice(1).join(' ');
        console.log("👤 Apellido pre-cargado desde displayName (temporal):", nameParts.slice(1).join(' '));
      }
    }
    
    console.log("✅ Datos básicos cargados desde Firebase Auth");

    // FORZAR CARGA DE DATOS DEL BACKEND - PRIORITARIO
    try {
      console.log("🔄 Cargando perfil desde backend con prioridad...");
      const profile = await getProfile();
      console.log("📊 Perfil COMPLETO recibido del backend:", profile);
      
      if (profile && typeof profile === 'object') {
        // FORZAR ACTUALIZACIÓN de nombre y apellido desde backend - SIEMPRE
        if (firstNameInput) {
          const firstName = profile.firstName || "";
          firstNameInput.value = firstName;
          console.log("NOMBRE FORZADO desde backend:", firstName);
          
          // Múltiples formas de asegurar que el valor se mantenga
          firstNameInput.setAttribute('value', firstName);
          firstNameInput.defaultValue = firstName;
          
          // Prevenir que se borre el campo - evento adicional
          firstNameInput.addEventListener('blur', function() {
            if (!this.value && firstName) {
              this.value = firstName;
              console.log("NOMBRE RESTAURADO:", firstName);
            }
          });
          
          // Prevenir que se borre el campo
          if (firstName) {
            firstNameInput.setAttribute('data-loaded', 'true');
            firstNameInput.setAttribute('data-original-value', firstName);
            
            // Verificar después de 2 segundos
            setTimeout(() => {
              if (!firstNameInput.value && firstName) {
                firstNameInput.value = firstName;
                console.log("NOMBRE RE-FORZADO después de 2s:", firstName);
              }
            }, 2000);
          }
        }
        
        if (lastNameInput) {
          const lastName = profile.lastName || "";
          lastNameInput.value = lastName;
          console.log("APELLIDO FORZADO desde backend:", lastName);
          
          // Múltiples formas de asegurar que el valor se mantenga
          lastNameInput.setAttribute('value', lastName);
          lastNameInput.defaultValue = lastName;
          
          // Prevenir que se borre el campo - evento adicional
          lastNameInput.addEventListener('blur', function() {
            if (!this.value && lastName) {
              this.value = lastName;
              console.log("APELLIDO RESTAURADO:", lastName);
            }
          });
          
          // Prevenir que se borre el campo
          if (lastName) {
            lastNameInput.setAttribute('data-loaded', 'true');
            lastNameInput.setAttribute('data-original-value', lastName);
            
            // Verificar después de 2 segundos
            setTimeout(() => {
              if (!lastNameInput.value && lastName) {
                lastNameInput.value = lastName;
                console.log("APELLIDO RE-FORZADO después de 2s:", lastName);
              }
            }, 2000);
          }
        }
        
        // Llenar resto de campos con los datos del perfil
        if (phoneInput) {
          phoneInput.value = profile.phone || "";
          console.log("🔧 Teléfono cargado:", profile.phone);
        }
        if (addressInput) {
          addressInput.value = profile.address || "";
          console.log("🔧 Dirección cargada:", profile.address);
        }
        if (cityInput) {
          cityInput.value = profile.city || "";
          console.log("🔧 Ciudad cargada:", profile.city);
        }
        if (stateInput) {
          stateInput.value = profile.state || "";
          console.log("🔧 Estado cargado:", profile.state);
        }
        if (zipCodeInput) {
          zipCodeInput.value = profile.zipCode || "";
          console.log("🔧 CP cargado:", profile.zipCode);
        }
        
        // Actualizar nombre mostrado en el header
        const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
        if (profileDisplayName) {
          if (fullName) {
            profileDisplayName.textContent = fullName;
          } else if (profile.displayName) {
            profileDisplayName.textContent = profile.displayName;
          } else {
            profileDisplayName.textContent = user.email?.split("@")[0] || "Usuario";
          }
        }

        // Mostrar foto de perfil si existe
        if (profilePhotoDisplay) {
          if (profile.photoURL) {
            profilePhotoDisplay.innerHTML = `<img src="${profile.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
          } else if (user.photoURL) {
            profilePhotoDisplay.innerHTML = `<img src="${user.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
          }
        }
        
        console.log("✅ Perfil completo cargado desde backend");
      } else {
        console.warn("⚠️ Perfil vacío o inválido desde backend, usando fallback");
        useFallbackData(user);
      }

    } catch (profileError) {
      console.error("❌ Error al cargar datos del perfil desde backend:", profileError);
      console.log("🔄 Usando datos de fallback de Firebase Auth...");
      useFallbackData(user);
    }

    // Configurar evento de subida de foto
    if (photoUploadInput) {
      photoUploadInput.addEventListener('change', handlePhotoUpload);
    }

    // Mostrar indicador de contraseña actual
    displayCurrentPassword();

    console.log("✅ loadUserProfile completado");
    
  } catch (error) {
    console.error("❌ Error general en loadUserProfile:", error);
  }
}

// Función auxiliar para datos de fallback
function useFallbackData(user) {
  console.log("🔄 Aplicando datos de fallback para usuario:", user.email);
  
  const displayName = user.displayName || "";
  const nameParts = displayName.split(" ");
  
  if (nameParts.length >= 2) {
    if (firstNameInput) firstNameInput.value = nameParts[0];
    if (lastNameInput) lastNameInput.value = nameParts.slice(1).join(" ");
    if (profileDisplayName) profileDisplayName.textContent = displayName;
  } else if (displayName) {
    if (firstNameInput) firstNameInput.value = displayName;
    if (profileDisplayName) profileDisplayName.textContent = displayName;
  } else {
    if (profileDisplayName) profileDisplayName.textContent = user.email?.split("@")[0] || "Usuario";
  }

  // Mostrar foto de perfil de Auth si existe
  if (profilePhotoDisplay && user.photoURL) {
    profilePhotoDisplay.innerHTML = `<img src="${user.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
  }
  
  console.log("✅ Datos de fallback aplicados correctamente");
}

// ================== MANEJO DE FOTO DE PERFIL ==================

// Función global para manejar la subida de foto
window.handlePhotoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tipo de archivo
  if (!file.type.startsWith('image/')) {
    showNotification("Por favor selecciona un archivo de imagen válido", "error");
    return;
  }

  // Validar tamaño (máximo 5MB)
  if (file.size > 5 * 1024 * 1024) {
    showNotification("La imagen debe ser menor a 5MB", "error");
    return;
  }

  try {
    // Mostrar vista previa inmediatamente
    const reader = new FileReader();
    reader.onload = (e) => {
      profilePhotoDisplay.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    };
    reader.readAsDataURL(file);

    // Subir la imagen
    showNotification("Subiendo foto de perfil...", "info");
    const result = await uploadProfilePhoto(file);
    
    showNotification("Foto de perfil actualizada exitosamente", "success");
    console.log("Nueva foto URL:", result.photoURL);

    // Actualizar navbar inmediatamente
    updateNavbarProfile();

  } catch (error) {
    console.error("Error al subir foto:", error);
    showNotification("Error al subir la foto de perfil", "error");
    
    // Revertir a la imagen anterior o icono por defecto
    const user = getCurrentUser();
    if (user?.photoURL) {
      profilePhotoDisplay.innerHTML = `<img src="${user.photoURL}" alt="Foto de perfil" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">`;
    } else {
      profilePhotoDisplay.innerHTML = `<i class="fas fa-user-circle"></i>`;
    }
  }
};

// Manejar envío del formulario
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  // Deshabilitar botón y mostrar spinner animado
  saveProfileBtn.disabled = true;
  saveProfileText.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
  saveProfileSpinner.classList.remove("d-none");

  try {
    // Preparar datos del perfil
    const profileData = {
      firstName: firstNameInput.value.trim(),
      lastName: lastNameInput.value.trim(),
      phone: phoneInput.value.trim(),
      address: addressInput.value.trim(),
      city: cityInput.value.trim(),
      state: stateInput.value,
      zipCode: zipCodeInput.value.trim()
    };

    // Actualizar perfil
    await updateProfile(profileData);

    // Si hay nueva contraseña, actualizarla
    const newPassword = newPasswordInput.value.trim();
    if (newPassword) {
      if (newPassword.length < 6) {
        throw new Error("La contraseña debe tener al menos 6 caracteres");
      }
      await updatePassword(newPassword);
      newPasswordInput.value = ""; // Limpiar campo de contraseña
    }

    showNotification('<i class="fas fa-check-circle me-2"></i>Perfil actualizado exitosamente', "success");
    // Recargar datos del perfil
    await loadUserProfile();
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    showNotification('<i class="fas fa-exclamation-triangle me-2"></i>' + (error.message || "Error al actualizar perfil"), "error");
  } finally {
    // Rehabilitar botón y ocultar spinner
    saveProfileBtn.disabled = false;
    saveProfileText.textContent = "Actualizar perfil";
    saveProfileSpinner.classList.add("d-none");
  }
});

// Manejar subida de foto de perfil
uploadPicInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  
  if (!file) return;

  // Validar tipo de archivo
  if (!file.type.startsWith("image/")) {
    showNotification("Por favor selecciona una imagen válida", "error");
    return;
  }

  // Validar tamaño (máximo 2MB)
  if (file.size > 2 * 1024 * 1024) {
    showNotification("La imagen debe ser menor a 2MB", "error");
    return;
  }

  try {
    // Convertir imagen a base64 para preview
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      const imageDataUrl = event.target.result;
      
      // Mostrar preview
      profileIconImg.src = imageDataUrl;
      
      import { storage } from './firebase.js';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firestore = getFirestore();
const auth = getAuth();

// Subir un archivo de imagen (png, jpg, jpeg, etc) seleccionado por el usuario
document.getElementById('profilePhotoInput').addEventListener('change', async function(e) {
  const file = e.target.files[0];
  if (!file) return;

  // Opcional: comprueba tipo o tamaño aquí si quieres limitar archivos
  if (!file.type.startsWith('image/')) {
    showNotification("Solo puedes subir imágenes (jpg, png, ...)", "error");
    return;
  }
  if (file.size > 5 * 1024 * 1024) { // 5MB límite
    showNotification("El archivo es demasiado grande (máx. 5 MB)", "error");
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      showNotification("Debes iniciar sesión", "error");
      return;
    }

    // 1. Sube a FIREBASE STORAGE (carpeta por usuario con nombre único por fecha)
    const photoRef = ref(storage, `profiles/${user.uid}/photo_${Date.now()}`);
    await uploadBytes(photoRef, file);

    // 2. Obtén la URL de descarga
    const downloadUrl = await getDownloadURL(photoRef);

    // 3. Guarda la URL en FIRESTORE en el DOC DEL USUARIO
    await updateDoc(doc(firestore, "users", user.uid), {
      photoURL: downloadUrl
    });

    showNotification("Foto de perfil actualizada correctamente", "success");
    // Si tienes un <img id="profileAvatar"> para PREVIA
    document.getElementById('profileAvatar').src = downloadUrl;

  } catch (error) {
    console.error("Error al subir foto:", error);
    showNotification("Error al subir la foto", "error");
  }
});
    
    reader.readAsDataURL(file);
  } catch (error) {
    console.error("Error al procesar imagen:", error);
    showNotification("Error al procesar la imagen", "error");
  }
});

// Función para mostrar notificaciones
function showNotification(message, type = "info") {
  // Crear elemento de notificación
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

  // Auto-cerrar después de 5 segundos
  setTimeout(() => {
    notification.remove();
  }, 5000);
}

import '../utils/toggle-password.js';

// Función para simular contraseña actual (solo para mostrar el campo)
function displayCurrentPassword() {
  const currentPasswordField = document.getElementById('currentPassword');
  if (currentPasswordField) {
    // Mostrar una representación de la contraseña actual (no la real por seguridad)
    currentPasswordField.value = '••••••••';
  }
}

// Validación de código postal (solo números)
zipCodeInput?.addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/[^0-9]/g, "");
});

// Validación de teléfono
phoneInput?.addEventListener("input", (e) => {
  // Permitir solo números, paréntesis, guiones y espacios
  e.target.value = e.target.value.replace(/[^0-9()\-\s]/g, "");
});

// Función PRINCIPAL: subir archivo a Storage y guardar URL en Firestore
async function uploadProfilePhoto(file) {
  const user = auth.currentUser;
  if (!user) throw new Error('Debes iniciar sesión');

  // Crea referencia ("carpeta"/nombre) y sube
  const photoRef = ref(storage, `profiles/${user.uid}/photo_${Date.now()}.${file.name.split('.').pop()}`);
  await uploadBytes(photoRef, file);
  const downloadUrl = await getDownloadURL(photoRef);

  // Guarda la URL pública en Firestore
  await updateDoc(doc(firestore, "users", user.uid), {
    photoURL: downloadUrl
  });

  return { photoURL: downloadUrl };
}

// Función para manejar la subida de foto de perfil
async function handlePhotoUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("📸 Archivo seleccionado:", file.name, file.size, "bytes");

  // Validaciones
  if (!file.type.startsWith('image/')) {
    alert('Por favor, selecciona una imagen válida');
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('La imagen es muy grande. Máximo 5MB permitido');
    return;
  }

  try {
    // Preview inmediata
    const reader = new FileReader();
    reader.onload = function(e) {
      const photoDisplay = document.getElementById('profilePhotoDisplay');
      if (photoDisplay) {
        photoDisplay.innerHTML = `<img src="${e.target.result}" alt="Foto de perfil" class="rounded-circle" style="width: 100%; height: 100%; object-fit: cover;">`;
      }
    };
    reader.readAsDataURL(file);

    console.log("📤 Subiendo foto a Firebase Storage...");
    const result = await uploadProfilePhoto(file);

    if (result.photoURL) {
      console.log("✅ Foto subida exitosamente:", result.photoURL);

      // Actualiza navbar
      updateNavbarProfile();

      // Muestra mensaje de éxito
      const successMessage = document.createElement('div');
      successMessage.className = 'alert alert-success alert-dismissible fade show';
      successMessage.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
        Foto de perfil actualizada exitosamente
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      `;

      const form = document.getElementById('profileForm');
      if (form) {
        form.parentNode.insertBefore(successMessage, form);

        setTimeout(() => {
          if (successMessage.parentNode) {
            successMessage.remove();
          }
        }, 3000);
      }
    }
  } catch (error) {
    console.error("❌ Error al subir foto:", error);

    // Restaurar imagen anterior
    const photoDisplay = document.getElementById('profilePhotoDisplay');
    if (photoDisplay) {
      photoDisplay.innerHTML = '<i class="fas fa-user-circle"></i>';
    }

    // Mensaje de error
    const errorMessage = document.createElement('div');
    errorMessage.className = 'alert alert-danger alert-dismissible fade show';
    errorMessage.innerHTML = `
      <i class="fas fa-exclamation-triangle me-2"></i>
      Error al subir la foto: ${error.message || 'Error desconocido'}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    const form = document.getElementById('profileForm');
    if (form) {
      form.parentNode.insertBefore(errorMessage, form);

      setTimeout(() => {
        if (errorMessage.parentNode) {
          errorMessage.remove();
        }
      }, 5000);
    }
  }
}
// Función para actualizar el navbar con la foto del usuario
async function updateNavbarProfile() {
  try {
    // Obtener perfil del usuario
    const profile = await getProfile();
    
    // Llamar a la función global si existe
    if (typeof window.updateNavbarProfile === 'function') {
      window.updateNavbarProfile(profile);
    }
    
    // También buscar el elemento directamente en caso de que estemos en la página de perfil
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

// Mostrar ícono MFA si está activo
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

