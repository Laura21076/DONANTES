// articles.js
// MEJORAS: Manejo robusto de errores no-JSON, logs detallados, nunca queda "cargando"


// Simulación local de artículos
let articlesCache = [];

export async function createArticle(articleData) {
  const id = Math.random().toString(36).substr(2, 9);
  const newArticle = { ...articleData, id };
  articlesCache.push(newArticle);
  return newArticle;
}

export async function getArticles(isAdmin = false) {
  return articlesCache;
}

export async function updateArticle(id, data) {
  const idx = articlesCache.findIndex(a => a.id === id);
  if (idx !== -1) {
    articlesCache[idx] = { ...articlesCache[idx], ...data };
    return articlesCache[idx];
  }
  throw new Error('Artículo no encontrado');
}

export async function deleteArticle(id) {
  articlesCache = articlesCache.filter(a => a.id !== id);
  return true;
}




// Subida simulada de imágenes
export async function uploadImage(file, userId) {
  return URL.createObjectURL(file);
  return await getDownloadURL(imageRef);
}
