/**
 * DONANTES - Scripts principales de la página de inicio
 * Separado del HTML para mejor mantenimiento y CSP compliance
 */

// Variables globales para PWA
let deferredPrompt;
const installBtn = document.getElementById('installBtn');

// Funciones de utilidad
function showToast(message, type = 'info', duration = 5000) {
  // Remover toast existente si existe
  const existingToast = document.querySelector('.contact-toast');
  if (existingToast) {
    existingToast.remove();
  }
  // Crear nuevo toast
  const toast = document.createElement('div');
  toast.className = `contact-toast ${type}`;
  toast.innerHTML = `
    <div class="footer-logo-container">
      <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-triangle' : 'fa-info-circle'} me-2"></i>
      <span>${message}</span>
      <button type="button" class="btn-close btn-close-white ms-auto" aria-label="Close"></button>
    </div>
  `;
  // Estilos específicos por tipo
  const styles = {
    success: 'linear-gradient(135deg, #28a745, #20c997)',
    error: 'linear-gradient(135deg, #dc3545, #c82333)',
    info: 'linear-gradient(135deg, #17a2b8, #138496)'
  };
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${styles[type] || styles.info};
    color: white;
    padding: 1rem;
    border-radius: 8px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    z-index: 9999;
    transform: translateX(100%);
    transition: transform 0.3s ease;
    min-width: 300px;
    max-width: 90vw;
  `;
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.transform = 'translateX(0)'; }, 100);
  // Botón cerrar
  const closeBtn = toast.querySelector('.btn-close');
  closeBtn.addEventListener('click', () => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  });
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}
function showInstallNotification() {
  if (!sessionStorage.getItem('install-notification-shown')) {
    sessionStorage.setItem('install-notification-shown', 'true');
    setTimeout(() => { showToast('¡Puedes instalar DONANTES como aplicación!', 'info', 8000); }, 3000);
  }
}
// PWA Installation Management
function initializePWA() {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA instalable detectada');
    e.preventDefault();
    deferredPrompt = e;
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.classList.add('btn-install-available');
      showInstallNotification();
    }
  });
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
          const iosModal = new bootstrap.Modal(document.getElementById('iosInstallModal'));
          iosModal.show();
        } else {
          showToast('La aplicación ya está instalada o no está disponible para instalar', 'info');
        }
        return;
      }
      try {
        const choiceResult = await deferredPrompt.prompt();
        if (choiceResult.outcome === 'accepted') {
          installBtn.style.display = 'none';
          showToast('Instalando aplicación...', 'success');
          localStorage.setItem('pwa-install-requested', 'true');
        }
      } catch (error) {
        showToast('Error durante la instalación', 'error');
      }
      deferredPrompt = null;
    });
  }
  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.style.display = 'none';
    deferredPrompt = null;
    localStorage.removeItem('pwa-install-requested');
    showToast('¡Aplicación instalada exitosamente!', 'success');
    setTimeout(() => {
      if (typeof getCurrentUser === 'function') {
        try {
          const user = getCurrentUser();
          if (user) {
            localStorage.setItem('pwa-redirect-after-install', 'donationcenter');
          }
        } catch {}
      }
    }, 1000);
  });
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    document.body.classList.add('app-pwa');
    if (typeof getCurrentUser === 'function') {
      try {
        const user = getCurrentUser();
        if (user) {
          window.location.replace('donationcenter.html');
        }
      } catch {}
    }
  }
}

function initializeContactForm() {
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.querySelector('.contact-submit-btn');
  if (!contactForm) return;
  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!this.checkValidity()) {
      this.classList.add('was-validated');
      return;
    }
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';
    try {
      const formData = {
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        phone: document.getElementById('contactPhone').value.trim(),
        subject: document.getElementById('contactSubject').value.trim(),
        message: document.getElementById('contactMessage').value.trim()
      };
      const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app';
      const response = await fetch(`${backendUrl}/api/contact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (response.ok) {
        showToast('¡Mensaje enviado exitosamente!', 'success');
        contactForm.reset();
        contactForm.classList.remove('was-validated');
        const inputs = contactForm.querySelectorAll('.form-control');
        inputs.forEach(input => { input.classList.remove('is-valid', 'is-invalid'); });
        contactForm.style.opacity = '0.7';
        setTimeout(() => { contactForm.style.opacity = '1'; }, 500);
      } else {
        showToast(result.error || 'Error enviando el mensaje', 'error');
      }
    } catch {
      showToast('Error de conexión. Verifica tu internet e intenta de nuevo.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Enviar Mensaje';
    }
  });

  const inputs = document.querySelectorAll('.contact-input');
  inputs.forEach(input => {
    input.addEventListener('blur', function() {
      if (this.checkValidity()) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
      } else {
        this.classList.remove('is-valid');
        this.classList.add('is-invalid');
      }
    });
    input.addEventListener('input', function() {
      if (this.classList.contains('is-invalid') && this.checkValidity()) {
        this.classList.remove('is-invalid');
        this.classList.add('is-valid');
      }
    });
  });

  const messageTextarea = document.getElementById('contactMessage');
  if (messageTextarea) {
    const maxLength = messageTextarea.getAttribute('maxlength') || 2000;
    const counterDiv = document.createElement('div');
    counterDiv.className = 'text-end text-muted small mt-1';
    counterDiv.innerHTML = `<span id="messageCounter">0</span>/${maxLength}`;
    messageTextarea.parentNode.appendChild(counterDiv);

    const counter = document.getElementById('messageCounter');
    messageTextarea.addEventListener('input', function() {
      const currentLength = this.value.length;
      counter.textContent = currentLength;
      if (currentLength > maxLength * 0.9) counter.parentNode.classList.add('text-warning');
      else counter.parentNode.classList.remove('text-warning');
    });
  }
}

function initializeQuickContactForm() {
  const quickContactForm = document.getElementById('quickContactForm');
  if (!quickContactForm) return;

  quickContactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    const email = this.querySelector('input[type="email"]').value;
    const message = this.querySelector('textarea').value;
    const subject = 'Contacto desde DONANTES';
    const body = `Hola,%0D%0A%0D%0A${encodeURIComponent(message)}%0D%0A%0D%0ASaludos,%0D%0A${email}`;
    const mailtoLink = `mailto:donantes@proyecto.edu?subject=${encodeURIComponent(subject)}&body=${body}`;
    window.location.href = mailtoLink;
    this.reset();
    const btn = this.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-check me-1"></i>¡Enviado!';
    btn.style.background = 'linear-gradient(135deg, #28a745, #20c997)';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.style.background = 'linear-gradient(135deg, #6E49A3, #8C78BF)';
    }, 3000);
  });
}

function initializeServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              if (confirm('🔄 Nueva versión disponible. ¿Recargar para actualizar?')) {
                window.location.reload();
              }
            }
          });
        });
        navigator.serviceWorker.addEventListener('message', event => {
          console.log('📩 Mensaje del SW:', event.data);
        });
      } catch (error) {
        // Error SW manejado
      }
    });
  }
}

function initializeLegacyPWA() {
  window.deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    window.deferredPrompt = e;
    const installBtn = document.querySelector('.btn-install');
    if (installBtn) {
      installBtn.style.display = 'block';
      installBtn.addEventListener('click', async () => {
        if (window.deferredPrompt) {
          window.deferredPrompt.prompt();
          await window.deferredPrompt.userChoice;
          window.deferredPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  });
  window.addEventListener('appinstalled', () => {
    window.deferredPrompt = null;
  });
}

document.addEventListener('DOMContentLoaded', function() {
  initializePWA();
  initializeContactForm();
  initializeQuickContactForm();
  initializeServiceWorker();
  initializeLegacyPWA();
});
