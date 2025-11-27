// Servicio de notificaciones push para DonantesApp
import { getCurrentUser, getIdToken } from './auth.js';

const API_URL = 'https://donantes-backend-202152301689.northamerica-south1.run.app/api';

// ================== INICIALIZACIÓN DE NOTIFICACIONES ==================

/**
 * Espera a que el Service Worker esté activo
 * @param {ServiceWorkerRegistration} registration 
 * @returns {Promise<ServiceWorkerRegistration>}
 */
async function waitForServiceWorkerActive(registration) {
  // Si ya hay un SW activo, retornamos inmediatamente
  if (registration.active) {
    return registration;
  }

  // Si hay uno instalándose o esperando, esperar a que esté activo
  const sw = registration.installing || registration.waiting;
  if (sw) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        sw.removeEventListener('statechange', onStateChange);
        reject(new Error('Timeout esperando activación del Service Worker'));
      }, 10000); // 10 segundos timeout

      function onStateChange() {
        if (sw.state === 'activated') {
          clearTimeout(timeout);
          sw.removeEventListener('statechange', onStateChange);
          resolve(registration);
        } else if (sw.state === 'redundant') {
          clearTimeout(timeout);
          sw.removeEventListener('statechange', onStateChange);
          reject(new Error('Service Worker se volvió redundante'));
        }
      }

      sw.addEventListener('statechange', onStateChange);
    });
  }

  // Fallback: esperar al evento controllerchange con timeout
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      reject(new Error('Timeout esperando controllerchange del Service Worker'));
    }, 10000); // 10 segundos timeout

    function onControllerChange() {
      clearTimeout(timeout);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      resolve(registration);
    }

    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  });
}

export async function initializeNotifications() {
  try {
    console.log('🔔 Inicializando notificaciones push...');

    // Verificar soporte del navegador
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('❌ Notificaciones push no soportadas en este navegador');
      return false;
    }

    // Registrar service worker si no está registrado
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      try {
        registration = await navigator.serviceWorker.register('sw.js');
        console.log('✅ Service Worker registrado');
      } catch (swError) {
        console.error('❌ Error al registrar Service Worker:', swError);
        return false;
      }
    }

    // IMPORTANTE: Esperar a que el Service Worker esté activo antes de suscribirse
    try {
      registration = await waitForServiceWorkerActive(registration);
      console.log('✅ Service Worker activo y listo');
    } catch (activeError) {
      console.error('❌ Error esperando activación del Service Worker:', activeError);
      return false;
    }

    // Solicitar permiso para notificaciones
    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('⚠️ Permiso de notificaciones denegado');
      return false;
    }

    // Suscribirse a push notifications (ahora el SW está activo)
    const subscription = await subscribeToPush(registration);
    if (subscription) {
      // Enviar suscripción al servidor
      await sendSubscriptionToServer(subscription);
      console.log('✅ Notificaciones push configuradas correctamente');
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Error al configurar notificaciones:', error);
    return false;
  }
}

// ================== PERMISOS Y SUSCRIPCIÓN ==================

async function requestNotificationPermission() {
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  if (Notification.permission === 'default') {
    return await Notification.requestPermission();
  }
  return Notification.permission;
}

async function subscribeToPush(registration) {
  try {
    // Clave pública VAPID 
    const vapidKey = 'BP-PX1TZ9YTrnbPR5ZB6sEEDXp_hdje0jvCQssl6tCWOYCS952lr0v3iLEH4NGwn_NisI4rDBqsn-rxZgr8KgiE';

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey)
    });

    console.log('✅ Suscripción a push obtenida:', subscription);
    return subscription;
  } catch (error) {
    console.error('❌ Error al suscribirse a push:', error);
    return null;
  }
}

// ================== COMUNICACIÓN CON SERVIDOR ==================

async function sendSubscriptionToServer(subscription) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const token = await getIdToken();
    if (!token) {
      throw new Error('Token no disponible');
    }

    // Convert PushSubscription to a plain object for JSON serialization
    const subscriptionData = subscription.toJSON ? subscription.toJSON() : subscription;

    // MEJORA: Log detallado de datos enviados al servidor
    const requestBody = {
      subscription: subscriptionData,
      userId: user.uid
    };
    
    console.log('📤 [NOTIFICATIONS] Enviando suscripción al servidor...');
    console.log('📤 [NOTIFICATIONS] Endpoint:', `${API_URL}/notifications/subscribe`);
    console.log('📤 [NOTIFICATIONS] Body enviado:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestBody)
    });

    // MEJORA: Log detallado de respuesta del servidor
    console.log('📥 [NOTIFICATIONS] Respuesta del servidor:', response.status, response.statusText);
    
    if (!response.ok) {
      // MEJORA: Log completo de errores, especialmente para HTTP 400
      let errorData = {};
      let errorText = '';
      
      try {
        errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch (parseError) {
        errorData = { rawResponse: errorText };
      }
      
      console.error('❌ [NOTIFICATIONS] Error del servidor (HTTP', response.status + ')');
      console.error('❌ [NOTIFICATIONS] Respuesta completa:', errorData);
      console.error('❌ [NOTIFICATIONS] Datos enviados que causaron el error:', requestBody);
      
      // Log específico para errores 400 (Bad Request)
      if (response.status === 400) {
        console.error('❌ [NOTIFICATIONS] ERROR 400 - Bad Request: El body enviado no coincide con lo esperado por el backend');
        console.error('❌ [NOTIFICATIONS] Verifica que el objeto subscription tenga: endpoint, keys.p256dh, keys.auth');
        console.error('❌ [NOTIFICATIONS] subscription.endpoint:', subscriptionData.endpoint);
        console.error('❌ [NOTIFICATIONS] subscription.keys:', subscriptionData.keys);
      }
      
      throw new Error(errorData.error || errorData.message || `Error al enviar suscripción al servidor (HTTP ${response.status})`);
    }

    console.log('✅ [NOTIFICATIONS] Suscripción enviada al servidor exitosamente');
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Error al enviar suscripción:', error.message);
    console.error('❌ [NOTIFICATIONS] Stack trace:', error.stack);
  }
}

// ================== NOTIFICACIONES MANUALES ==================

export async function showLocalNotification(title, options = {}) {
  try {
    if (Notification.permission !== 'granted') {
      console.warn('⚠️ Permisos de notificación no concedidos');
      return;
    }

    const notification = new Notification(title, {
      icon: 'assets/logo.ico',
      badge: 'assets/logo512.png',
      vibrate: [100, 50, 100],
      ...options
    });

    notification.onclick = function(event) {
      event.preventDefault();
      window.focus();
      if (options.url) {
        window.location.href = options.url;
      }
      notification.close();
    };

    return notification;
  } catch (error) {
    console.error('❌ Error al mostrar notificación:', error);
  }
}

// ================== TIPOS ESPECÍFICOS DE NOTIFICACIONES ==================

export async function notifyRequestApproved(articleTitle, accessCode) {
  return showLocalNotification(
    '🎉 ¡Solicitud Aprobada!',
    {
      body: `Tu solicitud para "${articleTitle}" ha sido aprobada. Código: ${accessCode}`,
      tag: 'request-approved',
      url: 'requests.html',
      requireInteraction: true,
      actions: [
        {
          action: 'view-code',
          title: 'Ver Código'
        },
        {
          action: 'find-locker',
          title: 'Ubicar Casillero'
        }
      ]
    }
  );
}

export async function notifyNewRequest(articleTitle, requesterName) {
  return showLocalNotification(
    '📥 Nueva Solicitud',
    {
      body: `${requesterName} está interesado en tu artículo "${articleTitle}"`,
      tag: 'new-request',
      url: 'requests.html',
      actions: [
        {
          action: 'approve',
          title: 'Aprobar'
        },
        {
          action: 'view-details',
          title: 'Ver Detalles'
        }
      ]
    }
  );
}

export async function notifyPickupReminder(articleTitle, hoursLeft) {
  return showLocalNotification(
    '⏰ Recordatorio de Retiro',
    {
      body: `Recuerda retirar "${articleTitle}". Quedan ${hoursLeft} horas.`,
      tag: 'pickup-reminder',
      url: 'requests.html'
    }
  );
}

// ================== UTILIDADES ==================

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ================== GESTIÓN DE ESTADO ==================

export async function isNotificationsEnabled() {
  return Notification.permission === 'granted';
}

export async function unsubscribeFromNotifications() {
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await subscription.unsubscribe();
      console.log('✅ Desuscripción exitosa');
    }
  } catch (error) {
    console.error('❌ Error al desuscribirse:', error);
  }
}

// ================== AUTO-INIT EN PÁGINAS PRINCIPALES ==================

document.addEventListener('DOMContentLoaded', async () => {
  const user = getCurrentUser();
  if (user) {
    setTimeout(() => {
      initializeNotifications();
    }, 2000);
  }
});
