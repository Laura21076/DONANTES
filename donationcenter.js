// donation-center.js

import { getCurrentLockerCode } from './locker.js';
import { createArticle, getArticles, updateArticle, deleteArticle } from './articles.js';
import { getCurrentUser, getIdToken } from './auth.js';
import { requestArticle as requestArticleService } from './requests.js';
import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

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
    const timeRemaining = getTimeRemaining(article.expiresAt);
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card article-card h-100">
          <div class="article-image-container">
            ${article.imageUrl ? 
              `<img src="${article.imageUrl}" class="card-img-top" alt="${escapeHtml(article.title)}">` : 
              `<div class="no-image-placeholder">
                <i class="fas fa-image fa-3x"></i>
                <span>Sin imagen</span>
              </div>`
            }
          </div>
          <div class="card-body d-flex flex-column">
            <h6 class="card-title">${escapeHtml(article.title)}</h6>
            <p class="card-text">${escapeHtml(article.description)}</p>
            <div class="article-meta">
              <span class="badge bg-secondary me-2">${article.category || 'General'}</span>
              <span class="badge bg-info">${article.condition || 'Bueno'}</span>
            </div>
            <small class="text-muted mt-2">${article.location ? `<i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(article.location)}` : ''}</small>
            <div class="mt-auto pt-3">
              ${isOwner ? `
                <div class="btn-group w-100" role="group">
                  <button class="btn btn-outline-primary btn-sm" onclick="editArticle('${article.id}')">
                    <i class="fas fa-edit"></i> Editar
                  </button>
                  <button class="btn btn-outline-danger btn-sm" onclick="confirmDelete('${article.id}')">
                    <i class="fas fa-trash"></i> Eliminar
                  </button>
                </div>
              ` : `
                ${article.status === 'disponible' ? 
                  `<button class="btn btn-purple w-100" onclick="showRequestModal('${article.id}','${escapeHtml(article.title)}')">
                    <i class="fas fa-heart me-2"></i>Me interesa
                  </button>` :
                  `<button class="btn btn-secondary w-100" disabled>No Disponible</button>`
                }
              `}
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

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

async function saveArticle() {
  const fileInput = document.getElementById('articleImageFile');
  const urlInput = document.getElementById('articleImageUrl');
  const { getCurrentUser } = await import('./auth.js');
  let user = await getCurrentUser();
  const baseData = {
    title: document.getElementById('articleName').value.trim(),
    description: document.getElementById('articleDescription').value.trim(),
    category: document.getElementById('articleCategory').value,
    condition: document.getElementById('articleCondition').value,
    location: document.getElementById('articleLocation').value.trim() || null
  };
  try {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';

    let imageUrl = urlInput.value.trim() || null;
    const file = fileInput.files?.[0] || null;

    if (file && currentUser?.uid) {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `articles/${currentUser.uid}/${Date.now()}_${safeName}`;
      const fileRef = ref(storage, path);
      await uploadBytes(fileRef, file);
      imageUrl = await getDownloadURL(fileRef);
    }

    const articleData = { ...baseData, imageUrl };

    if (currentArticleId) {
      await updateArticle(currentArticleId, articleData);
      showMessage('Artículo actualizado exitosamente', 'success');
    } else {
      await createArticle(articleData);
      showMessage('Artículo publicado exitosamente', 'success');
    }

    const modalElement = document.getElementById('uploadModal');
    const modal = window.bootstrap?.Modal.getInstance
      ? window.bootstrap.Modal.getInstance(modalElement) || new window.bootstrap.Modal(modalElement)
      : null;
    // ⬇️ Mejora de accesibilidad: Quita foco antes de esconder el modal
    if (modal && modalElement.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    if (modal) modal.hide();

    await loadArticles(true);
    currentArticleId = null; // Reset after save
  } catch (error) {
    showMessage('Error: ' + (error?.message || error), 'danger');
    console.error(error);
  } finally {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = currentArticleId ? 'Actualizar artículo' : 'Publicar artículo';
    }
  }
}

window.editArticle = function(articleId) {
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
};

window.confirmDelete = async function(articleId) {
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
};

window.showRequestModal = function(articleId, articleTitle) {
  const message = prompt(`¿Quieres solicitar "${articleTitle}"?\nPuedes agregar un mensaje opcional para el donador:`);
  if (message === null) return;
  requestArticleHandler(articleId, message, articleTitle);
};

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



