// Simulación de solicitudes solo en JS
let requestsCache = [
  {
    id: '1',
    articleTitle: 'Libro de texto universitario',
    message: '¿Está disponible?',
    status: 'pendiente',
    createdAt: new Date().toISOString()
  }
];

document.addEventListener('DOMContentLoaded', () => {
  renderRequests();
  setupRequestForm();
});

// Setup event listeners for modal buttons
function setupModalEventListeners() {
  // Approve modal confirm button
  const approveModalConfirmBtn = document.getElementById('approveModalConfirmBtn');
  if (approveModalConfirmBtn) {
    approveModalConfirmBtn.addEventListener('click', approveRequestHandler);
  }
  
  // Copy pickup code button
  const copyPickupCodeBtn = document.getElementById('copyPickupCodeBtn');
  if (copyPickupCodeBtn) {
    copyPickupCodeBtn.addEventListener('click', function() {
      const code = document.getElementById('pickupAccessCode')?.textContent || '';
      copyToClipboard(code);
    });
  }
}

// ================== CARGAR SOLICITUDES ENVIADAS ==================
function renderRequests() {
  const grid = document.getElementById('sentRequestsGrid');
  const empty = document.getElementById('sentEmpty');
  if (!requestsCache || requestsCache.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = requestsCache.map(req => {
    let date = 'Fecha no disponible';
    try {
      if (req.createdAt) {
        const parsedDate = new Date(req.createdAt);
        if (!isNaN(parsedDate.getTime())) {
          date = parsedDate.toLocaleString('es-ES', {
            year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
          });
        }
      }
    } catch { date = 'Fecha inválida'; }
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card request-card h-100" style="border: 1px solid #E8DFF5; background: rgba(255,255,255,0.95); box-shadow: 0 4px 12px rgba(110,73,163,0.15);">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title mb-0" style="color: #4A3066; font-weight: 600;">${req.articleTitle}</h5>
              <span class="badge bg-warning">${req.status}</span>
            </div>
            ${req.message ? `<p class="card-text" style="color: #5A4A6B;"><small><i class="fas fa-comment"></i> ${req.message}</small></p>` : ''}
            <p class="card-text"><small style="color: #6E49A3;"><i class="fas fa-calendar"></i> ${date}</small></p>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function setupRequestForm() {
  const form = document.getElementById('requestForm');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    const articleTitle = form.querySelector('#requestArticleTitle').value.trim();
    const message = form.querySelector('#requestMessage').value.trim();
    if (!articleTitle) return;
    requestsCache.push({
      id: Date.now().toString(),
      articleTitle,
      message,
      status: 'pendiente',
      createdAt: new Date().toISOString()
    });
    form.reset();
    renderRequests();
  });
}

function displaySentRequests(requests) {
  const grid = document.getElementById('sentRequestsGrid');
  const empty = document.getElementById('sentEmpty');
  if (!requests || requests.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = requests.map(req => {
    const statusInfo = getStatusInfo(req.status);
    let date = 'Fecha no disponible';
    try {
      if (req.createdAt) {
        let parsedDate = null;
        if (typeof req.createdAt === 'string') {
          parsedDate = new Date(req.createdAt);
        } else if (req.createdAt.seconds) {
          parsedDate = new Date(req.createdAt.seconds * 1000);
        } else if (typeof req.createdAt.toDate === 'function') {
          parsedDate = req.createdAt.toDate();
        } else if (req.createdAt instanceof Date) {
          parsedDate = req.createdAt;
        }
        if (parsedDate && !isNaN(parsedDate.getTime())) {
          date = parsedDate.toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        }
      }
    } catch (error) {
      date = 'Fecha inválida';
    }
    // Escape special characters in strings for data attributes (full HTML entity escaping)
    const escapeHtmlAttr = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/\n/g, '&#10;')
        .replace(/\r/g, '&#13;');
    };
    
    const escapedAccessCode = escapeHtmlAttr(req.accessCode);
    const escapedLockerLocation = escapeHtmlAttr(req.lockerLocation);
    const escapedLockerId = escapeHtmlAttr(req.lockerId);
    
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card request-card h-100" style="border: 1px solid #E8DFF5; background: rgba(255, 255, 255, 0.95); box-shadow: 0 4px 12px rgba(110, 73, 163, 0.15);">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title mb-0" style="color: #4A3066; font-weight: 600;">${escapeHtmlAttr(req.articleTitle)}</h5>
              <span class="badge ${statusInfo.class}" style="${statusInfo.style || ''}">${statusInfo.text}</span>
            </div>
            ${req.message ? `<p class="card-text" style="color: #5A4A6B;"><small><i class="fas fa-comment"></i> ${escapeHtmlAttr(req.message)}</small></p>` : ''}
            <p class="card-text"><small style="color: #6E49A3;"><i class="fas fa-calendar"></i> ${date}</small></p>
            ${req.status === 'aprobada' ? `
              <div class="alert alert-success mb-3">
                <div class="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Código de acceso:</strong>
                    <div class="access-code">${escapeHtmlAttr(req.accessCode)}</div>
                  </div>
                  <button class="btn btn-sm btn-outline-success btn-copy-code" data-code="${escapedAccessCode}">
                    <i class="fas fa-copy"></i>
                  </button>
                </div>
                ${req.lockerLocation ? `<p class="mb-0 mt-2"><i class="fas fa-map-marker-alt"></i> ${escapeHtmlAttr(req.lockerLocation)}</p>` : ''}
                ${req.lockerId ? `<p class="mb-0"><i class="fas fa-lock"></i> Casillero: ${escapeHtmlAttr(req.lockerId)}</p>` : ''}
              </div>
              <button class="btn btn-info w-100 mb-2 btn-pickup-details" data-locker-location="${escapedLockerLocation}" data-locker-id="${escapedLockerId}">
                <i class="fas fa-map-marked-alt"></i> Ver detalles de recogida
              </button>
              <button class="btn btn-primary w-100 btn-confirm-pickup" data-request-id="${req.id}">
                <i class="fas fa-check"></i> Confirmar Retiro
              </button>
            ` : req.status === 'rechazada' && req.rejectionReason ? `
              <div class="alert alert-danger">
                <small><i class="fas fa-exclamation-circle"></i> ${escapeHtmlAttr(req.rejectionReason)}</small>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners for sent requests (CSP compatible)
  attachSentRequestsListeners();
}

// Attach event listeners for sent requests grid
let sentRequestsListenerAttached = false;
function attachSentRequestsListeners() {
  const grid = document.getElementById('sentRequestsGrid');
  if (!grid || sentRequestsListenerAttached) return;
  
  grid.addEventListener('click', handleSentRequestsClick);
  sentRequestsListenerAttached = true;
}

// Handle click events for sent requests
function handleSentRequestsClick(event) {
  const target = event.target.closest('button');
  if (!target) return;
  
  if (target.classList.contains('btn-copy-code')) {
    const code = target.dataset.code || '';
    copyToClipboard(code);
  } else if (target.classList.contains('btn-pickup-details')) {
    const lockerLocation = target.dataset.lockerLocation || '';
    const lockerId = target.dataset.lockerId || '';
    showPickupDetailsModal(lockerLocation, lockerId);
  } else if (target.classList.contains('btn-confirm-pickup')) {
    const requestId = target.dataset.requestId;
    confirmPickupHandler(requestId);
  }
}

// Mostrar modal de detalles de recogida
function showPickupDetailsModal(lockerLocation, lockerId) {
  const modal = new bootstrap.Modal(document.getElementById('pickupDetailsModal'));
  document.getElementById('pickupCodeBox').style.display = 'none';
  document.getElementById('pickupCodeSpinner').style.display = 'inline-block';
  document.getElementById('pickupAccessCode').textContent = '';
  getCurrentLockerCode().then(code => {
    document.getElementById('pickupCodeSpinner').style.display = 'none';
    document.getElementById('pickupCodeBox').style.display = 'block';
    document.getElementById('pickupAccessCode').textContent = code;
    // Mostrar mapa Google Maps
    showGoogleLockerMap(lockerLocation);
  }).catch(() => {
    document.getElementById('pickupCodeSpinner').style.display = 'none';
    document.getElementById('pickupCodeBox').style.display = 'block';
    document.getElementById('pickupAccessCode').textContent = 'Error';
    showGoogleLockerMap(lockerLocation);
  });
  modal.show();
}

function showGoogleLockerMap(lockerLocation) {
  const mapDiv = document.getElementById('pickupMap');
  mapDiv.innerHTML = '';
  // Coordenadas por defecto (Monterrey, Centro)
  let lockerCoords = { lat: 25.6866, lng: -100.3161 };
  if (lockerLocation && lockerLocation.toLowerCase().includes('uts')) {
    lockerCoords = { lat: 25.7305, lng: -100.309 };
  }
  if (window.google && window.google.maps) {
    const map = new google.maps.Map(mapDiv, {
      zoom: 15,
      center: lockerCoords,
      mapTypeId: 'roadmap'
    });
    new google.maps.Marker({
      position: lockerCoords,
      map,
      title: 'Casillero',
      icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
    });
  } else {
    // Cargar Google Maps API si no está presente
    const script = document.createElement('script');
    // Google Maps API eliminada
    script.async = true;
    script.onload = () => showGoogleLockerMap(lockerLocation);
    document.body.appendChild(script);
  }
}

function renderPickupMap(lockerLocation) {
  const mapDiv = document.getElementById('pickupMap');
  mapDiv.innerHTML = '';
  if (!window.L) {
    const leafletCss = document.createElement('link');
    leafletCss.rel = 'stylesheet';
    leafletCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(leafletCss);
    const leafletScript = document.createElement('script');
    leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    leafletScript.onload = () => renderPickupMap(lockerLocation);
    document.body.appendChild(leafletScript);
    return;
  }
  let lockerCoords = { lat: 25.7305, lng: -100.309 };
  if (lockerLocation && lockerLocation.toLowerCase().includes('centro')) {
    lockerCoords = { lat: 25.6866, lng: -100.3161 };
  }
  const map = L.map('pickupMap').setView([lockerCoords.lat, lockerCoords.lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  L.marker([lockerCoords.lat, lockerCoords.lng]).addTo(map)
    .bindPopup('Casillero').openPopup();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const userCoords = [pos.coords.latitude, pos.coords.longitude];
      L.circle(userCoords, { radius: 20, color: 'blue', fillColor: '#30f', fillOpacity: 0.3 }).addTo(map)
        .bindPopup('Tu ubicación').openPopup();
      map.setView(userCoords, 16);
    }, () => {});
  }
}

// ================== CARGAR SOLICITUDES RECIBIDAS ==================
async function loadReceivedRequests() {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error('Usuario no autenticado');
    const requests = await getReceivedRequests();
    displayReceivedRequests(requests);
  } catch (error) {
    console.error('Error al cargar solicitudes recibidas:', error);
    if (error.message.includes('token') || error.message.includes('autenticado')) {
      showMessage('Sesión expirada. Redirigiendo...', 'warning');
      window.location.replace('login.html');
    } else {
      showMessage('Error al cargar solicitudes: ' + error.message, 'danger');
    }
  }
}

function displayReceivedRequests(requests) {
  const grid = document.getElementById('receivedRequestsGrid');
  const empty = document.getElementById('receivedEmpty');
  if (!requests || requests.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    return;
  }
  empty.style.display = 'none';
  grid.innerHTML = requests.map(req => {
    const statusInfo = getStatusInfo(req.status);
    let date = 'Fecha no disponible';
    try {
      if (req.createdAt) {
        if (req.createdAt.seconds) {
          date = new Date(req.createdAt.seconds * 1000).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } else if (req.createdAt.toDate) {
          date = req.createdAt.toDate().toLocaleString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
        } else if (typeof req.createdAt === 'string') {
          const parsedDate = new Date(req.createdAt);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toLocaleString('es-ES', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
          }
        }
      }
    } catch {
      date = 'Fecha inválida';
    }
    return `
      <div class="col-md-6 col-lg-4">
        <div class="card request-card h-100" style="border: 1px solid #E8DFF5; background: rgba(255, 255, 255, 0.95); box-shadow: 0 4px 12px rgba(110, 73, 163, 0.15);">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-start mb-3">
              <h5 class="card-title mb-0" style="color: #4A3066; font-weight: 600;">${req.articleTitle}</h5>
              <span class="badge ${statusInfo.class}" style="${statusInfo.style || ''}">${statusInfo.text}</span>
            </div>
            ${req.message ? `
              <div class="alert alert-info mb-3" style="background: rgba(169, 146, 216, 0.1); border: 1px solid #A992D8; color: #4A3066;">
                <small><i class="fas fa-comment"></i> <strong>Mensaje:</strong><br>${req.message}</small>
              </div>
            ` : ''}
            <p class="card-text"><small style="color: #6E49A3;"><i class="fas fa-calendar"></i> ${date}</small></p>
            ${req.status === 'pendiente' ? `
              <div class="btn-group w-100 mb-2" role="group">
                <button class="btn btn-success btn-approve-request" data-request-id="${req.id}">
                  <i class="fas fa-check"></i> Aprobar
                </button>
                <button class="btn btn-danger btn-reject-request" data-request-id="${req.id}">
                  <i class="fas fa-times"></i> Rechazar
                </button>
              </div>
            ` : req.status === 'aprobada' ? `
              <div class="alert alert-success mb-2">
                <strong>Código:</strong> <span class="access-code">${req.accessCode}</span>
                ${req.lockerLocation ? `<p class="mb-0 mt-2"><small>${req.lockerLocation}</small></p>` : ''}
              </div>
              <button class="btn btn-primary w-100 btn-confirm-delivery" data-request-id="${req.id}">
                <i class="fas fa-check"></i> Marcar como Entregado
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners for received requests (CSP compatible)
  attachReceivedRequestsListeners();
}

// Attach event listeners for received requests grid
let receivedRequestsListenerAttached = false;
function attachReceivedRequestsListeners() {
  const grid = document.getElementById('receivedRequestsGrid');
  if (!grid || receivedRequestsListenerAttached) return;
  
  grid.addEventListener('click', handleReceivedRequestsClick);
  receivedRequestsListenerAttached = true;
}

// Handle click events for received requests
function handleReceivedRequestsClick(event) {
  const target = event.target.closest('button');
  if (!target) return;
  
  const requestId = target.dataset.requestId;
  
  if (target.classList.contains('btn-approve-request')) {
    showApproveModal(requestId);
  } else if (target.classList.contains('btn-reject-request')) {
    rejectRequestHandler(requestId);
  } else if (target.classList.contains('btn-confirm-delivery')) {
    confirmPickupHandler(requestId);
  }
}

// ================== APROBAR SOLICITUD ==================
function showApproveModal(requestId) {
  document.getElementById('approveRequestId').value = requestId;
  document.getElementById('lockerId').value = '';
  document.getElementById('lockerLocation').value = '';
  const modal = new bootstrap.Modal(document.getElementById('approveModal'));
  modal.show();
}

async function approveRequestHandler() {
  const requestId = document.getElementById('approveRequestId').value;
  const lockerId = document.getElementById('lockerId').value.trim();
  const lockerLocation = document.getElementById('lockerLocation').value.trim();
  try {
    await approveRequest(requestId, lockerId || null, lockerLocation || null);
    const modal = bootstrap.Modal.getInstance(document.getElementById('approveModal'));
    modal.hide();
    showMessage('Solicitud aprobada. El solicitante ha recibido su código de acceso.', 'success');
    await loadReceivedRequests();
  } catch (error) {
    showMessage('Error al aprobar: ' + error.message, 'danger');
  }
}

// ================== RECHAZAR SOLICITUD ==================
async function rejectRequestHandler(requestId) {
  const reason = prompt('¿Por qué rechazas esta solicitud? (opcional)');
  if (reason === null) return;
  try {
    await rejectRequest(requestId, reason);
    showMessage('Solicitud rechazada', 'info');
    await loadReceivedRequests();
  } catch (error) {
    showMessage('Error al rechazar: ' + error.message, 'danger');
  }
}

// ================== CONFIRMAR RETIRO ==================
async function confirmPickupHandler(requestId) {
  if (!confirm('¿Confirmas que el artículo ha sido retirado/entregado?')) return;
  try {
    await confirmPickup(requestId);
    showMessage('Retiro confirmado. ¡Donación completada!', 'success');
    const activeTab = document.querySelector('.nav-link.active').id;
    if (activeTab === 'sent-tab') {
      await loadSentRequests();
    } else {
      await loadReceivedRequests();
    }
  } catch (error) {
    showMessage('Error al confirmar: ' + error.message, 'danger');
  }
}

// ================== UTILIDADES ==================
function getStatusInfo(status) {
  const statuses = {
    'pendiente': { text: 'Pendiente', class: '' },
    'aprobada': { text: 'Aprobada', class: '' },
    'rechazada': { text: 'Rechazada', class: '' },
    'completada': { text: 'Completada', class: '' }
  };
  const result = statuses[status] || { text: status, class: '' };
  switch (status) {
    case 'pendiente':
      result.class = 'text-white';
      result.style = 'background-color: #A992D8; font-weight: 600;';
      break;
    case 'aprobada':
      result.class = 'text-white';
      result.style = 'background-color: #6E49A3; font-weight: 600;';
      break;
    case 'rechazada':
      result.class = 'text-white';
      result.style = 'background-color: #8C78BF; font-weight: 600;';
      break;
    case 'completada':
      result.class = 'text-white';
      result.style = 'background-color: #4A3066; font-weight: 600;';
      break;
    default:
      result.class = 'text-white';
      result.style = 'background-color: #6c757d; font-weight: 600;';
  }
  return result;
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showMessage('Código copiado', 'info');
  }).catch(() => {
    showMessage('Error al copiar código', 'danger');
  });
}

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

// Geolocalización automática al crear solicitud
async function getCurrentPositionPromise() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocalización no soportada'));
    navigator.geolocation.getCurrentPosition(
      pos => resolve(pos.coords),
      err => reject(err),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  });
}

async function createRequestWithLocation(requestData) {
  try {
    const coords = await getCurrentPositionPromise();
    requestData.location = {
      lat: coords.latitude,
      lng: coords.longitude,
      source: 'user-device'
    };
  } catch (e) {
    requestData.location = { source: 'unknown' };
  }
  await createRequest(requestData);
}

// End of file
