// Toast para notificaciones
export function showToast(type, message) {
  const toast = document.getElementById('toast');
  const toastBody = toast.querySelector('.toast-body');
  
  // Configurar estilo según el tipo con paleta personalizada
  toast.classList.remove('bg-primary', 'bg-success', 'bg-danger');
  toast.style.backgroundColor = '';
  
  switch (type) {
    case 'success':
      toast.style.backgroundColor = '#A992D8'; // Morado claro
      toast.style.color = '#ffffff';
      break;
    case 'error':
      toast.style.backgroundColor = '#6E49A3'; // Morado principal
      toast.style.color = '#ffffff';
      break;
    default:
      toast.style.backgroundColor = '#8C78BF'; // Morado hover
      toast.style.color = '#ffffff';
  }
  
  // Establecer mensaje
  toastBody.textContent = message;
  
  // Mostrar toast
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();
}

// Spinner de carga
export function showSpinner() {
  const spinner = document.createElement('div');
  spinner.id = 'loading-spinner';
  spinner.innerHTML = `
    <div class="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" style="background: rgba(0,0,0,0.5); z-index: 1060;">
      <div class="spinner-border text-light" role="status">
        <span class="visually-hidden">Cargando...</span>
      </div>
    </div>
  `;
  document.body.appendChild(spinner);
}

export function hideSpinner() {
  const spinner = document.getElementById('loading-spinner');
  if (spinner) {
    spinner.remove();
  }
}

// Manejador de errores de autenticación
export function handleAuthError(error) {
  let message = 'Error desconocido. Por favor, intenta de nuevo.';
  
  switch (error.code) {
    case 'SESSION_EXPIRED':
      message = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
      break;
    case 'INVALID_SESSION':
      message = 'Sesión inválida. Por favor, inicia sesión nuevamente.';
      break;
    case 'UNAUTHORIZED':
      message = 'No autorizado. Por favor, inicia sesión.';
      break;
    case 'FORBIDDEN':
      message = 'No tienes permiso para realizar esta acción.';
      break;
    // Agregar más casos según sea necesario
  }

  showToast('error', message);
  
  // Si el error está relacionado con la sesión, redirigir al login
  if (['SESSION_EXPIRED', 'INVALID_SESSION', 'UNAUTHORIZED'].includes(error.code)) {
    setTimeout(() => {
      window.location.href = 'login.html';
    }, 2000);
  }

}
