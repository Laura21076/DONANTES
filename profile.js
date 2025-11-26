// Servicio para gestionar el perfil de usuario
import { getIdToken } from "./auth.js";

const API_URL = "http://127.0.0.1:4000/api";

// Obtener perfil del usuario actual
export async function getProfile() {
  try {
    const token = await getIdToken();

    const response = await fetch(`${API_URL}/users/profile`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      credentials: "include"
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al obtener perfil");
    }

    return data;
  } catch (error) {
    console.error("Error al obtener perfil:", error);
    throw error;
  }
}

// Actualizar perfil del usuario
export async function updateProfile(profileData) {
  try {
    const token = await getIdToken();

    const response = await fetch(`${API_URL}/users/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      credentials: "include",
      body: JSON.stringify(profileData)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al actualizar perfil");
    }

    return data;
  } catch (error) {
    console.error("Error al actualizar perfil:", error);
    throw error;
  }
}

// Actualizar email
export async function updateEmail(newEmail) {
  try {
    const token = await getIdToken();

    const response = await fetch(`${API_URL}/users/email`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      credentials: "include",
      body: JSON.stringify({ newEmail })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al actualizar email");
    }

    return data;
  } catch (error) {
    console.error("Error al actualizar email:", error);
    throw error;
  }
}

// Cambiar contraseña
export async function updatePassword(newPassword) {
  try {
    const token = await getIdToken();

    const response = await fetch(`${API_URL}/users/password`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      credentials: "include",
      body: JSON.stringify({ newPassword })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al actualizar contraseña");
    }

    return data;
  } catch (error) {
    console.error("Error al actualizar contraseña:", error);
    throw error;
  }
}

// Subir foto de perfil
export async function uploadProfilePhoto(file) {
  try {
    const token = await getIdToken();
    
    // Crear FormData para enviar el archivo
    const formData = new FormData();
    formData.append('photo', file);

    const response = await fetch(`${API_URL}/users/photo`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`
      },
      credentials: "include",
      body: formData
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Error al subir foto");
    }

    return data; // Retornar todo el objeto que incluye photoURL
  } catch (error) {
    console.error("Error al subir foto:", error);
    throw error;
  }
}
