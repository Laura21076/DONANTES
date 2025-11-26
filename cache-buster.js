// Cache Buster - Fuerza la actualización de archivos estáticos
class CacheBuster {
  constructor() {
    this.version = Date.now(); // Timestamp único para esta sesión
    this.init();
  }

  init() {
    this.bustCSS();
    this.bustJS();
    this.clearBrowserCache();
    console.log('🔄 Cache-busting activado - versión:', this.version);
  }

  // Agregar parámetros de versión a CSS
  bustCSS() {
    const cssLinks = document.querySelectorAll('link[rel="stylesheet"]');
    cssLinks.forEach(link => {
      if (!link.href.includes('?v=')) {
        const separator = link.href.includes('?') ? '&' : '?';
        link.href = `${link.href}${separator}v=${this.version}`;
      }
    });
  }

  // Agregar parámetros de versión a JS modules
  bustJS() {
    const scripts = document.querySelectorAll('script[type="module"]');
    scripts.forEach(script => {
      if (script.src && !script.src.includes('?v=')) {
        const separator = script.src.includes('?') ? '&' : '?';
        script.src = `${script.src}${separator}v=${this.version}`;
      }
    });
  }

  // Limpiar cache del navegador
  clearBrowserCache() {
    // Limpiar localStorage específico de cache
    const cacheKeys = Object.keys(localStorage).filter(key => 
      key.includes('cache') || key.includes('version') || key.includes('timestamp')
    );
    cacheKeys.forEach(key => localStorage.removeItem(key));

    // Forzar recarga de service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE',
        version: this.version
      });
    }
  }

  // Forzar actualización completa
  static forceUpdate() {
    localStorage.setItem('forceReload', Date.now().toString());
    window.location.reload(true);
  }

  // Verificar si necesita actualización
  static checkForUpdates() {
    const lastUpdate = localStorage.getItem('lastUpdate');
    const now = Date.now();
    
    // Si han pasado más de 5 minutos sin actualizar
    if (!lastUpdate || (now - parseInt(lastUpdate)) > 300000) {
      localStorage.setItem('lastUpdate', now.toString());
      return true;
    }
    return false;
  }
}

// Auto-inicializar cache buster
document.addEventListener('DOMContentLoaded', () => {
  new CacheBuster();
});

// Exportar para uso manual
window.CacheBuster = CacheBuster;

export { CacheBuster };