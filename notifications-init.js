// Inicialización automática de notificaciones push en todas las páginas principales
import { initializeNotifications } from 'notifications.js';

window.addEventListener('DOMContentLoaded', () => {
  initializeNotifications();
});

