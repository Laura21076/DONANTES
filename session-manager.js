// Session Manager - Gestión de sesiones para PWA
import { getCurrentUser } from '../services/auth.js';

class SessionManager {
  constructor() {
    this.STORAGE_KEYS = {
      LAST_VISIT: 'lastVisit',
      USER_SESSION: 'userSession',
      PWA_INSTALLED: 'pwaInstalled',
      DEVICE_INFO: 'deviceInfo'
    };
    
    this.init();
  }

  init() {
    this.detectDevice();
    this.handlePWAInstall();
    this.checkUserSession();
  }

  // Detectar información del dispositivo
  detectDevice() {
    const deviceInfo = {
      isMobile: /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isTablet: /iPad|Android.*tablet/i.test(navigator.userAgent),
      isDesktop: !/Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
      isPWA: window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone,
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      screenSize: {
        width: window.screen.width,
        height: window.screen.height
      }
    };

    localStorage.setItem(this.STORAGE_KEYS.DEVICE_INFO, JSON.stringify(deviceInfo));
    console.log('📱 Información del dispositivo:', deviceInfo);
    return deviceInfo;
  }

  // Manejar instalación de PWA - SIMPLIFICADO
  handlePWAInstall() {
    // Detectar si la app se está ejecutando como PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
      console.log('🏠 PWA detectada');
      localStorage.setItem(this.STORAGE_KEYS.PWA_INSTALLED, 'true');
      
      // PWA simple - no redirecciones automáticas complejas
    }

    // Escuchar eventos de instalación
    window.addEventListener('appinstalled', () => {
      console.log('🎉 PWA instalada exitosamente');
      localStorage.setItem(this.STORAGE_KEYS.PWA_INSTALLED, 'true');
      this.showInstallSuccessMessage();
    });
  }

  // Manejar lanzamiento de PWA instalada - REDIRECCIONES DESACTIVADAS
  async handlePWALaunch() {
    try {
      const currentUser = getCurrentUser();
      const now = new Date().toISOString();

      if (currentUser) {
        console.log('✅ Usuario autenticado encontrado - NO redirigiendo automáticamente');
        
        // Solo guardar información de sesión, SIN redirecciones
        const sessionInfo = {
          userId: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          lastLogin: now,
          isPWA: true
        };
        
        localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionInfo));
        localStorage.setItem(this.STORAGE_KEYS.LAST_VISIT, now);
        
        console.log('💾 Sesión guardada - Usuario puede navegar libremente');
      } else {
        console.log('❌ No hay usuario autenticado - SIN redirecciones automáticas');
        // NO redirigir automáticamente - dejar que el usuario controle la navegación
      }
    } catch (error) {
      console.error('❌ Error al manejar lanzamiento de PWA:', error);
    }
  }

  // Verificar sesión de usuario
  checkUserSession() {
    try {
      const currentUser = getCurrentUser();
      const sessionInfo = localStorage.getItem(this.STORAGE_KEYS.USER_SESSION);
      
      if (currentUser && sessionInfo) {
        const session = JSON.parse(sessionInfo);
        
        // Actualizar última visita
        session.lastVisit = new Date().toISOString();
        localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
        
        console.log('📊 Sesión de usuario activa:', session);
        return session;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error al verificar sesión:', error);
      return null;
    }
  }

  // Limpiar sesión
  clearSession() {
    localStorage.removeItem(this.STORAGE_KEYS.USER_SESSION);
    localStorage.removeItem(this.STORAGE_KEYS.LAST_VISIT);
    console.log('🧹 Sesión limpiada');
  }

  // Método alternativo para compatibilidad con script.js
  clearUserSession() {
    console.log('🧹 Limpiando sesión de usuario...');
    this.clearSession();
    // NO redirigir automáticamente - dejar que el usuario navegue
  }

  // Obtener información del dispositivo
  getDeviceInfo() {
    const deviceInfo = localStorage.getItem(this.STORAGE_KEYS.DEVICE_INFO);
    return deviceInfo ? JSON.parse(deviceInfo) : null;
  }

  // Verificar si es PWA instalada
  isPWAInstalled() {
    return localStorage.getItem(this.STORAGE_KEYS.PWA_INSTALLED) === 'true';
  }

  // Mostrar mensaje de instalación exitosa
  showInstallSuccessMessage() {
    const message = document.createElement('div');
    message.className = 'pwa-install-success';
    message.innerHTML = `
      <div class="alert alert-success alert-dismissible fade show position-fixed top-0 start-50 translate-middle-x mt-3" style="z-index: 9999;">
        <div class="d-flex align-items-center">
          <i class="fas fa-check-circle me-3 text-success"></i>
          <div>
            <strong>¡Aplicación instalada!</strong><br>
            <small>Ya puedes usar DONANTES desde tu pantalla de inicio</small>
          </div>
        </div>
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
      </div>
    `;
    
    document.body.appendChild(message);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 5000);
  }

  // Método requerido por script.js
  onDOMLoaded() {
    console.log('📄 DOM cargado - SessionManager listo');
    this.adaptUIToDevice();
    
    // Ejecutar verificaciones adicionales cuando DOM esté listo
    try {
      this.checkUserSession();
      this.detectDevice();
    } catch (error) {
      console.error('❌ Error en onDOMLoaded:', error);
    }
  }

  // Método requerido por script.js para inicializar sesión de usuario
  initializeUserSession(user) {
    console.log('👤 Inicializando sesión de usuario:', user?.email);
    
    try {
      if (user) {
        const sessionInfo = {
          userId: user.uid,
          email: user.email,
          displayName: user.displayName || 'Usuario',
          lastLogin: new Date().toISOString(),
          isPWA: this.isPWAInstalled()
        };
        
        localStorage.setItem(this.STORAGE_KEYS.USER_SESSION, JSON.stringify(sessionInfo));
        localStorage.setItem(this.STORAGE_KEYS.LAST_VISIT, new Date().toISOString());
        
        console.log('✅ Sesión de usuario inicializada correctamente');
        return sessionInfo;
      } else {
        console.log('❌ No se proporcionó usuario para inicializar sesión');
        this.clearSession();
        return null;
      }
    } catch (error) {
      console.error('❌ Error al inicializar sesión de usuario:', error);
      return null;
    }
  }

  // Adaptar UI según dispositivo
  adaptUIToDevice() {
    const deviceInfo = this.getDeviceInfo();
    
    if (deviceInfo) {
      // Agregar clases CSS según el dispositivo
      document.body.classList.add(
        deviceInfo.isMobile ? 'device-mobile' : 'device-desktop',
        deviceInfo.isPWA ? 'app-pwa' : 'app-browser'
      );

      // Ajustar viewport para móviles
      if (deviceInfo.isMobile) {
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
          viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
        }
      }

      console.log('🎨 UI adaptada para:', {
        tipo: deviceInfo.isMobile ? 'Móvil' : 'Escritorio',
        modo: deviceInfo.isPWA ? 'PWA' : 'Navegador'
      });
    }
  }
}

// Inicializar Session Manager
const sessionManager = new SessionManager();

// Exportar para uso global
window.sessionManager = sessionManager;

export default SessionManager;
export { SessionManager };