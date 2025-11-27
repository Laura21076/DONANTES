/**
 * donationcenter.js
 * 
 * MEJORAS IMPLEMENTADAS EN LA SUBIDA DE IMÁGENES:
 * 1. Log claro "[UPLOAD_OK]" tras cada subida exitosa de imagen
 * 2. Verificación de existencia del archivo después de subir (getMetadata)
 * 3. Si hay error en la subida, NO se intenta guardar el artículo en DB
 * 4. Si falla guardar el artículo, se elimina la imagen huérfana
 * 5. Mensajes de error claros y específicos para cada tipo de fallo
 */

import { getCurrentLockerCode } from './locker.js';
import { createArticle, getArticles, updateArticle, deleteArticle } from './articles.js';
import { getCurrentUser, getIdToken } from './auth.js';
import { requestArticle as requestArticleService } from './requests.js';
import { storage } from './firebase.js';
// MEJORA: Agregamos deleteObject y getMetadata para verificación y limpieza de imágenes huérfanas
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let currentArticleId = null;
let articlesCache = [];
let lastLoadTime = 0;
const CACHE_DURATION = 30000; // 30 segundos

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ================== CARGAR ARTÍCULOS AL INICIAR ==================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const { getCurrentUser } = await import('./auth.js');
    let user = await getCurrentUser();
    if (!user) {
      window.location.replace('login.html');
      return;
    }
    const [profileResult, articlesResult] = await Promise.allSettled([
      loadUserProfile(),
      loadArticles(true)
    ]);
    if (profileResult.status === 'rejected') {
      showMessage('Error cargando perfil', 'warning');
    }
    if (articlesResult.status === 'rejected') {
      showMessage('Error al cargar artículos', 'warning');
    }
    setupFormHandlers();
  } catch (error) {
    showMessage('Error de inicialización: ' + error.message, 'danger');
  }
});

// ================== CARGAR PERFIL DE USUARIO ==================
async function loadUserProfile() {
  try {
    const { getCurrentUser } = await import('./auth.js');
    let user = await getCurrentUser();
    if (!user) return;
    const token = await getIdToken();
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/users/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const profile = await response.json();
      updateNavbarProfile(profile);
    }
  } catch (error) {
    console.warn('Error al cargar perfil:', error);
  }
}

// ================== ACTUALIZAR NAVBAR ==================
function updateNavbarProfile(profile) {
  const profileIcon = document.getElementById('profileIcon');
  if (!profileIcon) return;
  profileIcon.outerHTML = `
    <div class="position-relative d-inline-block">
      <img id="profileIcon" 
           src="${profile.photoURL || ''}" 
           class="profile-photo rounded-circle border border-2" 
           width="40" 
           height="40" 
           alt="Foto de perfil"
           style="object-fit: cover; cursor: pointer; border-color: #6f42c1 !important;">
    </div>
  `;
}
window.updateNavbarProfile = updateNavbarProfile;

// ================== CARGAR Y MOSTRAR ARTÍCULOS ==================
async function loadArticles(forceReload = false) {
  if (
    !forceReload &&
    articlesCache.length > 0 &&
    Date.now() - lastLoadTime < CACHE_DURATION
  ) {
    displayArticles(articlesCache);
    return;
  }
  try {
    const articles = await getArticles();
    if (!Array.isArray(articles)) {
      showMessage('Respuesta inesperada al cargar artículos', 'danger');
      return;
    }
    articlesCache = articles;
    lastLoadTime = Date.now();
    displayArticles(articles);
    if (articles && articles.length > 0) {
      preloadImages(articles);
    }
  } catch (error) {
    showMessage('Error al cargar artículos: ' + (error?.message || error), 'danger');
    console.error(error);
  }
}

function preloadImages(articles) {
  const urls = articles.map(a => a.imageUrl).filter(Boolean).slice(0, 6);
  urls.forEach(url => {
    const img = new Image();
    img.src = url;
  });
}

async function displayArticles(articles) {
  const grid = document.getElementById('articlesGrid');
  const emptyState = document.getElementById('emptyState');
  let currentUser;
  try {
    const { getCurrentUser } = await import('./auth.js');
    currentUser = await getCurrentUser();
  } catch {
    currentUser = null;
  }

  if (!articles || articles.length === 0) {
    if (grid) grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }

  const visibleArticles = articles.filter(article =>
    article.status === 'disponible' || article.status === 'reservado'
  );

  if (visibleArticles.length === 0) {
    if (grid) grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (grid) grid.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';

  grid.innerHTML = visibleArticles.map(article => {
    const isOwner = currentUser && currentUser.uid === article.uid;
    const estado = (article.status === 'expirado')
      ? `<span class="badge status-badge status-expired position-absolute top-0 end-0 mt-2 me-2 px-3 py-2">Expirado</span>`
      : (article.status === 'reservado')
      ? `<span class="badge status-badge status-reserved position-absolute top-0 end-0 mt-2 me-2 px-3 py-2">Reservado</span>`
      : `<span class="badge status-badge bg-purple-primary position-absolute top-0 end-0 mt-2 me-2 px-3 py-2">Disponible</span>`;

    const timer = article.expiresAt
      ? `<span class="article-timer position-absolute top-0 start-0 mt-2 ms-2">
            <i class="fa-regular fa-clock me-1"></i> ${getTimeRemaining(article.expiresAt)}
          </span>` : "";

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card donation-card position-relative shadow-lg border-0 h-100" style="border-radius: 20px; overflow: hidden;">
          <div class="position-relative article-image-container">
            ${article.imageUrl
              ? `<img src="${article.imageUrl}" class="card-img-top article-image" alt="${escapeHtml(article.title)}" style="height: 200px; object-fit: cover; border-radius: 20px 20px 0 0;" data-article-id="${article.id}">`
              : `<div class="no-image-placeholder d-flex flex-column align-items-center justify-content-center py-5" style="background: #e5d4f2; height:200px;">
                  <i class="fas fa-image fa-3x text-purple-light mb-2"></i>
                  <span style="color:#8C78BF;">Sin imagen</span>
                 </div>`
            }
            ${estado}
            ${timer}
          </div>
          <div class="card-body d-flex flex-column px-4 pb-4" style="background: linear-gradient(135deg, #F6F1F9 0%, #E8DFF5 100%); border-radius: 0 0 20px 20px;">
            <h5 class="card-title text-purple-primary mb-2 fw-bold">${escapeHtml(article.title)}</h5>
            <p class="card-text mb-2" style="color:#5A4A6B;">${escapeHtml(article.description)}</p>
            <div class="mb-2">
              <span class="badge bg-purple-light me-2 px-3 py-1">${escapeHtml(article.category || "General")}</span>
              <span class="badge bg-purple-primary px-3 py-1">${escapeHtml(article.condition || "Bueno")}</span>
            </div>
            <small class="d-block text-muted mb-3"><i class="fas fa-map-marker-alt me-1"></i> ${escapeHtml(article.location || "")}</small>
            <div class="mt-auto d-flex gap-2">
              ${
                isOwner
                ? `
                  <button class="btn btn-outline-purple flex-fill shadow-sm" data-action="edit" data-article-id="${article.id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-outline-danger flex-fill shadow-sm" data-action="delete" data-article-id="${article.id}">
                    <i class="fas fa-trash"></i>
                  </button>
                `
                : `<button class="btn btn-purple flex-fill shadow-sm" data-action="request" data-article-id="${article.id}" data-article-title="${escapeHtml(article.title)}">
                  <button class="btn btn-outline-purple flex-fill shadow-sm btn-edit-article" data-article-id="${article.id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-outline-danger flex-fill shadow-sm btn-delete-article" data-article-id="${article.id}">
                    <i class="fas fa-trash"></i>
                  </button>
                `
                : `<button class="btn btn-purple flex-fill shadow-sm btn-request-article" data-article-id="${article.id}" data-article-title="${escapeHtml(article.title)}">
                   <i class="fas fa-heart me-1"></i> Me interesa
                   </button>`
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
  
  // Attach event listeners using event delegation
  attachArticleEventListeners();
} // <- ESTA LLAVE CIERRA BIEN LA FUNCIÓN displayArticles

// Event delegation for article buttons
function attachArticleEventListeners() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;
  
  // Remove existing listeners to avoid duplicates
  grid.removeEventListener('click', handleArticleClick);
  grid.addEventListener('click', handleArticleClick);
}

function handleArticleClick(event) {
  const target = event.target.closest('button');
  if (!target) return;
  
  const articleId = target.dataset.articleId;
  const articleTitle = target.dataset.articleTitle;
  
  if (target.classList.contains('btn-edit-article')) {
    event.preventDefault();
    editArticle(articleId);
  } else if (target.classList.contains('btn-delete-article')) {
    event.preventDefault();
    confirmDelete(articleId);
  } else if (target.classList.contains('btn-request-article')) {
    event.preventDefault();
    // Add visual feedback
    target.classList.add('btn-loading');
    target.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Procesando...';
    showRequestModal(articleId, articleTitle);
    // Reset button after a short delay
    setTimeout(() => {
      target.classList.remove('btn-loading');
      target.innerHTML = '<i class="fas fa-heart me-1"></i> Me interesa';
    }, 500);
  }
}

// Add error handler for article images (CORS fallback)
// More targeted approach - only on articles container
function setupImageErrorHandlers() {
  const grid = document.getElementById('articlesGrid');
  if (grid) {
    grid.addEventListener('error', function(event) {
      if (event.target.tagName === 'IMG' && event.target.classList.contains('article-image')) {
        handleImageError(event.target);
      }
    }, true);
  }
}

function handleImageError(img) {
  const container = img.closest('.article-image-container');
  if (container) {
    container.innerHTML = `
      <div class="no-image-placeholder d-flex flex-column align-items-center justify-content-center py-5" style="background: #e5d4f2; height:200px;">
        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
        <span style="color:#8C78BF;">Error al cargar imagen</span>
        <small class="text-muted mt-1">Verifica tu conexión o configuración CORS</small>
      </div>
    `;
  }
}

// Initialize image error handlers on page load
document.addEventListener('DOMContentLoaded', setupImageErrorHandlers);

function getTimeRemaining(expiresAt) {
  if (!expiresAt) return 'Sin límite';
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diff = expiry - now;
  if (diff <= 0) return 'Expirado';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function showMessage(text, type) {
  const messageDiv = document.getElementById('feedbackMessage');
  if (messageDiv) {
    messageDiv.innerHTML = `
      <div class="alert alert-${type} alert-dismissible fade show" role="alert">
        ${text}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    setTimeout(() => {
      messageDiv.innerHTML = '';
    }, 5000);
  }
}

function setupFormHandlers() {
  const form = document.getElementById('uploadForm');
  const fileInput = document.getElementById('articleImageFile');
  const previewImg = document.getElementById('articleImagePreviewImg');
  const previewWrap = document.getElementById('articleImagePreview');

  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      if (previewWrap) previewWrap.style.display = 'none';
      if (previewImg) previewImg.src = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      if (previewImg) previewImg.src = e.target.result;
      if (previewWrap) previewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    await saveArticle();
    form.classList.remove('was-validated');
  });
}

/**
 * MEJORA: Función para eliminar imagen huérfana si falla guardar el artículo
 * Esto evita imágenes sin artículo asociado en Storage
 */
async function eliminarImagenHuerfana(fileRef) {
  try {
    await deleteObject(fileRef);
    console.log('[CLEANUP_OK] Imagen huérfana eliminada:', fileRef.fullPath);
  } catch (cleanupError) {
    // Si no se puede eliminar, solo logueamos el error (no crítico)
    console.warn('[CLEANUP_WARN] No se pudo eliminar imagen huérfana:', cleanupError.message);
  }
}

/**
 * MEJORA: Función saveArticle con manejo robusto de subida de imágenes
 * - Logs claros con "[UPLOAD_OK]" tras subida exitosa
 * - Verificación de existencia del archivo
 * - Error específico si falla la subida (no intenta guardar artículo con link roto)
 * - Limpieza de imágenes huérfanas si falla guardar el artículo
 */
async function saveArticle() {
  const fileInput = document.getElementById('articleImageFile');
  const urlInput = document.getElementById('articleImageUrl');
  const user = await getCurrentUser();
  const baseData = {
    title: document.getElementById('articleName').value.trim(),
    description: document.getElementById('articleDescription').value.trim(),
    category: document.getElementById('articleCategory').value,
    condition: document.getElementById('articleCondition').value,
    location: document.getElementById('articleLocation').value.trim() || null
  };
  
  // Variable para trackear la referencia de la imagen subida (para limpieza si falla)
  let uploadedFileRef = null;
  // Flag para indicar si hubo error de subida (evita guardar artículo con link roto)
  let uploadFailed = false;
  // Flag para indicar si hubo error al guardar en DB
  let dbSaveFailed = false;
  
  try {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

    let imageUrl = urlInput.value.trim() || null;
    const file = fileInput.files?.[0] || null;

    // MEJORA: Subida de imagen con verificación y logs claros
    if (file && user?.uid) {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `articles/${user.uid}/${Date.now()}_${safeName}`;
      const fileRef = ref(storage, path);
      
      console.log('[UPLOAD_START] Iniciando subida de imagen:', path);
      
      try {
        // Subir archivo a Firebase Storage
        await uploadBytes(fileRef, file);
        console.log('[UPLOAD_OK] Imagen subida exitosamente:', path);
        
        // MEJORA: Verificar que el archivo existe después de subir
        try {
          const metadata = await getMetadata(fileRef);
          console.log('[UPLOAD_VERIFY] Archivo verificado, tamaño:', metadata.size, 'bytes');
        } catch (verifyError) {
          // Si no podemos verificar la existencia, lanzar error
          console.error('[UPLOAD_VERIFY_FAIL] No se pudo verificar la existencia del archivo');
          throw new Error('Error verificando la imagen subida. Intente nuevamente.');
        }
        
        // Obtener la URL de descarga
        imageUrl = await getDownloadURL(fileRef);
        console.log('[UPLOAD_URL_OK] URL de descarga obtenida correctamente');
        
        // Guardar referencia para posible limpieza posterior
        uploadedFileRef = fileRef;
        
      } catch (uploadError) {
        // MEJORA: Error específico en subida de imagen - NO intentar guardar artículo
        console.error('[UPLOAD_ERROR] Error al subir imagen:', uploadError.message);
        showMessage('Error al subir la imagen: ' + (uploadError?.message || 'Error desconocido'), 'danger');
        // Marcar que la subida falló para no continuar con el guardado
        uploadFailed = true;
      }
    }

    // MEJORA: Solo intentar guardar si la subida de imagen fue exitosa (o no hubo imagen)
    if (!uploadFailed) {
      const articleData = { ...baseData, imageUrl };

      // MEJORA: Intentar guardar artículo con manejo de error y limpieza de imagen huérfana
      try {
        if (currentArticleId) {
          await updateArticle(currentArticleId, articleData);
          showMessage('Artículo actualizado exitosamente', 'success');
          console.log('[ARTICLE_UPDATE_OK] Artículo actualizado:', currentArticleId);
        } else {
          await createArticle(articleData);
          showMessage('Artículo publicado exitosamente', 'success');
          console.log('[ARTICLE_CREATE_OK] Artículo creado exitosamente');
        }
      } catch (dbError) {
        // MEJORA: Si falla guardar en Firestore, eliminar imagen huérfana
        console.error('[ARTICLE_SAVE_ERROR] Error al guardar artículo en DB:', dbError.message);
        dbSaveFailed = true;
        
        if (uploadedFileRef) {
          console.log('[CLEANUP_START] Eliminando imagen huérfana debido a fallo en DB...');
          await eliminarImagenHuerfana(uploadedFileRef);
        }
        
        // Mostrar error claro al usuario - NO devolver datos inconsistentes
        showMessage('Error al guardar el artículo: ' + (dbError?.message || 'Error de base de datos'), 'danger');
      }

      // Solo cerrar modal y recargar si todo fue exitoso
      if (!dbSaveFailed) {
        const modalElement = document.getElementById('uploadModal');
        const modal = window.bootstrap?.Modal.getInstance
          ? window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement)
          : null;
        if (modal && modalElement.contains(document.activeElement)) {
          document.activeElement.blur();
        }
        if (modal) modal.hide();

        await loadArticles(true);
        currentArticleId = null; // Reset after save
      }
    }
  } catch (error) {
    showMessage('Error: ' + (error?.message || error), 'danger');
    console.error('[GENERAL_ERROR]', error);
  } finally {
    // MEJORA: La limpieza de UI siempre se ejecuta, independientemente del resultado
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = currentArticleId ? 'Actualizar artículo' : 'Publicar artículo';
    }
  }
}

function editArticle(articleId) {
  currentArticleId = articleId;
  const article = articlesCache.find(a => a.id === articleId);
  if (!article) { showMessage('Error: Artículo no encontrado', 'danger'); return; }
  const fields = {
    'articleName': article.title || '',
    'articleDescription': article.description || '',
    'articleCategory': article.category || 'general',
    'articleCondition': article.condition || 'bueno',
    'articleLocation': article.location || ''
  };
  for (const [fieldId, value] of Object.entries(fields)) {
    const field = document.getElementById(fieldId);
    if (field) field.value = value;
  }
  const urlInput = document.getElementById('articleImageUrl');
  const fileInput = document.getElementById('articleImageFile');
  const previewWrap = document.getElementById('articleImagePreview');
  const previewImg = document.getElementById('articleImagePreviewImg');
  if (fileInput) fileInput.value = '';
  if (urlInput) urlInput.value = article.imageUrl || '';
  if (article.imageUrl && previewWrap && previewImg) {
    previewImg.src = article.imageUrl;
    previewWrap.style.display = 'block';
  } else if (previewWrap && previewImg) {
    previewImg.src = '';
    previewWrap.style.display = 'none';
  }
  const modalElement = document.getElementById('uploadModal');
  const modal = window.bootstrap?.Modal.getInstance
    ? window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement)
    : null;
  // ⬇️ Mejora de accesibilidad: enfoca el campo principal al abrir el modal
  if (modal) {
    modal.show();
    setTimeout(() => {
      const firstInput = modalElement.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }, 400);
  }
}
// Expose to window for backward compatibility
window.editArticle = editArticle;

async function confirmDelete(articleId) {
  const article = articlesCache.find(a => a.id === articleId);
  if (!article) { showMessage('Error: Artículo no encontrado', 'danger'); return; }
  if (!confirm(`¿Estás seguro de eliminar el artículo "${article.title}"?`)) return;
  try {
    await deleteArticle(articleId);
    showMessage('Artículo eliminado exitosamente', 'success');
    await loadArticles(true);
  } catch (error) {
    showMessage('Error al eliminar: ' + (error?.message || error), 'danger');
    console.error(error);
  }
}
// Expose to window for backward compatibility
window.confirmDelete = confirmDelete;

function showRequestModal(articleId, articleTitle) {
  const message = prompt(`¿Quieres solicitar "${articleTitle}"?\nPuedes agregar un mensaje opcional para el donador:`);
  if (message === null) return;
  requestArticleHandler(articleId, message, articleTitle);
}
// Expose to window for backward compatibility
window.showRequestModal = showRequestModal;

async function requestArticleHandler(articleId, message, articleTitle) {
  try {
    await requestArticleService(articleId, message);
    showMessage('¡Solicitud enviada!', 'success');
    await loadArticles();
  } catch (error) {
    showMessage('Error al solicitar: ' + (error?.message || error), 'danger');
    console.error(error);
  }
}

// ================== EVENT DELEGATION PARA BOTONES DE ARTÍCULOS ==================
// Usar delegación de eventos para evitar inline event handlers (CSP compliance)
document.addEventListener('DOMContentLoaded', () => {
  const articlesGrid = document.getElementById('articlesGrid');
  if (articlesGrid) {
    articlesGrid.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;

      const action = button.dataset.action;
      const articleId = button.dataset.articleId;
      const articleTitle = button.dataset.articleTitle;

      switch (action) {
        case 'edit':
          window.editArticle(articleId);
          break;
        case 'delete':
          window.confirmDelete(articleId);
          break;
        case 'request':
          window.showRequestModal(articleId, articleTitle);
          break;
      }
    });
  }
});
