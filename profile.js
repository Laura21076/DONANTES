import { getUserProfile, updateUserProfile, uploadProfileImage } from './profile-firebase.js';

// Obtener perfil de usuario (Firebase)
export async function getProfile() {
  return getUserProfile();
}

// Actualizar perfil de usuario (Firebase)
export async function updateProfile(data) {
  return updateUserProfile(data);
}

// Subir imagen de perfil (Firebase)
export async function uploadProfilePhoto(file) {
  return uploadProfileImage(file);
}
// ...existing code...
