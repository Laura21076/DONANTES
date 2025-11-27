/**
 * image-utils.js
 * 
 * Utilidades para manejo robusto de imágenes de Firebase Storage
 * - Construcción correcta de URLs con encodeURIComponent
 * - Manejo de errores con placeholder
 */

// Placeholder image path
const PLACEHOLDER_IMAGE = 'assets/placeholder.png';

// Firebase Storage bucket
const FIREBASE_STORAGE_BUCKET = 'donantes-400ba.appspot.com';

/**
 * Construye una URL correcta para Firebase Storage
 * Aplica encodeURIComponent a cada parte del path
 * 
 * @param {string} path - Ruta del archivo en Storage (ej: "articles/userId/filename.jpg")
 * @returns {string} URL completa de Firebase Storage
 */
export function buildFirebaseStorageUrl(path) {
  if (!path) return PLACEHOLDER_IMAGE;
  
  // Si ya es una URL completa de Firebase Storage, la retornamos
  if (path.startsWith('https://firebasestorage.googleapis.com')) {
    return path;
  }
  
  // Si es una URL de cualquier otro tipo, la retornamos como está
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // Codificar cada parte del path
  const encodedPath = path
    .split('/')
    .map(part => encodeURIComponent(part))
    .join('%2F');
  
  return `https://firebasestorage.googleapis.com/v0/b/${FIREBASE_STORAGE_BUCKET}/o/${encodedPath}?alt=media`;
}

/**
 * Verifica si una URL es de Firebase Storage
 * 
 * @param {string} url - URL a verificar
 * @returns {boolean}
 */
export function isFirebaseStorageUrl(url) {
  if (!url) return false;
  return url.includes('firebasestorage.googleapis.com') || 
         url.includes('.firebasestorage.app');
}

/**
 * Obtiene el path del placeholder
 * 
 * @returns {string}
 */
export function getPlaceholderPath() {
  return PLACEHOLDER_IMAGE;
}

/**
 * Aplica el placeholder a una imagen cuando hay error de carga
 * 
 * @param {HTMLImageElement} imgElement - Elemento de imagen
 */
export function applyPlaceholder(imgElement) {
  if (imgElement && imgElement.src !== PLACEHOLDER_IMAGE) {
    imgElement.src = PLACEHOLDER_IMAGE;
    imgElement.alt = 'Imagen no disponible';
  }
}

/**
 * Configura un manejador de error para una imagen
 * 
 * @param {HTMLImageElement} imgElement - Elemento de imagen
 */
export function setupImageErrorHandler(imgElement) {
  if (!imgElement) return;
  
  imgElement.addEventListener('error', function() {
    applyPlaceholder(this);
  });
}

/**
 * Configura manejadores de error para todas las imágenes en un contenedor
 * 
 * @param {HTMLElement} container - Contenedor con imágenes
 * @param {string} [selector='img'] - Selector CSS para las imágenes
 */
export function setupImageErrorHandlers(container, selector = 'img') {
  if (!container) return;
  
  const images = container.querySelectorAll(selector);
  images.forEach(img => setupImageErrorHandler(img));
}

/**
 * Crea un elemento de imagen con manejo de errores integrado
 * 
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 * @param {string} [className] - Clases CSS opcionales
 * @returns {HTMLImageElement}
 */
export function createImageWithFallback(src, alt, className = '') {
  const img = document.createElement('img');
  img.src = src || PLACEHOLDER_IMAGE;
  img.alt = alt || 'Imagen';
  if (className) img.className = className;
  
  img.addEventListener('error', function() {
    applyPlaceholder(this);
  });
  
  return img;
}

/**
 * Genera HTML para una imagen con manejo de error inline (para templates)
 * Note: Se usa onerror inline para templates, pero el script externo 
 * también puede manejar errores via event delegation
 * 
 * @param {string} src - URL de la imagen
 * @param {string} alt - Texto alternativo
 * @param {string} [className] - Clases CSS opcionales
 * @param {string} [style] - Estilos inline opcionales
 * @returns {string} HTML de la imagen
 */
export function getImageHtmlWithFallback(src, alt, className = '', style = '') {
  const safeSrc = src || PLACEHOLDER_IMAGE;
  const safeAlt = (alt || 'Imagen').replace(/"/g, '&quot;');
  
  return `<img src="${safeSrc}" alt="${safeAlt}" class="${className}" style="${style}" data-has-fallback="true">`;
}

export default {
  buildFirebaseStorageUrl,
  isFirebaseStorageUrl,
  getPlaceholderPath,
  applyPlaceholder,
  setupImageErrorHandler,
  setupImageErrorHandlers,
  createImageWithFallback,
  getImageHtmlWithFallback,
  PLACEHOLDER_IMAGE
};
