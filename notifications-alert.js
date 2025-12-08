// notifications-alert.js
if (window.Notification && Notification.permission === 'denied') {
  alert('Debes habilitar las notificaciones en la configuración de tu navegador para recibir avisos importantes.');
}
