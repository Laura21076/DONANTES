import { getAuth, updatePassword as firebaseUpdatePassword } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
const auth = getAuth();

// Cambiar contraseña del usuario actual
export async function updatePassword(newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  await firebaseUpdatePassword(user, newPassword);
}
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
