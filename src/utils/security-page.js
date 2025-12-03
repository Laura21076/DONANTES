// security-page.js - Security page initialization and event handlers
// Variables globales
let simple2FA;
let roleManager;
let currentUser = null;

// Inicialización cuando se carga la página
document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Esperar a que Firebase esté listo
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Inicializar servicios
    simple2FA = new Simple2FA();
    roleManager = new RoleManager();
    
    // Cargar información del usuario
    await loadUserInfo();
    
    // Crear interfaz de 2FA
    simple2FA.createSetupInterface('2fa-container');
    
    // Configurar event listeners para los botones
    setupEventListeners();
    
  } catch (error) {
    console.error('Error inicializando página de seguridad:', error);
    showErrorMessage('Error cargando la configuración de seguridad');
  }
});

// Configurar event listeners para los botones (CSP compliance)
function setupEventListeners() {
  const viewLogsBtn = document.getElementById('viewLogsBtn');
  if (viewLogsBtn) {
    viewLogsBtn.addEventListener('click', viewSystemLogs);
  }

  const manageUsersBtn = document.getElementById('manageUsersBtn');
  if (manageUsersBtn) {
    manageUsersBtn.addEventListener('click', manageUsers);
  }

  const changePasswordBtn = document.getElementById('changePasswordBtn');
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', changePassword);
  }

  const downloadDataBtn = document.getElementById('downloadDataBtn');
  if (downloadDataBtn) {
    downloadDataBtn.addEventListener('click', downloadData);
  }
}

// Cargar información del usuario
async function loadUserInfo() {
  try {
    if (typeof getCurrentUser !== 'function') {
      throw new Error('Función getCurrentUser no disponible');
    }
    
    currentUser = await getCurrentUser();
    window.currentUser = currentUser; // Para que lo use Simple2FA
    
    if (!currentUser) {
      window.location.href = 'login.html';
      return;
    }

    // Verificar si es administrador
    const isAdmin = await roleManager.isAdmin();
    
    // Mostrar información del usuario
    const userInfoContainer = document.getElementById('user-info');
    if (userInfoContainer) {
      userInfoContainer.innerHTML = `
        <div class="d-flex align-items-center justify-content-center">
          <div class="text-center">
            <i class="fas fa-user-circle fa-3x text-primary mb-2"></i>
            <h5 class="mb-1">${currentUser.displayName || 'Usuario'}</h5>
            <p class="text-muted mb-0">${currentUser.email}</p>
            ${isAdmin ? '<span class="admin-badge mt-2 d-inline-block"><i class="fas fa-crown me-1"></i>Administrador</span>' : ''}
          </div>
        </div>
      `;
    }

    // Mostrar panel de admin si es necesario
    if (isAdmin) {
      const adminPanel = document.getElementById('admin-panel');
      if (adminPanel) {
        adminPanel.style.display = 'block';
      }
    }

  } catch (error) {
    console.error('Error cargando información del usuario:', error);
    showErrorMessage('Error cargando información del usuario');
  }
}

// Funciones del panel de administrador
function viewSystemLogs() {
  simple2FA.showNotification('Función de logs del sistema en desarrollo', 'info');
}

function manageUsers() {
  simple2FA.showNotification('Gestión de usuarios en desarrollo', 'info');
}

// Otras funciones de configuración
function changePassword() {
  if (confirm('¿Quieres cambiar tu contraseña? Serás redirigido a la página de reset.')) {
    window.location.href = 'reset-password.html';
  }
}

function downloadData() {
  simple2FA.showNotification('Función de descarga de datos en desarrollo', 'info');
}

// Mostrar mensaje de error
function showErrorMessage(message) {
  const userInfoContainer = document.getElementById('user-info');
  if (userInfoContainer) {
    userInfoContainer.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>${message}
      </div>
    `;
  }
}
