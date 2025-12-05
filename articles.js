// articles.js
// MEJORAS: Manejo robusto de errores no-JSON, logs detallados, nunca queda "cargando"

import { getIdToken } from './auth.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const API_URL = 'https://donantes-backend-202152301689.northamerica-south1.run.app/api';

/**
 * Helper para parsear respuesta del backend de forma segura
 * Si el backend responde con error no-JSON, retorna un objeto de error genérico
 */
async function safeParseJSON(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('[PARSE_ERROR] Respuesta no es JSON válido:', text.substring(0, 200));
    return { error: text || 'Error desconocido del servidor', _raw: text };
  }
}

// Crear un nuevo artículo
export async function createArticle(articleData) {
  console.log('[createArticle] Iniciando creación de artículo...', articleData);
  try {
    const { getToken } = await import('./db.js');
    const token = await getToken('access');
    if (!token) {
      console.error('[createArticle] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }
    console.log('[createArticle] Token obtenido, enviando al backend...');

    const response = await fetch(`${API_URL}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    });

    console.log('[createArticle] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[createArticle] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al crear artículo (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[createArticle] Artículo creado exitosamente:', result);
    return result;
  } catch (error) {
    console.error('[createArticle] Excepción:', error);
    throw error;
  }
}

// Obtener todos los artículos (con filtros opcionales) -- CORREGIDO: ahora siempre pasa el token por seguridad
export async function getArticles(filters = {}) {
  console.log('[getArticles] Obteniendo artículos con filtros:', filters);
  try {
    const { getToken } = await import('./db.js');
    const token = await getToken('access');
    if (!token) {
      console.error('[getArticles] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    const params = new URLSearchParams(filters);
    console.log('[getArticles] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/articles?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[getArticles] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[getArticles] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al obtener artículos (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[getArticles] Artículos obtenidos:', Array.isArray(result) ? result.length : 'N/A');
    return result;
  } catch (error) {
    console.error('[getArticles] Excepción:', error);
    throw error;
  }
}

// Obtener mis artículos
export async function getMyArticles() {
  console.log('[getMyArticles] Obteniendo mis artículos...');
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[getMyArticles] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[getMyArticles] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/articles/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[getMyArticles] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[getMyArticles] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al obtener artículos (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[getMyArticles] Artículos obtenidos:', Array.isArray(result) ? result.length : 'N/A');
    return result;
  } catch (error) {
    console.error('[getMyArticles] Excepción:', error);
    throw error;
  }
}

// Obtener un artículo específico -- CORREGIDO: incluir token
export async function getArticleById(id) {
  console.log('[getArticleById] Obteniendo artículo:', id);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[getArticleById] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[getArticleById] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/articles/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[getArticleById] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[getArticleById] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al obtener artículo (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[getArticleById] Artículo obtenido exitosamente');
    return result;
  } catch (error) {
    console.error('[getArticleById] Excepción:', error);
    throw error;
  }
}

// Actualizar un artículo
export async function updateArticle(id, articleData) {
  console.log('[updateArticle] Actualizando artículo:', id, articleData);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[updateArticle] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }
    console.log('[updateArticle] Token obtenido, enviando al backend...');

    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    });

    console.log('[updateArticle] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[updateArticle] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al actualizar artículo (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[updateArticle] Artículo actualizado exitosamente');
    return result;
  } catch (error) {
    console.error('[updateArticle] Excepción:', error);
    throw error;
  }
}

// Eliminar un artículo
export async function deleteArticle(id) {
  console.log('[deleteArticle] Eliminando artículo:', id);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[deleteArticle] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }
    console.log('[deleteArticle] Token obtenido, enviando al backend...');

    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[deleteArticle] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[deleteArticle] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al eliminar artículo (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[deleteArticle] Artículo eliminado exitosamente');
    return result;
  } catch (error) {
    console.error('[deleteArticle] Excepción:', error);
    throw error;
  }
}

// --- Subida de imágenes a Firebase Storage ---

/**
 * Sube una imagen a Firebase Storage y devuelve la URL pública
 * @param {File} file - Archivo de imagen
 * @param {string} userId - ID del usuario
 * @returns {Promise<string>} URL pública de la imagen
 */
export async function uploadImage(file, userId) {
  const storage = getStorage();
  const imageRef = ref(storage, `articles/${userId}/${Date.now()}_${file.name}`);
  await uploadBytes(imageRef, file);
  return await getDownloadURL(imageRef);
}
