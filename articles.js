// articles.js

import { getIdToken } from './auth.js';

const API_URL = 'https://donantes-backend-202152301689.northamerica-south1.run.app/api';

// Crear un nuevo artículo
export async function createArticle(articleData) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/articles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al crear artículo');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Obtener todos los artículos (con filtros opcionales) -- CORREGIDO: ahora siempre pasa el token por seguridad
export async function getArticles(filters = {}) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/articles?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener artículos');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Obtener mis artículos
export async function getMyArticles() {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/articles/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener artículos');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Obtener un artículo específico -- CORREGIDO: incluir token
export async function getArticleById(id) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');
    const response = await fetch(`${API_URL}/articles/${id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener artículo');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Actualizar un artículo
export async function updateArticle(id, articleData) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(articleData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al actualizar artículo');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}

// Eliminar un artículo
export async function deleteArticle(id) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/articles/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al eliminar artículo');
    }

    return await response.json();
  } catch (error) {
    throw error;
  }
}
