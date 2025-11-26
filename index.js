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
  
  // Animar entrada
  setTimeout(() => {
    toast.style.transform = 'translateX(0)';
  }, 100);
  
  // Funcionalidad del botón cerrar
  const closeBtn = toast.querySelector('.btn-close');
  closeBtn.addEventListener('click', () => {
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  });
  
  // Auto remover después de la duración especificada
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }
  }, duration);
}

// Función para mostrar notificación de instalación disponible
function showInstallNotification() {
  // Solo mostrar si no se ha mostrado antes en esta sesión
  if (!sessionStorage.getItem('install-notification-shown')) {
    sessionStorage.setItem('install-notification-shown', 'true');
    
    setTimeout(() => {
      showToast('¡Puedes instalar DONANTES como aplicación!', 'info', 8000);
    }, 3000);
  }
}

// PWA Installation Management
function initializePWA() {
  // Detectar cuando PWA puede ser instalada
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA instalable detectada');
    e.preventDefault();
    deferredPrompt = e;
    
    // Mostrar botón de instalación con animación
    if (installBtn) {
      installBtn.style.display = 'flex';
      installBtn.classList.add('btn-install-available');
      
      // Agregar notificación visual
      showInstallNotification();
    }
  });

  // Manejar click del botón de instalación
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) {
        // Para iOS o dispositivos que no soportan el prompt
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
        console.log('👤 Usuario eligió:', choiceResult.outcome);

        if (choiceResult.outcome === 'accepted') {
          console.log('✅ Usuario aceptó instalar la PWA');
          installBtn.style.display = 'none';
          
          // Mostrar mensaje de instalación en progreso
          showToast('Instalando aplicación...', 'success');
          
          // Guardar estado de instalación
          localStorage.setItem('pwa-install-requested', 'true');
        } else {
          console.log('❌ Usuario rechazó la instalación');
        }
      } catch (error) {
        console.error('❌ Error durante la instalación:', error);
        showToast('Error durante la instalación', 'error');
      }

      deferredPrompt = null;
    });
  }

  // Detectar cuando la app ya está instalada
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA instalada exitosamente');
    if (installBtn) {
      installBtn.style.display = 'none';
    }
    deferredPrompt = null;
    
    // Limpiar estado de instalación pendiente
    localStorage.removeItem('pwa-install-requested');
    
    // Mostrar mensaje de éxito
    showToast('¡Aplicación instalada exitosamente!', 'success');
    
    // Verificar si hay usuario logueado para redirección futura
    setTimeout(() => {
      if (typeof getCurrentUser === 'function') {
        try {
          const user = getCurrentUser();
          if (user) {
            localStorage.setItem('pwa-redirect-after-install', 'donationcenter');
          }
        } catch (error) {
          console.log('Info: No hay usuario logueado actualmente');
        }
      }
    }, 1000);
  });

  // Detectar si se ejecuta como PWA instalada
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
    console.log('🏠 Ejecutándose como PWA instalada');
    document.body.classList.add('app-pwa');
    // Si ya hay usuario autenticado, ir directo a donationcenter
    if (typeof getCurrentUser === 'function') {
      try {
        const user = getCurrentUser();
        if (user) {
          window.location.replace('donationcenter.html');
        }
      } catch (error) {
        console.log('Info: No hay usuario logueado actualmente');
      }
    }
  }
}

// Contact Form Management
function initializeContactForm() {
  const contactForm = document.getElementById('contactForm');
  const submitBtn = document.querySelector('.contact-submit-btn');
  
  if (!contactForm) return;

  contactForm.addEventListener('submit', async function(e) {
    e.preventDefault();
    
    // Validación del lado del cliente
    if (!this.checkValidity()) {
      this.classList.add('was-validated');
      return;
    }
    
    // Deshabilitar botón durante el envío
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Enviando...';
    
    try {
      // Recopilar datos del formulario
      const formData = {
        name: document.getElementById('contactName').value.trim(),
        email: document.getElementById('contactEmail').value.trim(),
        phone: document.getElementById('contactPhone').value.trim(),
        subject: document.getElementById('contactSubject').value.trim(),
        message: document.getElementById('contactMessage').value.trim()
      };
      
      // Enviar al backend
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
        // Mostrar mensaje de éxito
        showToast('¡Mensaje enviado exitosamente!', 'success');
        
        // Limpiar formulario
        contactForm.reset();
        contactForm.classList.remove('was-validated');
        
        // Remover clases de validación
        const inputs = contactForm.querySelectorAll('.form-control');
        inputs.forEach(input => {
          input.classList.remove('is-valid', 'is-invalid');
        });
        
        // Agregar efecto visual de éxito
        contactForm.style.opacity = '0.7';
        setTimeout(() => {
          contactForm.style.opacity = '1';
        }, 500);
        
      } else {
        // Mostrar error específico
        const errorMessage = result.error || 'Error enviando el mensaje';
        showToast(errorMessage, 'error');
        console.error('Error:', result);
      }
      
    } catch (error) {
      console.error('Error de conexión:', error);
      showToast('Error de conexión. Verifica tu internet e intenta de nuevo.', 'error');
    } finally {
      // Restaurar botón
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Enviar Mensaje';
    }
  });

  // Validación en tiempo real para mejorar UX
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
  
  // Contador de caracteres para el mensaje
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
      
      if (currentLength > maxLength * 0.9) {
        counter.parentNode.classList.add('text-warning');
      } else {
        counter.parentNode.classList.remove('text-warning');
      }
    });
  }
}

// Quick Contact Form (Footer) - Legacy support
function initializeQuickContactForm() {
  const quickContactForm = document.getElementById('quickContactForm');
  if (!quickContactForm) return;

  quickContactForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = this.querySelector('input[type="email"]').value;
    const message = this.querySelector('textarea').value;
    
    // Crear enlace mailto
    const subject = 'Contacto desde DONANTES';
    const body = `Hola,%0D%0A%0D%0A${encodeURIComponent(message)}%0D%0A%0D%0ASaludos,%0D%0A${email}`;
    const mailtoLink = `mailto:donantes@proyecto.edu?subject=${encodeURIComponent(subject)}&body=${body}`;
    
    // Abrir cliente de email
    window.location.href = mailtoLink;
    
    // Limpiar formulario
    this.reset();
    
    // Mostrar mensaje de confirmación
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

// Service Worker Registration
function initializeServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('✅ Service Worker registrado exitosamente:', registration.scope);
        
        // Detectar actualizaciones del SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible
              if (confirm('🔄 Nueva versión disponible. ¿Recargar para actualizar?')) {
                window.location.reload();
              }
            }
          });
        });
        
        // Manejar mensajes del Service Worker
        navigator.serviceWorker.addEventListener('message', event => {
          console.log('📩 Mensaje del SW:', event.data);
        });
        
      } catch (error) {
        console.error('❌ Error registrando Service Worker:', error);
      }
    });
  }
}

// Legacy PWA functions for backwards compatibility
function initializeLegacyPWA() {
  // Detectar si la app se puede instalar (PWA)
  window.deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('📱 PWA instalable detectada (legacy)');
    e.preventDefault();
    window.deferredPrompt = e;
    
    // Mostrar botón de instalación personalizado
    const installBtn = document.querySelector('.btn-install');
    if (installBtn) {
      installBtn.style.display = 'block';
      installBtn.addEventListener('click', async () => {
        if (window.deferredPrompt) {
          window.deferredPrompt.prompt();
          const result = await window.deferredPrompt.userChoice;
          console.log('🏠 Resultado instalación PWA:', result.outcome);
          window.deferredPrompt = null;
          installBtn.style.display = 'none';
        }
      });
    }
  });

  // Detectar cuando la PWA se instala
  window.addEventListener('appinstalled', () => {
    console.log('🎉 PWA instalada exitosamente (legacy)');
    window.deferredPrompt = null;
  });
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Inicializando DONANTES Index Scripts');
  
  // Initialize all modules
  initializePWA();
  initializeContactForm();
  initializeQuickContactForm();
  initializeServiceWorker();
  initializeLegacyPWA();
  
  console.log('✅ Scripts de Index cargados correctamente');

});
