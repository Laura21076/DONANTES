// Utilidad global para mostrar/ocultar campos de contraseña con ícono
export function togglePasswordVisibility(fieldId, iconId) {
  const field = document.getElementById(fieldId);
  const icon = iconId ? document.getElementById(iconId) : null;
  if (!field) return;
  if (field.type === 'password') {
    field.type = 'text';
    if (icon) {
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    }
  } else {
    field.type = 'password';
    if (icon) {
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }
}

// Hacer disponible en window para HTML inline
window.togglePasswordVisibility = togglePasswordVisibility;
