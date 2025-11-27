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
  // Si ya hay un service worker activo, retornarlo
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
  // Esperar a que el SW esté activo
  return new Promise((resolve, reject) => {
    const sw = registration.installing || registration.waiting;
    
    if (!sw) {
      reject(new Error('No hay Service Worker instalándose o esperando'));
      return;
    }

    const timeout = setTimeout(() => {
      reject(new Error('Timeout esperando activación del Service Worker'));
    }, 10000); // 10 segundos timeout - más razonable para UX

    sw.addEventListener('statechange', function handler() {
      if (sw.state === 'activated') {
        clearTimeout(timeout);
        sw.removeEventListener('statechange', handler);
        resolve(registration);
      } else if (sw.state === 'redundant') {
        clearTimeout(timeout);
        sw.removeEventListener('statechange', handler);
        reject(new Error('Service Worker se volvió redundante'));
      }
    });
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

    // Esperar a que el Service Worker esté activo antes de continuar
    registration = await waitForServiceWorkerActive(registration);
    console.log('✅ Service Worker activo');

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

    const response = await fetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        subscription: subscriptionData,
        userId: user.uid
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('⚠️ Respuesta del servidor:', response.status, errorData);
      throw new Error(errorData.error || 'Error al enviar suscripción al servidor');
    }

    console.log('✅ Suscripción enviada al servidor');
  } catch (error) {
    console.error('❌ Error al enviar suscripción:', error);
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
