// security-init.js - Inicialización de la página de seguridad
// Separado para cumplir con CSP (Content Security Policy)

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
    if (typeof Simple2FA !== 'undefined') {
      simple2FA = new Simple2FA();
    }
    if (typeof RoleManager !== 'undefined') {
      roleManager = new RoleManager();
    }
    
    // Cargar información del usuario
    await loadUserInfo();
    
    // Crear interfaz de 2FA si existe el contenedor
    const twoFAContainer = document.getElementById('2fa-container');
    if (simple2FA && twoFAContainer) {
      simple2FA.createSetupInterface('2fa-container');
    }
    
    // Configurar event listeners para botones
    setupEventListeners();
    
  } catch (error) {
    console.error('Error inicializando página de seguridad:', error);
    showErrorMessage('Error cargando la configuración de seguridad');
  }
});

// Configurar event listeners
function setupEventListeners() {
  // Botones del panel de administrador
  const viewLogsBtn = document.querySelector('[data-action="view-logs"]');
  const manageUsersBtn = document.querySelector('[data-action="manage-users"]');
  const changePasswordBtn = document.querySelector('[data-action="change-password"]');
  const downloadDataBtn = document.querySelector('[data-action="download-data"]');
  
  if (viewLogsBtn) {
    viewLogsBtn.addEventListener('click', viewSystemLogs);
  }
  if (manageUsersBtn) {
    manageUsersBtn.addEventListener('click', manageUsers);
  }
  if (changePasswordBtn) {
    changePasswordBtn.addEventListener('click', changePassword);
  }
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
    let isAdmin = false;
    if (roleManager && typeof roleManager.isAdmin === 'function') {
      isAdmin = await roleManager.isAdmin();
    }
    
    // Mostrar información del usuario
    const userInfoDiv = document.getElementById('user-info');
    if (userInfoDiv) {
      userInfoDiv.innerHTML = `
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
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel && isAdmin) {
      adminPanel.style.display = 'block';
    }

  } catch (error) {
    console.error('Error cargando información del usuario:', error);
    showErrorMessage('Error cargando información del usuario');
  }
}

// Funciones del panel de administrador
function viewSystemLogs() {
  if (simple2FA && typeof simple2FA.showNotification === 'function') {
    simple2FA.showNotification('Función de logs del sistema en desarrollo', 'info');
  } else {
    alert('Función de logs del sistema en desarrollo');
  }
}

function manageUsers() {
  if (simple2FA && typeof simple2FA.showNotification === 'function') {
    simple2FA.showNotification('Gestión de usuarios en desarrollo', 'info');
  } else {
    alert('Gestión de usuarios en desarrollo');
  }
}

// Otras funciones de configuración
function changePassword() {
  if (confirm('¿Quieres cambiar tu contraseña? Serás redirigido a la página de reset.')) {
    window.location.href = 'reset-password.html';
  }
}

function downloadData() {
  if (simple2FA && typeof simple2FA.showNotification === 'function') {
    simple2FA.showNotification('Función de descarga de datos en desarrollo', 'info');
  } else {
    alert('Función de descarga de datos en desarrollo');
  }
}

// Mostrar mensaje de error
function showErrorMessage(message) {
  const userInfoDiv = document.getElementById('user-info');
  if (userInfoDiv) {
    userInfoDiv.innerHTML = `
      <div class="alert alert-danger">
        <i class="fas fa-exclamation-triangle me-2"></i>${message}
      </div>
    `;
  }
}

// Exportar funciones para uso global
window.securityInit = {
  viewSystemLogs,
  manageUsers,
  changePassword,
  downloadData
};
