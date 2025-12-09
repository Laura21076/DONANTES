// notifications-init.js - Inicialización automática de notificaciones push en todas las páginas principales

import { initializeNotifications } from './notifications.js';

window.addEventListener('DOMContentLoaded', () => {
  // Solo inicializar notificaciones en background, sin mostrar alertas ni pedir permisos visuales
  initializeNotifications();
});
