// Protección de páginas - Mensajes claros para usuarios no autenticados
class AuthGuard {
  static checkAccess(pageName = 'esta página') {
    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    const hasTokens = localStorage.getItem('access_token') && localStorage.getItem('refresh_token');
    
    if (!user || !hasTokens) {
      this.showAccessDenied(pageName);
      return false;
    }
    
    return true;
  }
  
  static showAccessDenied(pageName) {
    // Crear modal de acceso denegado
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = 'accessDeniedModal';
    modal.setAttribute('data-bs-backdrop', 'static');
    modal.setAttribute('data-bs-keyboard', 'false');
    
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Acceso Restringido
            </h5>
          </div>
          <div class="modal-body text-center">
            <div class="alert alert-warning">
              <h6><strong>No puedes acceder a ${pageName}</strong></h6>
              <p>Debes iniciar sesión para continuar</p>
            </div>
            <p class="text-muted">
              Tu sesión ha expirado o no tienes los permisos necesarios.
            </p>
          </div>
          <div class="modal-footer justify-content-center">
            <button type="button" class="btn btn-primary" onclick="AuthGuard.redirectToLogin()">
              <i class="fas fa-sign-in-alt me-2"></i>
              Iniciar Sesión
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
    
    // Auto-redirigir después de 5 segundos
    setTimeout(() => {
      this.redirectToLogin();
    }, 5000);
  }
  
  static redirectToLogin() {
    window.location.replace('./login.html');
  }
  
  static protectPage(pageName) {
    document.addEventListener('DOMContentLoaded', () => {
      if (!this.checkAccess(pageName)) {
        // Ocultar contenido de la página
        document.body.style.display = 'none';
      }
    });
  }
}

// Hacer disponible globalmente
window.AuthGuard = AuthGuard;

export { AuthGuard };