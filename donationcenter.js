// Simulación de artículos y solicitudes solo en JS
const PLACEHOLDER_IMAGE = 'assets/placeholder.png';
let articlesCache = [
  {
    id: '1',
    title: 'Libro de texto universitario',
    description: 'Libro de cálculo avanzado, buen estado.',
    category: 'Libros',
    condition: 'Bueno',
    location: 'CDMX',
    status: 'disponible',
    imageUrl: '',
    userId: 'user1'
  },
  {
    id: '2',
    title: 'Laptop usada',
    description: 'Laptop Dell, funciona pero tiene detalles en la pantalla.',
    category: 'Electrónica',
    condition: 'Regular',
    location: 'Guadalajara',
    status: 'disponible',
    imageUrl: '',
    userId: 'user2'
  }
];
let requestsCache = [];
let currentArticleId = null;
function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ========== CONSTANTES Y VARIABLES ==========
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
const lockerCode = await getCurrentLockerCode();

// ========== FUNCIONES UTILITARIAS DE USO GENERAL (¡DEBEN IR ARRIBA!) ==========

function escapeHtml(unsafe) {
  return unsafe.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showMessage(text, type) {
  // Solo log para desarrollo, no en producción
  if (window.location.hostname === 'localhost' || window.__ENV__?.ENV === 'development') {
    console.log(`[showMessage] ${type.toUpperCase()}: ${text}`);
  }
  const toast = document.getElementById('toast');
  if (toast && window.bootstrap?.Toast) {
    const toastBody = toast.querySelector('.toast-body');
    if (toastBody) {
      toast.classList.remove('bg-success', 'bg-danger', 'bg-warning', 'bg-info');
      toast.style.backgroundColor = TOAST_COLORS[type] || TOAST_COLORS.default;
      toast.style.color = '#ffffff';
      toastBody.textContent = text;
      const bsToast = new window.bootstrap.Toast(toast);
      bsToast.show();
      return;
    }
  }
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

function withTimeout(promise, timeoutMs, operationName) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Timeout: ${operationName} tardó más de ${timeoutMs / 1000}s`)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// ========== INICIO Y PERFIL ==========

document.addEventListener('DOMContentLoaded', () => {
  renderArticles();
  setupFormHandlers();
});
// Vista previa de imagen en el modal de publicación
function setupImagePreviewHandler() {
  const fileInput = document.getElementById('articleImageFile');
  const previewImg = document.getElementById('articleImagePreviewImg');
  if (!fileInput || !previewImg) return;
  fileInput.addEventListener('change', function (e) {
    const file = e.target.files && e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = function (ev) {
        previewImg.src = ev.target.result;
        previewImg.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      previewImg.src = '';
      previewImg.style.display = 'none';
    }
  });
}

async function loadUserProfile() {
  try {
    let user = await getCurrentUser();
    if (!user) return;
    const { getToken } = await import('./db.js');
    const token = await getToken('access');
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
  // Mostrar acceso admin si corresponde
  if (profile.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = '';
    });
  } else {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = 'none';
    });
  }
}
window.updateNavbarProfile = updateNavbarProfile;

// ========== CARGA Y VISUALIZACIÓN DE ARTÍCULOS ==========

function renderArticles() {
  const grid = document.getElementById('articlesGrid');
  const emptyState = document.getElementById('emptyState');
  if (!articlesCache || articlesCache.length === 0) {
    if (grid) grid.style.display = 'none';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  if (grid) grid.style.display = 'flex';
  if (emptyState) emptyState.style.display = 'none';
  grid.innerHTML = articlesCache.map(article => `
    <div class="col-md-6 col-lg-4">
      <div class="card donation-card position-relative shadow-lg border-0 h-100" style="border-radius: 20px; overflow: hidden;">
        <div class="position-relative article-image-container">
          <img src="${PLACEHOLDER_IMAGE}" class="card-img-top article-image" alt="${escapeHtml(article.title)}" style="height: 200px; object-fit: cover; border-radius: 20px 20px 0 0;">
          <span class="badge status-badge bg-purple-primary position-absolute top-0 end-0 mt-2 me-2 px-3 py-2">Disponible</span>
        </div>
        <div class="card-body d-flex flex-column px-4 pb-4" style="background: linear-gradient(135deg, #F6F1F9 0%, #E8DFF5 100%); border-radius: 0 0 20px 20px;">
          <h5 class="card-title text-purple-primary mb-2 fw-bold">${escapeHtml(article.title)}</h5>
          <p class="card-text mb-2" style="color:#5A4A6B;">${escapeHtml(article.description)}</p>
          <div class="mb-2">
            <span class="badge bg-purple-light me-2 px-3 py-1">${escapeHtml(article.category || "General")}</span>
            <span class="badge bg-purple-primary px-3 py-1">${escapeHtml(article.condition || "Bueno")}</span>
          </div>
          <small class="d-block text-muted mb-3"><i class="fas fa-map-marker-alt me-1"></i> ${escapeHtml(article.location || "")}</small>
        </div>
      </div>
    </div>
  `).join('');
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

  attachArticleEventListeners();
}

// ========== EVENTOS DE ARTÍCULOS ==========

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

// ========== MANEJO DE ERRORES DE IMÁGENES ==========

function setupImageErrorHandlers() {
  const grid = document.getElementById('articlesGrid');
  if (grid) {
    grid.addEventListener('error', function (event) {
      if (event.target.tagName === 'IMG' && event.target.classList.contains('article-image')) {
        handleImageError(event.target);
      }
    }, true);
  }
}

function handleImageError(img) {
  if (img.src.includes(PLACEHOLDER_IMAGE)) return;
  img.src = PLACEHOLDER_IMAGE;
  img.alt = 'Imagen no disponible';
  img.addEventListener('error', function placeholderError() {
    img.removeEventListener('error', placeholderError);
    const container = img.closest('.article-image-container');
    if (container) {
      container.innerHTML = `
        <div class="no-image-placeholder d-flex flex-column align-items-center justify-content-center py-5" style="background: #e5d4f2; height:200px;">
          <i class="fas fa-exclamation-triangle fa-2x text-warning mb-2"></i>
          <span style="color:#8C78BF;">Error al cargar imagen</span>
          <small class="text-muted mt-1">Imagen no disponible</small>
        </div>
      `;
    }
  }, { once: true });
}

// ========== FORMULARIOS Y SUBIDA DE ARTÍCULOS ==========

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

// ========== SUBIDA Y MANEJO DE ARTÍCULOS ==========

async function saveArticle() {
  const fileInput = document.getElementById('articleImageFile');
  const urlInput = document.getElementById('articleImageUrl');
  const submitBtn = document.getElementById('submitBtn');
  let uploadedFileRef = null;
  try {
    const user = await getCurrentUser();
    if (!user) {
      showMessage('Error: No hay sesión activa. Por favor inicia sesión.', 'danger');
      return;
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Guardando...';
    }
    const baseData = {
      title: document.getElementById('articleName').value.trim(),
      description: document.getElementById('articleDescription').value.trim(),
      category: document.getElementById('articleCategory').value,
      condition: document.getElementById('articleCondition').value,
      location: document.getElementById('articleLocation').value.trim() || null,
      status: 'disponible'
    };
    let imageUrl = urlInput?.value?.trim() || null;
    const file = fileInput?.files?.[0] || null;
    // PASO 1: Subir imagen a Firebase Storage si hay archivo seleccionado
    if (file) {
      const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const path = `articles/${user.uid}/${Date.now()}_${safeName}`;
      const fileRef = ref(storage, path);
      try {
        await withTimeout(uploadBytes(fileRef, file), UPLOAD_TIMEOUT_MS, 'subida de imagen');
        await withTimeout(getMetadata(fileRef), VERIFY_TIMEOUT_MS, 'verificación de imagen');
        imageUrl = await withTimeout(getDownloadURL(fileRef), VERIFY_TIMEOUT_MS, 'obtención de URL');
        uploadedFileRef = fileRef;
      } catch (uploadError) {
        showMessage('Error al subir la imagen: ' + (uploadError?.message || 'Error desconocido. Verifica tu conexión.'), 'danger');
        return;
      }
    }
    // PASO 2: Enviar datos al backend
    const articleData = { ...baseData, imageUrl };
    try {
      if (currentArticleId) {
        await withTimeout(updateArticle(currentArticleId, articleData), BACKEND_TIMEOUT_MS, 'actualización de artículo');
        showMessage('Artículo actualizado exitosamente', 'success');
      } else {
        await withTimeout(createArticle(articleData), BACKEND_TIMEOUT_MS, 'creación de artículo');
        showMessage('Artículo publicado exitosamente', 'success');
      }
    } catch (dbError) {
      if (uploadedFileRef) await eliminarImagenHuerfana(uploadedFileRef);
      showMessage('Error al guardar el artículo: ' + (dbError?.message || 'Error del servidor'), 'danger');
      return;
    }
    closeUploadModal();
    await loadArticles(true);
    currentArticleId = null;
  } catch (error) {
    showMessage('Error inesperado: ' + (error?.message || 'Por favor intenta de nuevo'), 'danger');
    if (uploadedFileRef) await eliminarImagenHuerfana(uploadedFileRef);
  } finally {
    cleanupFormUI();
  }
}

async function eliminarImagenHuerfana(fileRef) {
  try {
    await deleteObject(fileRef);
  } catch (cleanupError) {}
}

function cleanupFormUI() {
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = currentArticleId ? 'Actualizar artículo' : 'Publicar artículo';
  }
}

function closeUploadModal() {
  try {
    const modalElement = document.getElementById('uploadModal');
    if (!modalElement) return;
    const modal = window.bootstrap?.Modal?.getInstance?.(modalElement);
    if (modal) {
      if (modalElement.contains(document.activeElement)) document.activeElement.blur();
      modal.hide();
    }
  } catch (e) {}
}

// ========== EDICIÓN Y ELIMINACIÓN DE ARTÍCULOS ==========

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
  if (modal) {
    modal.show();
    setTimeout(() => {
      const firstInput = modalElement.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }, 400);
  }
}
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
  }
}
window.confirmDelete = confirmDelete;

// ========== SOLICITUD DE ARTÍCULOS ==========

function showRequestModal(articleId, articleTitle) {
  const message = prompt(`¿Quieres solicitar "${articleTitle}"?\nPuedes agregar un mensaje opcional para el donador:`);
  if (message === null) return;
  // Obtener locker code al momento de solicitar
  getCurrentLockerCode().then(lockerCode => {
    requestArticleHandler(articleId, message, articleTitle, lockerCode);
  }).catch(err => {
    showMessage('No se pudo obtener el código de la caja fuerte', 'warning');
    requestArticleHandler(articleId, message, articleTitle, null);
  });
}
window.showRequestModal = showRequestModal;

async function requestArticleHandler(articleId, message, articleTitle, lockerCode) {
  try {
    // Obtener el artículo para saber el UID del dueño
    const article = articlesCache.find(a => a.id === articleId);
    if (!article || !article.userId) throw new Error('No se pudo obtener el dueño del artículo');
    const requestData = {
      articleId,
      message,
      lockerCode,
      receiverId: article.userId,
      articleTitle
    };
    await requestArticleService(requestData);
    showMessage('¡Solicitud enviada!', 'success');
    await loadArticles();
    // Mostrar modal con código, mapa y pasos
    showLockerInfoModal(lockerCode);
  } catch (error) {
    showMessage('Error al solicitar: ' + (error?.message || error), 'danger');
  }
}

// Modal para mostrar código, mapa y pasos
function showLockerInfoModal(lockerCode) {
  // Crear modal dinámico si no existe
  let modal = document.getElementById('lockerInfoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lockerInfoModal';
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title"><i class="fas fa-key me-2"></i>Código y pasos para el locker</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3 text-center">
              <strong>Código de acceso:</strong>
              <div class="access-code" style="font-size:2rem;letter-spacing:6px;">${lockerCode || 'No disponible'}</div>
              <button class="btn btn-outline-success btn-sm mt-2" onclick="navigator.clipboard.writeText('${lockerCode}')"><i class="fas fa-copy"></i> Copiar código</button>
            </div>
            <div class="mb-3">
              <strong>Ubicación del casillero:</strong>
              <div id="lockerMap" style="height:250px;border-radius:8px;"></div>
            </div>
            <div class="mb-2">
              <strong>Pasos para dejar/recoger el artículo:</strong>
              <ol class="mt-2">
                <li>Dirígete al casillero indicado en el mapa.</li>
                <li>Verifica tu ubicación en el mapa.</li>
                <li>Ingresa el código mostrado en el teclado del casillero.</li>
                <li>Deposita o recoge tu artículo y cierra la puerta.</li>
              </ol>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-purple" data-bs-dismiss="modal"><i class="fas fa-check"></i> Entendido</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }
  // Inicializar mapa de Google Maps
  setTimeout(() => {
    if (window.google && window.google.maps) {
      const mapDiv = document.getElementById('lockerMap');
      const lockerLatLng = { lat: 25.6866, lng: -100.3161 };
      const map = new google.maps.Map(mapDiv, {
        zoom: 15,
        center: lockerLatLng,
        mapTypeId: 'roadmap'
      });
      new google.maps.Marker({
        position: lockerLatLng,
        map,
        title: 'Casillero',
        icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
      });
    } else {
      // Cargar Google Maps API si no está presente
      const script = document.createElement('script');
      // Google Maps API eliminada
      script.async = true;
      script.onload = () => showLockerInfoModal(lockerCode);
      document.body.appendChild(script);
    }
  }, 400);
  // Mostrar modal
  const bsModal = new window.bootstrap.Modal(modal);
  bsModal.show();
}


