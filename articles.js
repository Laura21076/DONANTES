// articles.js
// MEJORAS: Manejo robusto de errores no-JSON, logs detallados, nunca queda "cargando"

import { createArticle as fbCreateArticle, getArticles as fbGetArticles, updateArticle as fbUpdateArticle, deleteArticle as fbDeleteArticle } from './articles-firebase.js';

// Crear un nuevo artículo (Firebase)
export async function createArticle(articleData) {
  return fbCreateArticle(articleData);
}

// Obtener todos los artículos (Firebase)
export async function getArticles(isAdmin = false) {
  return fbGetArticles(isAdmin);
}

// Editar artículo (Firebase)
export async function updateArticle(id, data) {
  return fbUpdateArticle(id, data);
}

// Eliminar artículo (Firebase)
export async function deleteArticle(id) {
  return fbDeleteArticle(id);
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
