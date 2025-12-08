// two-factor-init.js - Inicialización de la página de autenticación de dos factores
// Separado para cumplir con CSP (Content Security Policy)

import { getCurrentUser, getIdToken } from './auth.js';
import { auth } from './firebase.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

let currentUser = null;

// Verificar autenticación al cargar la página y configurar listeners básicos
window.addEventListener('load', async () => {
  try {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        currentUser = user;
        console.log('✅ Usuario autenticado:', user.email);
        setupEventListeners();
      } else {
        console.log('❌ Usuario no autenticado, redirigiendo...');
        window.location.href = 'login.html';
      }
    });
  } catch (error) {
    console.error('Error inicializando página 2FA:', error);
    showError('Error al cargar la página de configuración');
  }
});

function setupEventListeners() {
  const setupBtn = document.getElementById('setupBtn');
  const verifySetupBtn = document.getElementById('verifySetupBtn');
  const disableBtn = document.getElementById('disableBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  
  if (setupBtn) setupBtn.addEventListener('click', setup2FA);
  if (verifySetupBtn) verifySetupBtn.addEventListener('click', verifySetup);
  if (disableBtn) disableBtn.addEventListener('click', disable2FA);
  if (regenerateBtn) regenerateBtn.addEventListener('click', regenerateBackupCodes);
}



async function setup2FA() {
  try {
    showLoading('setupBtn', true);
    
    const token = await getIdToken();
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/auth/2fa/setup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (data.success) {
      // Mostrar sección de verificación
      const qrSection = document.getElementById('qrSection');
      const setupSection = document.getElementById('setupSection');
      
      if (qrSection) {
        qrSection.classList.remove('section-hidden');
        qrSection.style.display = 'block';
      }
      if (setupSection) setupSection.style.display = 'none';
      
      showSuccess('Código enviado a tu correo electrónico. Ingresa el código de 6 dígitos.');
    } else {
      showError(data.error || 'Error al configurar 2FA');
    }
  } catch (error) {
    console.error('Error configurando 2FA:', error);
    showError('Error de conexión al configurar 2FA');
  } finally {
    showLoading('setupBtn', false);
  }
}

async function verifySetup() {
  const codeInput = document.getElementById('verificationCode');
  const code = codeInput ? codeInput.value.trim() : '';
  
  if (!code || code.length !== 6) {
    showError('Por favor, ingresa un código de 6 dígitos válido');
    return;
  }

  try {
    showLoading('verifySetupBtn', true);
    
    const token = await getIdToken();
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/auth/2fa/verify-setup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();
    
    if (data.success) {
      // Mostrar códigos de respaldo si existen
      if (data.backupCodes) {
        displayBackupCodes(data.backupCodes);
        const backupSection = document.getElementById('backupSection');
        if (backupSection) backupSection.style.display = 'block';
      }
      
      const qrSection = document.getElementById('qrSection');
      if (qrSection) qrSection.style.display = 'none';
      
      showSuccess('¡2FA configurado exitosamente! Guarda los códigos de respaldo.');
      
      // Actualizar estado después de un momento
      // Ya no se actualiza automáticamente el estado, simplificado
    } else {
      showError(data.error || 'Código de verificación incorrecto');
    }
  } catch (error) {
    console.error('Error verificando configuración 2FA:', error);
    showError('Error de conexión al verificar código');
  } finally {
    showLoading('verifySetupBtn', false);
  }
}

async function disable2FA() {
  const codeInput = document.getElementById('disableCode');
  const code = codeInput ? codeInput.value.trim() : '';
  
  if (!code) {
    showError('Por favor, ingresa un código de verificación');
    return;
  }

  if (!confirm('¿Estás seguro de que quieres deshabilitar 2FA? Esto reducirá la seguridad de tu cuenta.')) {
    return;
  }

  try {
    showLoading('disableBtn', true);
    
    const token = await getIdToken();
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/auth/2fa/disable`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();
    
    if (data.success) {
      showSuccess('2FA deshabilitado correctamente');
      if (codeInput) codeInput.value = '';
    } else {
      showError(data.error || 'Error al deshabilitar 2FA');
    }
  } catch (error) {
    console.error('Error deshabilitando 2FA:', error);
    showError('Error de conexión al deshabilitar 2FA');
  } finally {
    showLoading('disableBtn', false);
  }
}

async function regenerateBackupCodes() {
  const codeInput = document.getElementById('regenerateCode');
  const code = codeInput ? codeInput.value.trim() : '';
  
  if (!code || code.length !== 6) {
    showError('Por favor, ingresa un código de 6 dígitos válido');
    return;
  }

  try {
    showLoading('regenerateBtn', true);
    
    const token = await getIdToken();
    const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
    const response = await fetch(`${backendUrl}/api/auth/2fa/regenerate-backup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    });

    const data = await response.json();
    
    if (data.success) {
      displayBackupCodes(data.backupCodes);
      const backupSection = document.getElementById('backupSection');
      if (backupSection) backupSection.style.display = 'block';
      if (codeInput) codeInput.value = '';
      showSuccess('Códigos de respaldo regenerados exitosamente');
    } else {
      showError(data.error || 'Error al regenerar códigos');
    }
  } catch (error) {
    console.error('Error regenerando códigos:', error);
    showError('Error de conexión al regenerar códigos');
  } finally {
    showLoading('regenerateBtn', false);
  }
}

function displayBackupCodes(codes) {
  const backupCodesDiv = document.getElementById('backupCodes');
  if (!backupCodesDiv || !Array.isArray(codes)) return;
  
  // Store codes reference for use by button handlers
  backupCodesDiv.dataset.codes = JSON.stringify(codes);
  
  backupCodesDiv.innerHTML = `
    <div class="row g-3">
      ${codes.map((code, index) => `
        <div class="col-md-6">
          <div class="backup-code-item">
            <span class="backup-code-number">${index + 1}.</span>
            <span class="backup-code-text">${code}</span>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="text-center mt-4">
      <button id="downloadBackupCodesBtn" class="btn btn-outline-purple me-2">
        <i class="fas fa-download me-2"></i> Descargar Códigos
      </button>
      <button id="copyAllCodesBtn" class="btn btn-outline-purple">
        <i class="fas fa-copy me-2"></i> Copiar Todos
      </button>
    </div>
  `;
  
  // Use event delegation on the container to avoid memory leaks
  backupCodesDiv.addEventListener('click', handleBackupCodeAction);
}

// Handler for backup code actions using event delegation
function handleBackupCodeAction(event) {
  const target = event.target.closest('button');
  if (!target) return;
  
  const container = document.getElementById('backupCodes');
  const codes = container?.dataset.codes ? JSON.parse(container.dataset.codes) : [];
  
  if (target.id === 'downloadBackupCodesBtn') {
    downloadBackupCodes(codes);
  } else if (target.id === 'copyAllCodesBtn') {
    copyAllCodes(codes);
  }
}

function downloadBackupCodes(codes) {
  const content = `╔════════════════════════════════════════════════╗
║          CÓDIGOS DE RESPALDO - DONANTES        ║
║             AUTENTICACIÓN DE DOS FACTORES      ║
╚════════════════════════════════════════════════╝

📅 Generados: ${new Date().toLocaleString('es-ES')}
👤 Usuario: ${currentUser?.email || 'Usuario'}

🔐 CÓDIGOS DE EMERGENCIA:
${codes.map((code, index) => `${String(index + 1).padStart(2, '0')}. ${code}`).join('\n')}

⚠️  INSTRUCCIONES IMPORTANTES:
• Guarda estos códigos en un lugar seguro y privado
• Cada código solo puede usarse UNA vez
• Úsalos solo si no puedes acceder a tu aplicación de autenticación
• Regenera nuevos códigos si crees que están comprometidos

🛡️  Para tu seguridad, DONANTES nunca te pedirá estos códigos por email o teléfono.

═══════════════════════════════════════════════════════════════════
Sistema de Seguridad DONANTES - ${new Date().getFullYear()}`;
  
  const blob = new Blob([content], { type: 'text/plain; charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `DONANTES_Backup_Codes_${new Date().toISOString().split('T')[0]}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
  
  showSuccess('Códigos de respaldo descargados correctamente');
}

function copyAllCodes(codes) {
  const text = codes.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showSuccess('Códigos copiados al portapapeles');
  }).catch(() => {
    showError('Error al copiar códigos');
  });
}

function showLoading(buttonId, loading) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  
  if (loading) {
    button.disabled = true;
    button.dataset.originalHtml = button.innerHTML;
    const icon = button.querySelector('i');
    if (icon) {
      icon.className = 'fas fa-spinner fa-spin me-2';
    }
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
    }
  }
}

function showSuccess(message) {
  showAlert(message, 'success');
}

function showError(message) {
  showAlert(message, 'error');
}

function showAlert(message, type) {
  // Remover alertas previas
  const existingAlert = document.querySelector('.alert-dismissible');
  if (existingAlert) {
    existingAlert.remove();
  }

  const alertDiv = document.createElement('div');
  const alertClass = type === 'success' ? 'alert-success-custom' : 'alert-danger-custom';
  const iconClass = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
  
  alertDiv.className = `alert ${alertClass} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText = `
    top: 100px; 
    right: 20px; 
    z-index: 9999; 
    max-width: 400px;
    box-shadow: 0 8px 25px rgba(110, 73, 163, 0.25);
    border-radius: 12px;
    border: none;
  `;
  
  alertDiv.innerHTML = `
    <div class="d-flex align-items-center">
      <i class="fas ${iconClass} me-2 alert-icon"></i>
      <span class="alert-message">${message}</span>
      <button type="button" class="btn-close ms-auto alert-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;
  
  document.body.appendChild(alertDiv);
  
  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Exportar funciones para uso global si es necesario
window.twoFactorInit = {
  setup2FA,
  verifySetup,
  disable2FA,
  regenerateBackupCodes
};
