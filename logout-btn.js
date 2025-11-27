// logout-btn.js
// Este archivo se encarga de enlazar el botón de cerrar sesión con la función logout robusta

import { logout } from './auth.js';

document.addEventListener('DOMContentLoaded', () => {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
});
