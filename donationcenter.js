/**
 * donationcenter.js
 * Mejoras en la subida de imágenes y robustez general.
 * (ver comentarios previos)
 */

import { getCurrentLockerCode } from './locker.js';
import { createArticle, getArticles, updateArticle, deleteArticle } from './articles.js';
import { getCurrentUser, getIdToken } from './auth.js';
import { requestArticle as requestArticleService } from './requests.js';
import { storage } from './firebase.js';
import { ref, uploadBytes, getDownloadURL, deleteObject, getMetadata } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { getPlaceholderPath, buildFirebaseStorageUrl } from './image-utils.js';

const PLACEHOLDER_IMAGE = getPlaceholderPath();
const UPLOAD_TIMEOUT_MS = 30000;
const VERIFY_TIMEOUT_MS = 10000;
const BACKEND_TIMEOUT_MS = 15000;
const TOAST_COLORS = {
  success: '#A992D8',
  danger: '#6E49A3',
  warning: '#8C78BF',
  default: '#8C78BF'
};

let currentArticleId = null;
let articlesCache = [];
let lastLoadTime = 0;
const CACHE_DURATION = 30000;

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

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
    if (profileResult.status === 'rejected') showMessage('Error cargando perfil', 'warning');
    if (articlesResult.status === 'rejected') showMessage('Error al cargar artículos', 'warning');
    setupFormHandlers();
    setupImageErrorHandlers();
  } catch (error) {
    showMessage('Error de inicialización: ' + error.message, 'danger');
  }
});

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
    if (articles && articles.length > 0) preloadImages(articles);
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

    const imageUrl = article.imageUrl ? buildFirebaseStorageUrl(article.imageUrl) : null;

    return `
      <div class="col-md-6 col-lg-4">
        <div class="card donation-card position-relative shadow-lg border-0 h-100" style="border-radius: 20px; overflow: hidden;">
          <div class="position-relative article-image-container">
            ${imageUrl
              ? `<img src="${imageUrl}" class="card-img-top article-image" alt="${escapeHtml(article.title)}" style="height: 200px; object-fit: cover; border-radius: 20px 20px 0 0;" data-article-id="${article.id}" data-has-fallback="true">`
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
              ${isOwner
                ? `
                  <button class="btn btn-outline-purple flex-fill shadow-sm btn-edit-article" data-article-id="${article.id}">
                    <i class="fas fa-edit"></i>
                  </button>
                  <button class="btn btn-outline-danger flex-fill shadow-sm btn-delete-article" data-article-id="${article.id}">
                    <i class="fas fa-trash"></i>
                  </button>
                `
                : `
                  <button class="btn btn-purple flex-fill shadow-sm btn-request-article" data-article-id="${article.id}" data-article-title="${escapeHtml(article.title)}">
                    <i class="fas fa-heart me-1"></i> Me interesa
                  </button>
                `
              }
            </div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach article events (SÓLO UNA DEFINICIÓN, SIN DUPLICADOS)
  attachArticleEventListeners();
}

// ------ SÓLO UNA DEFINICIÓN ---------
function attachArticleEventListeners() {
  const grid = document.getElementById('articlesGrid');
  if (!grid) return;
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
    target.classList.add('btn-loading');
    target.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Procesando...';
    showRequestModal(articleId, articleTitle);
    setTimeout(() => {
      target.classList.remove('btn-loading');
      target.innerHTML = '<i class="fas fa-heart me-1"></i> Me interesa';
    }, 500);
  }
}
// ------ FIN SOLO UNA DEFINICIÓN ---------

// ... El resto del archivo continúa igual, como lo tienes ...

// (setupImageErrorHandlers, saveArticle, editArticle, confirmDelete, etc.)
// (No es necesario pegarlos todos aquí si no se han modificado más abajo y no afectan a la duplicidad)
