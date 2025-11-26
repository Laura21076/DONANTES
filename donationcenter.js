import { getCurrentLockerCode } from 'locker.js'; 
import { createArticle, getArticles, updateArticle, deleteArticle } from 'articles.js';
import { getCurrentUser, getIdToken } from 'auth.js';
import { requestArticle as requestArticleService } from 'requests.js';
import { storage } from 'firebase.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

let currentArticleId = null;
let articlesCache = [];

// ================== UTILIDADES DE CARGA ==================
function showLoadingState() {
  const articlesContainer = document.getElementById('articlesContainer');
  if (articlesContainer) {
    articlesContainer.innerHTML = `
      <div class="col-12 text-center py-5">
        <div class="spinner-border text-purple" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando artículos...</span>
        </div>
        <p class="mt-3 text-purple fw-bold">Cargando artículos...</p>
      </div>
    `;
  }
}

function hideLoadingState() {
  // El contenido se reemplazará automáticamente cuando se muestren los artículos
}

// ================== UTILIDADES DE SEGURIDAD ==================
// Función para escapar HTML y prevenir XSS
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
    // Esperar a que Firebase determine el usuario autenticado
    const { getUser } = await import('auth.js');
    let user = await getUser();
    if (!user) {
      console.warn('⚠️ Usuario no autenticado en donation center, redirigiendo...');
      window.location.replace('login.html');
      return;
    }
    console.log('✅ Usuario autenticado, inicializando donation center...');
    // Cargar datos en paralelo para mayor velocidad
    const [profileResult, articlesResult] = await Promise.allSettled([
      loadUserProfile(),
      loadArticles()
    ]);
    // Mostrar errores de perfil pero continuar con artículos
    if (profileResult.status === 'rejected') {
      console.warn('⚠️ Error cargando perfil:', profileResult.reason);
    }
    
    if (articlesResult.status === 'rejected') {
      console.error('❌ Error cargando artículos:', articlesResult.reason);
      showMessage('Error al cargar artículos', 'warning');
    }
    
    setupFormHandlers();
  } catch (error) {
    console.error('❌ Error durante inicialización:', error);
    showMessage('Error de inicialización', 'warning');
  }
});

// ================== CARGAR PERFIL DE USUARIO ==================
async function loadUserProfile() {
  try {
    const { getUser } = await import('auth.js');
    const user = await getUser();
    if (!user) return;

    // Hacer petición al backend para obtener perfil completo
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
    console.error('Error al cargar perfil:', error);
  }
}

// ================== ACTUALIZAR NAVBAR CON FOTO DE PERFIL ==================
function updateNavbarProfile(profile) {
  const profileIcon = document.getElementById('profileIcon');
  
  if (profileIcon) {
    // Crear icono 2FA si está activado
    const twoFactorIcon = profile?.is2FAEnabled ? `
      <span class="position-absolute top-0 start-100 translate-middle badge rounded-pill" 
            style="background: linear-gradient(135deg, #6f42c1, #9561e2); border: 2px solid white; z-index: 10; 
                   box-shadow: 0 2px 8px rgba(111, 66, 193, 0.3); padding: 4px 6px;"
            title="Autenticación de dos factores activada">
        <i class="fas fa-shield-alt" style="color: white; font-size: 10px;"></i>
      </span>
    ` : '';

    if (profile?.photoURL) {
      // Reemplazar icono con imagen de usuario
      profileIcon.outerHTML = `
        <div class="position-relative d-inline-block">
          <img id="profileIcon" 
               src="${profile.photoURL}" 
               class="profile-photo rounded-circle border border-2" 
               width="40" 
               height="40" 
               alt="Foto de perfil"
               style="object-fit: cover; cursor: pointer; border-color: ${profile?.is2FAEnabled ? '#6f42c1' : '#dee2e6'} !important;"
               onerror="this.style.display='none'; this.parentElement.querySelector('.fallback-icon').style.display='inline-block';">
          <i class="fas fa-user-circle fallback-icon" 
             style="font-size: 40px; cursor: pointer; display: none; color: ${profile?.is2FAEnabled ? '#6f42c1' : '#6c757d'};"></i>
          ${twoFactorIcon}
        </div>
      `;
    } else {
      // Usuario sin foto de perfil
      profileIcon.outerHTML = `
        <div class="position-relative d-inline-block">
          <i id="profileIcon" 
             class="fas fa-user-circle" 
             style="font-size: 40px; cursor: pointer; color: ${profile?.is2FAEnabled ? '#6f42c1' : '#6c757d'};"></i>
          ${twoFactorIcon}
        </div>
      `;
    }
  }
}

// Hacer la función global para que esté disponible desde otros archivos
window.updateNavbarProfile = updateNavbarProfile;

// ================== CARGAR Y MOSTRAR ARTÍCULOS ==================
// Cache para evitar recargas innecesarias
let lastLoadTime = 0;
const CACHE_DURATION = 30000; // 30 segundos

async function loadArticles(forceReload = false) {
  console.log('🚀 Loading articles...', { forceReload, cacheAge: Date.now() - lastLoadTime });
  
  // Usar cache si es reciente (excepto si se fuerza recarga)
  if (!forceReload && articlesCache.length > 0 && (Date.now() - lastLoadTime) < CACHE_DURATION) {
    console.log('⚡ Using cached articles (', articlesCache.length, 'articles)');
    displayArticles(articlesCache);
    return;
  }
  
  try {
    const startTime = Date.now();
    const articles = await getArticles();
    const loadTime = Date.now() - startTime;
    
    console.log(`✨ Articles loaded in ${loadTime}ms:`, articles?.length || 0, 'articles');
    
    articlesCache = articles;
    lastLoadTime = Date.now();
    
    displayArticles(articles);
    
    // Pre-cargar imágenes en background
    if (articles && articles.length > 0) {
      preloadImages(articles);
    }
    
  } catch (error) {
    console.error('❌ Error al cargar artículos:', error);
    showMessage('Error al cargar artículos: ' + error.message, 'danger');
  }
}

// Indicador de carga rápido
function showLoadingIndicator() {
  const grid = document.getElementById('articlesGrid');
  if (grid && articlesCache.length === 0) {
    grid.innerHTML = `
      <div class="col-12 text-center p-4">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
          <span class="visually-hidden">Cargando...</span>
        </div>
        <p class="mt-3 text-muted">Cargando artículos...</p>
      </div>
    `;
  }
}

function hideLoadingIndicator() {
  // Se limpia automáticamente en displayArticles
}

// Pre-carga de imágenes en background
function preloadImages(articles) {
  const imageUrls = articles
    .filter(article => article.imageUrl)
    .map(article => article.imageUrl)
    .slice(0, 6); // Limitar a 6 imágenes para no sobrecargar
  
  console.log(`🖼️ Pre-loading ${imageUrls.length} images in background...`);
  
  imageUrls.forEach(url => {
    const img = new Image();
    img.onload = () => console.log('✅ Pre-loaded:', url.substring(url.lastIndexOf('/') + 1));
    img.onerror = () => console.warn('⚠️ Failed to pre-load:', url.substring(url.lastIndexOf('/') + 1));
    img.src = url;
  });
}

function displayArticles(articles) {
  const grid = document.getElementById('articlesGrid');
  const emptyState = document.getElementById('emptyState');
  let currentUser;
  try {
    const { getUser } = await import('auth.js');
    currentUser = await getUser();
  } catch (error) {
    console.warn('Error obteniendo usuario actual:', error);
    currentUser = null;
  }
  
  console.log('displayArticles called with:', {
    articlesCount: articles?.length || 0,
    currentUser: currentUser,
    gridElement: !!grid,
    emptyStateElement: !!emptyState
  });
  
  if (!articles || articles.length === 0) {
    if (grid) grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  // Filtrar artículos relevantes para la vista principal (disponibles y reservados)
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

  // Crear fragmento de documento para renderizado más rápido
  const fragment = document.createDocumentFragment();
  
  // Usar requestAnimationFrame para renderizado suave
  requestAnimationFrame(() => {
    const articlesHTML = visibleArticles.map(article => {
      const isOwner = currentUser && currentUser.uid === article.uid;
      const timeRemaining = getTimeRemaining(article.expiresAt);
      
      return `
        <div class="col-md-6 col-lg-4">
          <div class="card article-card h-100 ${article.status === 'no_disponible' ? 'article-expired' : article.status === 'reservado' ? 'article-reserved' : ''}">
            <div class="article-image-container">
              ${article.imageUrl ? 
                `<div class="image-wrapper">
                  <img src="${article.imageUrl}" 
                       class="card-img-top article-image" 
                       alt="${escapeHtml(article.title)}" 
                       loading="lazy"
                       decoding="async"
                       style="opacity: 0; transition: opacity 0.3s ease;"
                       onload="this.style.opacity=1; console.log('✅ Image loaded:', this.alt);"
                       onerror="console.warn('⚠️ Image failed:', this.alt); this.parentElement.innerHTML='<div class=\"no-image-placeholder\"><i class=\"fas fa-image fa-3x\"></i><span>Imagen no disponible</span></div>';">
                </div>` : 
                `<div class="no-image-placeholder">
                  <i class="fas fa-image fa-3x"></i>
                  <span>Sin imagen</span>
                </div>`
              }
              ${article.status === 'no_disponible' ? 
                `<div class="article-status-overlay">
                  <span class="status-badge status-expired">NO DISPONIBLE</span>
                </div>` : 
                article.status === 'reservado' ?
                `<div class="article-status-overlay">
                  <span class="status-badge status-reserved">RESERVADO</span>
                </div>` :
                `<div class="article-timer">
                  <i class="fas fa-clock me-1"></i>
                  <span class="timer-text">${timeRemaining}</span>
                </div>`
              }
            </div>
            <div class="card-body d-flex flex-column">
              <h6 class="card-title article-title">${escapeHtml(article.title)}</h6>
              <p class="card-text article-description">${escapeHtml(article.description)}</p>
              <div class="article-meta">
                <span class="badge bg-secondary me-2">${article.category || 'General'}</span>
                <span class="badge bg-info">${article.condition || 'Bueno'}</span>
              </div>
              ${article.location ? `<small class="text-muted mt-2"><i class="fas fa-map-marker-alt me-1"></i>${escapeHtml(article.location)}</small>` : ''}
              
              <div class="mt-auto pt-3">
                ${isOwner ? `
                  <div class="btn-group w-100" role="group">
                    <button class="btn btn-outline-primary btn-sm" data-action="edit" data-article-id="${article.id}">
                      <i class="fas fa-edit"></i> Editar
                    </button>
                    <button class="btn btn-outline-danger btn-sm" data-action="delete" data-article-id="${article.id}">
                      <i class="fas fa-trash"></i> Eliminar
                    </button>
                  </div>
                ` : `
                  ${article.status === 'disponible' ? 
                    `<button class="btn btn-purple w-100" data-action="request" data-article-id="${article.id}" data-article-title="${escapeHtml(article.title)}" data-article-uid="${article.uid}">
                      <i class="fas fa-heart me-2" style="color: #A992D8;"></i>Me interesa
                    </button>` :
                    article.status === 'reservado' ?
                    `<button class="btn btn-warning w-100" disabled>
                      <i class="fas fa-clock me-2"></i>Reservado
                    </button>` :
                    `<button class="btn btn-secondary w-100" disabled>
                      <i class="fas fa-times me-2"></i>No Disponible
                    </button>`
                  }
                `}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    grid.innerHTML = articlesHTML;
    
    // Inicializar temporizadores para artículos visibles
    initializeTimers(visibleArticles);
    
    console.log(`Rendered ${visibleArticles.length} articles in DOM`);
  });
}

// ================== FUNCIONES DE TIEMPO ==================
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

function initializeTimers(articles) {
  // Actualizar temporizadores cada minuto
  setInterval(() => {
    articles.forEach(article => {
      if (article.status === 'disponible' && article.expiresAt) {
        const timerElement = document.querySelector(`[data-article-id="${article.id}"] .timer-text`);
        if (timerElement) {
          const timeLeft = getTimeRemaining(article.expiresAt);
          timerElement.textContent = timeLeft;
          
          // Si expiró, recargar artículos
          if (timeLeft === 'Expirado') {
            loadArticles();
          }
        }
      }
    });
  }, 60000); // Cada minuto
}

// Nueva función para agregar event listeners
function addArticleEventListeners() {
  // Event listeners para botones de editar
  document.querySelectorAll('[data-edit-id]').forEach(btn => {
    btn.addEventListener('click', function() {
      const articleId = this.getAttribute('data-edit-id');
      if (window.editArticle) {
        window.editArticle(articleId);
      }
    });
  });
  
  // Event listeners para botones de eliminar
  document.querySelectorAll('[data-delete-id]').forEach(btn => {
    btn.addEventListener('click', function() {
      const articleId = this.getAttribute('data-delete-id');
      if (window.confirmDelete) {
        window.confirmDelete(articleId);
      }
    });
  });
  
  // Event listeners para botones de solicitar
  document.querySelectorAll('[data-request-id]').forEach(btn => {
    btn.addEventListener('click', function() {
      const articleId = this.getAttribute('data-request-id');
      const articleTitle = this.getAttribute('data-article-title');
      const articleUid = this.getAttribute('data-article-uid');
      if (window.requestArticle) {
        window.requestArticle(articleId, articleTitle, articleUid);
      }
    });
  });
}

function getStatusBadge(status) {
  const badges = {
    'disponible': '<span class="badge" style="background-color: #6E49A3; color: white; font-weight: 600;">Disponible</span>',
    'reservado': '<span class="badge" style="background-color: #A992D8; color: white; font-weight: 600;">Reservado</span>',
    'donado': '<span class="badge" style="background-color: #4A3066; color: white; font-weight: 600;">Donado</span>'
  };
  return badges[status] || badges['disponible'];
}

// ================== CONFIGURAR HANDLERS DE FORMULARIO ==================
function setupFormHandlers() {
  const form = document.getElementById('uploadForm');
  const modal = document.getElementById('uploadModal');
  const fileInput = document.getElementById('articleImageFile');
  const previewWrap = document.getElementById('articleImagePreview');
  const previewImg = document.getElementById('articleImagePreviewImg');
  
  // Al abrir el modal para crear nuevo
  modal.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;
    if (!button || !button.dataset.edit) {
      resetForm();
    }
  });
  
  // Vista previa de imagen seleccionada
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) {
      previewWrap.style.display = 'none';
      previewImg.src = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      previewImg.src = e.target.result;
      previewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  // Envío del formulario
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (!form.checkValidity()) {
      e.stopPropagation();
      form.classList.add('was-validated');
      return;
    }
    
    await saveArticle();
    form.classList.remove('was-validated');
  });
  
  // Agregar evento para limpiar form al abrir modal para crear
  const uploadModal = document.getElementById('uploadModal');
  if (uploadModal) {
    uploadModal.addEventListener('show.bs.modal', function(event) {
      const button = event.relatedTarget;
      // Solo resetear si no es edición
      if (!button || !button.dataset.edit) {
        resetForm();
      }
    });
  }
}

// ================== GUARDAR ARTÍCULO (CREAR O ACTUALIZAR) ==================
async function saveArticle() {
  const fileInput = document.getElementById('articleImageFile');
  const urlInput = document.getElementById('articleImageUrl');
  const { getUser } = await import('auth.js');
  const currentUser = await getUser();
  console.log('👤 Current user:', currentUser ? 'AUTHENTICATED' : 'NOT AUTHENTICATED', currentUser?.uid);

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

    // Subir imagen si se seleccionó archivo
    let imageUrl = urlInput.value.trim() || null;
    const file = fileInput.files?.[0] || null;

    if (file && currentUser?.uid) {
      try {
        console.log('📸 Subiendo imagen:', file.name, 'Size:', file.size);
        // Validar tamaño (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('La imagen debe ser menor a 5MB');
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const path = `articles/${currentUser.uid}/${Date.now()}_${safeName}`;
        console.log('📂 Ruta de subida:', path);
        
        const fileRef = ref(storage, path);
        console.log('📡 Iniciando subida a Firebase Storage...');
        await uploadBytes(fileRef, file);
        console.log('✅ Archivo subido, obteniendo URL...');
        imageUrl = await getDownloadURL(fileRef);
        console.log('🔗 URL obtenida:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Error al subir imagen:', uploadError);
        throw new Error(`Error al subir imagen: ${uploadError.message}`);
      }
    }

    const articleData = { ...baseData, imageUrl };

    if (currentArticleId) {
      await updateArticle(currentArticleId, articleData);
      console.log('📝 Article updated:', currentArticleId, articleData);
      showMessage('<i class="fas fa-check-circle me-2"></i>Artículo actualizado exitosamente', 'success');
    } else {
      const newArticle = await createArticle(articleData);
      console.log('🆕 Article created:', newArticle, articleData);
      showMessage('<i class="fas fa-check-circle me-2"></i>Artículo publicado exitosamente', 'success');
    }
    
    // Cerrar modal y recargar artículos
    const modalElement = document.getElementById('uploadModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    modal.hide();
    
    console.log('🔄 Reloading articles after save...');
    await loadArticles(true); // Forzar recarga después de guardar
  } catch (error) {
    console.error('Error al guardar artículo:', error);
    showMessage('Error: ' + error.message, 'danger');
  } finally {
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = false;
    submitBtn.textContent = currentArticleId ? 'Actualizar artículo' : 'Publicar artículo';
  }
}

// ================== VALIDAR PERMISOS ==================
function validateOwnership(articleId) {
  const article = articlesCache.find(a => a.id === articleId);
  const { getUser } = require('auth.js');
  const currentUser = await getUser();
  
  if (!article || !currentUser) {
    console.error('❌ Artículo o usuario no encontrado');
    return false;
  }
  
  const isOwner = currentUser && (currentUser.uid || currentUser.id) === article.uid;
  
  if (!isOwner) {
    console.error('❌ Usuario no autorizado para modificar este artículo');
    showMessage('No tienes permisos para realizar esta acción', 'danger');
    return false;
  }
  
  console.log('✅ Permisos validados para:', currentUser.uid, 'en artículo:', articleId);
  return true;
}

// ================== EDITAR ARTÍCULO (CON VALIDACIÓN) ==================
window.editArticle = function(articleId) {
  // Validar permisos antes de proceder
  if (!validateOwnership(articleId)) {
    return;
  }

  const article = articlesCache.find(a => a.id === articleId);
  if (!article) {
    console.error('❌ Artículo no encontrado:', articleId);
    showMessage('Error: Artículo no encontrado', 'danger');
    return;
  }

  console.log('✏️ Editando artículo:', article.title, article);
  currentArticleId = articleId;

  // Abrir modal y mostrar spinner de carga
  const modalElement = document.getElementById('uploadModal');
  const modalLabel = document.getElementById('uploadModalLabel');
  const submitBtn = document.getElementById('submitBtn');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
    modalElement.classList.add('editing-mode');
    if (modalLabel) modalLabel.textContent = 'Editar artículo';
    if (submitBtn) {
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Cargando...';
      submitBtn.disabled = true;
      submitBtn.className = 'btn btn-success w-100';
      submitBtn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    }
    // Mostrar spinner en el formulario
    const form = document.getElementById('uploadForm');
    if (form) {
      form.classList.add('loading');
    }
    // Precargar datos (simulado asíncrono)
    setTimeout(() => {
      // Llenar todos los campos del formulario con validación
      const fields = {
        'articleName': article.title || '',
        'articleDescription': article.description || '',
        'articleCategory': article.category || 'general',
        'articleCondition': article.condition || 'bueno',
        'articleLocation': article.location || ''
      };
      for (const [fieldId, value] of Object.entries(fields)) {
        const field = document.getElementById(fieldId);
        if (field) {
          field.value = value;
          console.log(`📝 Campo ${fieldId} cargado:`, value);
        } else {
          console.warn(`⚠️ Campo ${fieldId} no encontrado en el DOM`);
        }
      }
      // Manejar imagen existente
      const urlInput = document.getElementById('articleImageUrl');
      const fileInput = document.getElementById('articleImageFile');
      const previewWrap = document.getElementById('articleImagePreview');
      const previewImg = document.getElementById('articleImagePreviewImg');
      if (fileInput) fileInput.value = '';
      if (urlInput) urlInput.value = article.imageUrl || '';
      if (article.imageUrl && previewWrap && previewImg) {
        previewImg.src = article.imageUrl;
        previewWrap.style.display = 'block';
        previewWrap.style.border = '3px solid #28a745';
        previewWrap.title = 'Imagen actual del artículo';
        console.log('Imagen cargada para edición:', article.imageUrl);
      } else if (previewWrap && previewImg) {
        previewImg.src = '';
        previewWrap.style.display = 'none';
        previewWrap.style.border = '';
        previewWrap.title = '';
      }
      // Quitar spinner y habilitar botón
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save me-2"></i>Actualizar artículo';
        submitBtn.disabled = false;
      }
      if (form) {
        form.classList.remove('loading');
      }
      setTimeout(() => {
        showMessage(`Editando: "${article.title}"`, 'info');
      }, 300);
    }, 600); // Simula carga asíncrona
  } else {
    showMessage('Error al abrir editor: Modal no encontrado', 'danger');
  }
};

// ================== ELIMINAR ARTÍCULO (CON VALIDACIÓN) ==================
window.confirmDelete = async function(articleId) {
  // Validar permisos antes de proceder
  if (!validateOwnership(articleId)) {
    return;
  }
  
  const article = articlesCache.find(a => a.id === articleId);
  if (!article) {
    console.error('❌ Artículo no encontrado:', articleId);
    showMessage('Error: Artículo no encontrado', 'danger');
    return;
  }

  console.log('Confirmando eliminación de:', article.title);

  // Crear modal de confirmación elegante y detallado
  const confirmModal = document.createElement('div');
  confirmModal.innerHTML = `
    <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content" style="border-radius: 20px; border: none; box-shadow: 0 15px 40px rgba(220, 53, 69, 0.4); overflow: hidden;">
          
          <div class="modal-header" style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); color: white; border: none; padding: 25px 30px;">
            <h5 class="modal-title d-flex align-items-center" style="font-weight: 700; font-size: 1.3rem;">
              <div class="me-3" style="width: 50px; height: 50px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-exclamation-triangle fa-lg"></i>
              </div>
              Confirmar Eliminación
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          
          <div class="modal-body text-center" style="padding: 40px 30px;">
            <div class="mb-4">
              ${article.imageUrl ? `
                <img src="${article.imageUrl}" alt="${article.title}" style="width: 120px; height: 120px; object-fit: cover; border-radius: 15px; border: 4px solid #fee; margin-bottom: 20px;">
              ` : `
                <div style="width: 120px; height: 120px; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 15px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
                  <i class="fas fa-image fa-2x" style="color: #dee2e6;"></i>
                </div>
              `}
            </div>
            
            <h4 style="color: #2D1B44; font-weight: 700; margin-bottom: 15px;">¿Estás completamente seguro?</h4>
            
            <div style="background: #fff5f5; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #dc3545;">
              <h6 style="color: #dc3545; font-weight: 600; margin-bottom: 10px;">Artículo a eliminar:</h6>
              <p style="color: #2D1B44; font-weight: 600; margin-bottom: 8px; font-size: 1.1rem;">
                "${article.title}"
              </p>
              <p style="color: #666; margin-bottom: 5px;">
                <i class="fas fa-tag me-2"></i>Categoría: ${article.category || 'General'}
              </p>
              ${article.location ? `
                <p style="color: #666; margin-bottom: 0;">
                  <i class="fas fa-map-marker-alt me-2"></i>Ubicación: ${article.location}
                </p>
              ` : ''}
            </div>
            
            <div style="background: #fff3cd; padding: 15px; border-radius: 12px; margin-top: 20px;">
              <p style="color: #856404; font-weight: 600; margin: 0;">
                <i class="fas fa-exclamation-circle me-2"></i>
                Esta acción es <strong>irreversible</strong>. El artículo se eliminará permanentemente.
              </p>
            </div>
          </div>
          
          <div class="modal-footer justify-content-center" style="padding: 25px 30px; border: none; background: #f8f9fa;">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" style="font-weight: 600; padding: 12px 25px; border-radius: 12px; border: 2px solid #6c757d; transition: all 0.3s ease;">
              <i class="fas fa-times me-2"></i>Cancelar
            </button>
            <button type="button" class="btn btn-danger ms-3" id="confirmDeleteBtn" style="font-weight: 700; padding: 12px 25px; border-radius: 12px; background: linear-gradient(135deg, #dc3545, #c82333); border: none; box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3); transition: all 0.3s ease;">
              <i class="fas fa-trash me-2"></i>Sí, Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(confirmModal);
  
  try {
    const modalElement = document.getElementById('deleteConfirmModal');
    const modal = new bootstrap.Modal(modalElement);
    
    // Manejar confirmación de eliminación
    document.getElementById('confirmDeleteBtn').addEventListener('click', async () => {
      try {
        // Cambiar botón a estado de carga
        const btn = document.getElementById('confirmDeleteBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Eliminando...';
        
        console.log('Eliminando artículo:', articleId);
        await deleteArticle(articleId);
        
        modal.hide();
        showMessage(`<i class="fas fa-trash-alt me-2"></i>Artículo "${article.title}" eliminado exitosamente`, 'success');
        
        console.log('🔄 Recargando artículos después de eliminar...');
        await loadArticles(true); // Forzar recarga después de eliminar
        
        console.log('Artículo eliminado y lista actualizada');
        
      } catch (error) {
        console.error('Error al eliminar artículo:', error);
        showMessage('Error al eliminar: ' + error.message, 'danger');
        modal.hide();
      }
    });

    modal.show();
    
    // Limpiar modal del DOM cuando se cierre
    modalElement.addEventListener('hidden.bs.modal', () => {
      setTimeout(() => {
        if (document.body.contains(confirmModal)) {
          document.body.removeChild(confirmModal);
        }
      }, 300);
    });
    
  } catch (error) {
    console.error('Error creando modal de confirmación:', error);
    showMessage('Error al mostrar confirmación: ' + error.message, 'danger');
    // Limpiar en caso de error
    if (document.body.contains(confirmModal)) {
      document.body.removeChild(confirmModal);
    }
  }
};

// ================== RESETEAR FORMULARIO ==================
function resetForm() {
  console.log('Reseteando formulario para nuevo artículo');
  
  currentArticleId = null;
  
  // Restaurar estado de creación
  const modalLabel = document.getElementById('uploadModalLabel');
  const submitBtn = document.getElementById('submitBtn');
  
  if (modalLabel) modalLabel.textContent = 'Publicar artículo';
  if (submitBtn) {
    submitBtn.innerHTML = '<i class="fas fa-plus me-2"></i>Publicar artículo';
    submitBtn.className = 'btn btn-purple w-100';
    submitBtn.style.background = '';
  }
  
  // Limpiar formulario completamente
  const form = document.getElementById('uploadForm');
  if (form) {
    form.reset();
    form.classList.remove('was-validated');
  }
  
  // Limpiar vista previa de imagen
  const previewWrap = document.getElementById('articleImagePreview');
  const previewImg = document.getElementById('articleImagePreviewImg');
  
  if (previewWrap) {
    previewWrap.style.display = 'none';
    previewWrap.style.border = '';
    previewWrap.title = '';
  }
  if (previewImg) {
    previewImg.src = '';
  }
  
  // Remover clase de modo edición
  const modalElement = document.getElementById('uploadModal');
  if (modalElement) {
    modalElement.classList.remove('editing-mode');
  }
  
  // Limpiar campos específicos por si acaso
  const fieldsToReset = ['articleName', 'articleDescription', 'articleImageUrl', 'articleImageFile', 'articleLocation'];
  fieldsToReset.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) field.value = '';
  });
  
  // Restablecer selects a valores por defecto
  const categorySelect = document.getElementById('articleCategory');
  const conditionSelect = document.getElementById('articleCondition');
  if (categorySelect) categorySelect.value = 'general';
  if (conditionSelect) conditionSelect.value = 'bueno';
  
  console.log('✅ Formulario reseteado completamente');
}

// ================== MOSTRAR MENSAJES ==================
function showMessage(text, type) {
  const messageDiv = document.getElementById('feedbackMessage');
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

// ================== SOLICITAR ARTÍCULO ==================

window.showRequestModal = function(articleId, articleTitle) {
  const message = prompt(`¿Quieres solicitar "${articleTitle}"?\n\nPuedes agregar un mensaje opcional para el donador:`);
  if (message === null) return; // Usuario canceló
  requestArticleHandler(articleId, message, articleTitle);
};

async function requestArticleHandler(articleId, message, articleTitle) {
  try {
    // Realiza la solicitud al backend (puedes ignorar el accessCode del result)
    await requestArticleService(articleId, message);

    // Obtén el código de la caja fuerte desde Firebase
    let lockerCode = null;
    try {
      lockerCode = await getCurrentLockerCode();
    } catch (lockerError) {
      console.warn('No se pudo obtener el código de la caja fuerte:', lockerError);
    }

    // Muestra sólo ese código en el modal (junto con instrucciones y mapa)
    showLockerCodeModal(lockerCode);

    showMessage('¡Solicitud enviada! Guarda tu código de la caja fuerte.', 'success');
    await loadArticles();
  } catch (error) {
    showMessage('Error al solicitar: ' + error.message, 'danger');
  }
}

function showLockerCodeModal(lockerCode) {
  const modalHtml = `
    <div class="modal fade" id="lockerCodeModal" tabindex="-1">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header bg-purple-light text-white">
            <h5 class="modal-title">
              <i class="fas fa-key"></i> Código de la Caja Fuerte Generado
            </h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="row">
              <!-- SOLO Código de la Caja Fuerte -->
              <div class="col-md-6">
                <div class="text-center mb-4">
                  <h6 class="text-muted mb-2">Tu código para abrir el casillero es:</h6>
                  <div class="locker-code-display">
                    <h1 class="display-3 text-success fw-bold">${lockerCode ? lockerCode : "No disponible"}</h1>
                  </div>
                  <button class="btn btn-outline-primary btn-sm mt-2" data-action="copy-code" data-code="${lockerCode ? lockerCode : ""}">
                    <i class="fas fa-copy"></i> Copiar código
                  </button>
                </div>
                
                <div class="alert alert-info">
                  <i class="fas fa-info-circle"></i> 
                  <strong>Importante:</strong> Guarda este código. Lo necesitarás para retirar el artículo del casillero.
                </div>
              </div>
              
              <!-- Mapa de Ubicación -->
              <div class="col-md-6">
                <h6 class="text-muted mb-3">
                  <i class="fas fa-map-marker-alt"></i> Ubicación del Casillero
                </h6>
                <div id="mapContainer" class="map-container">
                  <div id="map" style="height: 250px; border-radius: 8px;"></div>
                </div>
                
                <div class="mt-3">
                  <small class="text-muted">
                    <i class="fas fa-clock"></i> Horario de acceso: 24/7<br>
                    <i class="fas fa-building"></i> Centro de Donaciones UTSC<br>
                    <i class="fas fa-phone"></i> Contacto: (81) 8123-4567
                  </small>
                </div>
              </div>
            </div>
            
            <hr class="my-4">
            
            <div class="text-center">
              <h6 class="text-muted mb-3">¿Cómo funciona?</h6>
              <div class="row">
                <div class="col-4">
                  <div class="step-icon">
                    <i class="fas fa-bell text-warning"></i>
                  </div>
                  <small>1. Espera aprobación del donador</small>
                </div>
                <div class="col-4">
                  <div class="step-icon">
                    <i class="fas fa-map-marker-alt text-info"></i>
                  </div>
                  <small>2. Ve al casillero mostrado</small>
                </div>
                <div class="col-4">
                  <div class="step-icon">
                    <i class="fas fa-key text-success"></i>
                  </div>
                  <small>3. Ingresa tu código</small>
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" data-action="open-maps">
              <i class="fas fa-external-link-alt"></i> Abrir en Google Maps
            </button>
            <button type="button" class="btn btn-purple" data-bs-dismiss="modal">
              <i class="fas fa-check"></i> Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Remueve modal anterior si existe
  const oldModal = document.getElementById('lockerCodeModal');
  if (oldModal) oldModal.remove();
  
  // Agregar el nuevo modal
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modal = new bootstrap.Modal(document.getElementById('lockerCodeModal'));
  modal.show();
  
  // Inicializa el mapa cuando el modal se muestre completamente
  modal._element.addEventListener('shown.bs.modal', function() {
    initializeLockerMap();
  });
}

window.copyToClipboard = function(text) {
  navigator.clipboard.writeText(text).then(() => {
    showMessage('Código copiado al portapapeles', 'info');
  });
};

// ================== FUNCIONES DE MAPA PARA CASILLEROS ==================

// Coordenadas del Centro de Donaciones UTSC (ejemplo)
const LOCKER_LOCATION = {
  lat: 25.6866, // Monterrey, Nuevo León
  lng: -100.3161,
  name: "Centro de Donaciones UTSC",
  address: "Av. Tecnológico 1240, Ejido La Silla, 67170 Guadalupe, N.L."
};

function initializeLockerMap() {
  // Usar mapa estático por defecto (no requiere API key)
  showStaticMap();
  
  // Si Google Maps está disponible y configurado, intentar usar mapa interactivo
  if (typeof google !== 'undefined' && google.maps) {
    try {
      const map = new google.maps.Map(document.getElementById("map"), {
        zoom: 15,
        center: LOCKER_LOCATION,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
      });

      // Agregar marcador del casillero
      const marker = new google.maps.Marker({
        position: LOCKER_LOCATION,
        map: map,
        title: LOCKER_LOCATION.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
              <path fill="#6E49A3" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
          `),
          scaledSize: new google.maps.Size(32, 32),
        }
      });

      // Info window con información del casillero
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 10px; max-width: 200px;">
            <h6 style="color: #6E49A3; margin-bottom: 8px;">
              <i class="fas fa-box" style="margin-right: 5px;"></i>
              ${LOCKER_LOCATION.name}
            </h6>
            <p style="margin: 5px 0; font-size: 0.9rem;">${LOCKER_LOCATION.address}</p>
            <small style="color: #666;">
              <i class="fas fa-clock"></i> Disponible 24/7
            </small>
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(map, marker);
      });
      
      // Abrir info window automáticamente
      infoWindow.open(map, marker);
      
    } catch (error) {
      console.warn('Google Maps no disponible, usando mapa estático');
    }
  }
}

function showStaticMap() {
  const mapElement = document.getElementById('map');
  if (mapElement) {
    mapElement.innerHTML = `
      <div class="static-map-container" style="height: 100%; background: linear-gradient(135deg, #f8f9fa, #e9ecef); border-radius: 8px; display: flex; flex-direction: column; justify-content: center; align-items: center; padding: 20px; text-align: center;">
        <i class="fas fa-map-marked-alt fa-3x text-purple mb-3"></i>
        <h6 class="text-purple mb-2">${LOCKER_LOCATION.name}</h6>
        <small class="text-muted mb-3">${LOCKER_LOCATION.address}</small>
        <button class="btn btn-sm btn-outline-purple" data-action="open-maps">
          <i class="fas fa-directions"></i> Ver Direcciones
        </button>
      </div>
    `;
  }
}

window.openInGoogleMaps = function() {
  const url = `https://www.google.com/maps/search/?api=1&query=${LOCKER_LOCATION.lat},${LOCKER_LOCATION.lng}`;
  window.open(url, '_blank');
};

// ================== SOLICITAR ARTÍCULO ==================
// Función para obtener geolocalización
function getUserLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn('Geolocalización no disponible en este dispositivo');
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        console.log('Ubicación obtenida:', location);
        resolve(location);
      },
      (error) => {
        console.warn('Error obteniendo ubicación:', error.message);
        // No fallar la solicitud por problemas de ubicación
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutos
      }
    );
  });
}

window.requestArticle = async function(articleId, articleTitle, donorId) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    showMessage('Debes iniciar sesión para solicitar artículos', 'warning');
    return;
  }

  if (currentUser.uid === donorId) {
    showMessage('No puedes solicitar tu propio artículo', 'warning');
    return;
  }

  try {
    // Obtener ubicación del usuario antes de continuar
    showMessage('Obteniendo tu ubicación para mejorar la experiencia...', 'info');
    const userLocation = await getUserLocation();
    
    if (userLocation) {
      console.log('Ubicación del usuario incluida en solicitud:', userLocation);
    }

    // Mostrar modal de confirmación
    const confirmed = await showConfirmDialog(
      'Solicitar Artículo',
      `¿Estás seguro de que deseas solicitar "${articleTitle}"? Se generará un código de acceso para el casillero.${userLocation ? '<br><small class="text-muted">📍 Tu ubicación se ha incluido para optimizar la asignación del casillero.</small>' : ''}`
    );

    if (!confirmed) return;

    // Preparar datos de solicitud con ubicación si está disponible
    const requestData = {
      articleId,
      message: `Solicitud para: ${articleTitle}`,
      userLocation: userLocation
    };

    // Usar el servicio importado - usar nombre diferente para evitar conflictos
    const result = await requestArticleService(requestData.articleId, requestData.message);
    
    // Mostrar modal con código de acceso
    showAccessCodeModal(result.accessCode, articleTitle);
    
    // Recargar artículos para actualizar estado
    await loadArticles(true); // Forzar recarga después de solicitud
    
  } catch (error) {
    console.error('Error al solicitar artículo:', error);
    showMessage('Error al solicitar artículo: ' + error.message, 'danger');
  }
};

// Función auxiliar para modal de confirmación
function showConfirmDialog(title, message) {
  return new Promise((resolve) => {
    const modalHtml = `
      <div class="modal fade" id="confirmModal" tabindex="-1">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-purple-light text-white">
              <h5 class="modal-title">${title}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>${message}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" data-action="confirm" data-confirm="false">Cancelar</button>
              <button type="button" class="btn btn-purple" data-action="confirm" data-confirm="true" data-bs-dismiss="modal">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Remover modal anterior si existe
    const oldModal = document.getElementById('confirmModal');
    if (oldModal) oldModal.remove();
    
    // Agregar nuevo modal
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Función global para resolver la promesa
    window.resolveConfirm = resolve;
    
    const modal = new bootstrap.Modal(document.getElementById('confirmModal'));
    modal.show();
  });
}

// ================== EVENT DELEGATION PARA CSP COMPLIANCE ==================
document.addEventListener('DOMContentLoaded', function() {
  // Event delegation para manejar todos los clicks sin event handlers inline
  document.addEventListener('click', function(event) {
    const target = event.target;
    const action = target.getAttribute('data-action') || target.closest('[data-action]')?.getAttribute('data-action');
    
    if (!action) return;
    
    switch (action) {
      case 'edit':
        const editId = target.getAttribute('data-article-id') || target.closest('[data-article-id]')?.getAttribute('data-article-id');
        if (editId) {
          console.log('Editando artículo:', editId);
          editArticle(editId);
        }
        break;
        
      case 'delete':
        const deleteId = target.getAttribute('data-article-id') || target.closest('[data-article-id]')?.getAttribute('data-article-id');
        if (deleteId) {
          console.log('Eliminando artículo:', deleteId);
          deleteArticleConfirm(deleteId);
        }
        break;
        
      case 'request':
        const requestId = target.getAttribute('data-article-id') || target.closest('[data-article-id]')?.getAttribute('data-article-id');
        if (requestId) {
          console.log('Solicitando artículo:', requestId);
          requestArticle(requestId);
        }
        break;
        
      case 'copy-code':
        const code = target.getAttribute('data-code') || target.closest('[data-code]')?.getAttribute('data-code');
        if (code) {
          console.log('Copiando código:', code);
          copyToClipboard(code);
        }
        break;
        
      case 'open-maps':
        console.log('Abriendo Google Maps');
        openInGoogleMaps();
        break;
        
      case 'confirm':
        const confirmValue = target.getAttribute('data-confirm') === 'true';
        console.log('Confirmación:', confirmValue);
        if (window.resolveConfirm) {
          window.resolveConfirm(confirmValue);
        }
        break;
        
      default:
        console.log('Acción desconocida:', action);
    }
  });
});

// ================== INICIALIZACIÓN DE MODAL LISTENERS ==================
document.addEventListener('DOMContentLoaded', function() {
  // Listener para el botón de nuevo artículo
  const uploadModal = document.getElementById('uploadModal');
  const newArticleBtn = document.querySelector('[data-bs-target="#uploadModal"]');
  
  if (uploadModal) {
    uploadModal.addEventListener('show.bs.modal', function(event) {
      // Si no se está editando (el modal se abre desde el botón +)
      if (!uploadModal.classList.contains('editing-mode')) {
        console.log('Abriendo modal para nuevo artículo');
        resetForm();
      }
    });
  }
});



