import { auth } from './firebase.js';
import { getToken } from './db.js';
import { getCurrentUser } from './auth.js';

// 1. Obtener el token actual de usuario autenticado
// Primero intenta obtenerlo del storage (IndexedDB), luego de Firebase Auth
async function getAuthToken() {
  // Intentar obtener token del almacenamiento (IndexedDB)
  let token = await getToken('access');

  // Si no hay token en storage, intentar obtenerlo de Firebase Auth (robusto)
  if (!token) {
    const user = await getCurrentUser();
    if (user) {
      token = await user.getIdToken();
    }
  }

  // Si aún no hay token, redirigir a login
  if (!token) {
    console.warn('No se encontró token de autenticación, redirigiendo a login');
    window.location.replace('login.html');
    // Retornar null para indicar que no hay token (la redirección ya está en curso)
    return null;
  }

  return token;
}

// Función auxiliar para manejar respuestas con token inválido
async function handleResponse(resp) {
  if (resp.status === 401 || resp.status === 403) {
    console.warn('Token inválido o expirado, redirigiendo a login');
    window.location.replace('login.html');
    // Retornar null para indicar error de autenticación
    return null;
  }
  return resp;
}

// 2. Obtener perfil de usuario (GET)
export async function getProfile() {
  const token = await getAuthToken();
  if (!token) return null; // Redirección en curso
  
  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  
  // Manejar token inválido/expirado
  const validatedResp = await handleResponse(resp);
  if (!validatedResp) return null; // Redirección en curso
  
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo obtener el perfil');
  }
  return await resp.json();
}

// 3. Actualizar perfil de usuario (PUT)
export async function updateProfile(data) {
  const token = await getAuthToken();
  if (!token) return null; // Redirección en curso
  
  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  
  // Manejar token inválido/expirado
  const validatedResp = await handleResponse(resp);
  if (!validatedResp) return null; // Redirección en curso
  
  if (!resp.ok) {
    const error = await resp.json().catch(() => ({}));
    throw new Error(error?.error || 'No se pudo actualizar el perfil');
  }
  return await resp.json();
}

// 4. Cambiar contraseña de usuario (POST)
export async function updatePassword(newPassword) {
  const token = await getAuthToken();
  if (!token) return null; // Redirección en curso
  
  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/password', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ newPassword })
  });
  
  // Manejar token inválido/expirado
  const validatedResp = await handleResponse(resp);
  if (!validatedResp) return null; // Redirección en curso
  
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

  const resp = await fetch('https://donantes-backend-202152301689.northamerica-south1.run.app/api/users/photo', {
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
