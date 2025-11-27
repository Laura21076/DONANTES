import { auth } from './firebase.js';

// 1. Obtener el token actual de usuario autenticado
async function getAuthToken() {
  const user = auth.currentUser;
  if (!user) throw new Error('Usuario no autenticado');
  return user.getIdToken();
}

// 2. Obtener perfil de usuario (GET)
export async function getProfile() {
  const token = await getAuthToken();
  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo obtener el perfil');
  }
  return await resp.json();
}

// 3. Actualizar perfil de usuario (PUT)
export async function updateProfile(data) {
  const token = await getAuthToken();
  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo actualizar el perfil');
  }
  return await resp.json();
}

// 4. Cambiar contraseña de usuario (POST)
export async function updatePassword(newPassword) {
  const token = await getAuthToken();
  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ newPassword })
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo actualizar la contraseña');
  }
  return await resp.json();
}

// 5. Subir foto de perfil (POST multipart/form-data)
export async function uploadProfilePhoto(file) {
  const token = await getAuthToken();
  const formData = new FormData();
  formData.append('photo', file);

  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/photo', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
      // ¡NO pongas Content-Type, el browser lo maneja por FormData!
    },
    body: formData
  });
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo subir la foto de perfil');
  }
  const result = await resp.json();
  return result.photoURL; // Espera que el backend regrese esto
}
