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
  
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo actualizar la contraseña');
  }
  return await resp.json();
}

// 5. Subir foto de perfil (POST multipart/form-data)
export async function uploadProfilePhoto(file) {
  const token = await getAuthToken();
  if (!token) return null; // Redirección en curso
  
  const formData = new FormData();
  formData.append('photo', file);

  const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
  const resp = await fetch(`${backendUrl}/api/users/photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // ¡NO pongas Content-Type, el browser lo maneja por FormData!
    },
    body: formData
  });
  
  // Manejar token inválido/expirado
  const validatedResp = await handleResponse(resp);
  if (!validatedResp) return null; // Redirección en curso
  
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo subir la foto de perfil');
  }
  const result = await resp.json();
  return result.photoURL; // Espera que el backend regrese esto
}
