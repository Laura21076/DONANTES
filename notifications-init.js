// notifications-init.js - Inicialización automática de notificaciones push en todas las páginas principales

import { initializeNotifications } from './notifications.js';

window.addEventListener('DOMContentLoaded', () => {
  // Mostrar alerta si las notificaciones están denegadas
  if (window.Notification && Notification.permission === 'denied') {
    alert('Debes habilitar las notificaciones en la configuración de tu navegador para recibir avisos importantes.');
  }
  initializeNotifications();
});
