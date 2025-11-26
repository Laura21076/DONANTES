import { getIdToken } from './auth.js';

const API_URL = 'http://127.0.0.1:4000/api';

// Crear un nuevo artículo
export async function createArticle(articleData) {
  try {
    console.log('📤 Creating article with data:', articleData);
    const token = await getIdToken();
    console.log('🔑 Token obtained:', token ? 'YES' : 'NO', token?.substring(0, 20) + '...');
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
      console.error('❌ Error response:', error);
      throw new Error(error.error || 'Error al crear artículo');
    }

    const result = await response.json();
    console.log('✅ Article created successfully:', result);
    return result;
  } catch (error) {
    console.error('❌ Error al crear artículo:', error);
    throw error;
  }
}

// Obtener todos los artículos (con filtros opcionales)
export async function getArticles(filters = {}) {
  try {
    console.log('Fetching articles with filters:', filters);
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_URL}/articles?${params}`);

    if (!response.ok) {
      const error = await response.json();
      console.error('Error response:', error);
      throw new Error(error.error || 'Error al obtener artículos');
    }

    const result = await response.json();
    console.log('Articles fetched successfully:', result?.length || 0, result);
    return result;
  } catch (error) {
    console.error('Error al obtener artículos:', error);
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
    console.error('Error al obtener mis artículos:', error);
    throw error;
  }
}

// Obtener un artículo específico
export async function getArticleById(id) {
  try {
    const response = await fetch(`${API_URL}/articles/${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener artículo');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al obtener artículo:', error);
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
    console.error('Error al actualizar artículo:', error);
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
    console.error('Error al eliminar artículo:', error);
    throw error;
  }
}
