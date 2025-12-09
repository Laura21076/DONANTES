// two-factor-init.js - Inicialización de la página de autenticación de dos factores
// Separado para cumplir con CSP (Content Security Policy)

import { setupRecaptcha, send2FACode, verify2FACode, disable2FAFirebase, regenerateBackupCodesFirebase } from './twofa-firebase.js';

// Ejemplo de integración básica para 2FA con Firebase
// Debes adaptar los IDs de los botones y el flujo visual según tu HTML
window.addEventListener('DOMContentLoaded', () => {
  const setupBtn = document.getElementById('setupBtn');
  const verifySetupBtn = document.getElementById('verifySetupBtn');
  const disableBtn = document.getElementById('disableBtn');
  const regenerateBtn = document.getElementById('regenerateBtn');
  let verificationId = null;

  if (setupBtn) {
    setupBtn.addEventListener('click', async () => {
      setupRecaptcha('recaptcha-container', async () => {
        const phone = document.getElementById('phoneInput').value;
        verificationId = await send2FACode(phone);
        showSuccess('Código enviado por SMS');
      });
    });
  }

  if (verifySetupBtn) {
    verifySetupBtn.addEventListener('click', async () => {
      const code = document.getElementById('codeInput').value;
      const result = await verify2FACode(verificationId, code);
      if (result.success) {
        showSuccess('2FA activado correctamente');
        if (result.backupCodes) displayBackupCodes(result.backupCodes);
      } else {
        showError(result.error || 'Código de verificación incorrecto');
      }
    });
  }

  if (disableBtn) {
    disableBtn.addEventListener('click', async () => {
      const codeInput = document.getElementById('disableCode');
      const code = codeInput ? codeInput.value.trim() : '';
      if (!code) {
        showError('Por favor, ingresa un código de verificación');
        return;
      }
      if (!confirm('¿Estás seguro de que quieres deshabilitar 2FA? Esto reducirá la seguridad de tu cuenta.')) {
        return;
      }
      const result = await disable2FAFirebase(code);
      if (result.success) {
        showSuccess('2FA deshabilitado correctamente');
        if (codeInput) codeInput.value = '';
      } else {
        showError(result.error || 'Error al deshabilitar 2FA');
      }
    });
  }

  if (regenerateBtn) {
    regenerateBtn.addEventListener('click', async () => {
      const codeInput = document.getElementById('regenerateCode');
      const code = codeInput ? codeInput.value.trim() : '';
      if (!code || code.length !== 6) {
        showError('Por favor, ingresa un código de 6 dígitos válido');
        return;
      }
      const result = await regenerateBackupCodesFirebase(code);
      if (result.success) {
        displayBackupCodes(result.backupCodes);
        showSuccess('Códigos de respaldo regenerados exitosamente');
        if (codeInput) codeInput.value = '';
      } else {
        showError(result.error || 'Error al regenerar códigos');
      }
    });
  }
});

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

// Exportar funciones para uso global si es necesario (ya no se usan, pero se mantienen para compatibilidad)
window.twoFactorInit = {};
