/**
 * Sistema de Gestión de Roles - Utilidades UI
 * Archivo: roles-ui.js
 */

import { ROLES } from 'roles-config.js';

/**
 * Actualiza la UI basada en el rol del usuario
 */
export async function updateUIBasedOnRole(roleManager) {
    try {
        const isAdmin = await roleManager.isAdmin();
        updateAdminElements(isAdmin);
        updateUserElements(isAdmin);
        updateRoleBadge(isAdmin);
    } catch (error) {
        console.error('Error actualizando UI basada en rol:', error);
    }
}

/**
 * Actualiza elementos visibles solo para administradores
 */
function updateAdminElements(isAdmin) {
    const adminElements = document.querySelectorAll('.admin-only');
    adminElements.forEach(element => {
        element.style.display = isAdmin ? 'block' : 'none';
    });
}

/**
 * Actualiza elementos visibles solo para usuarios regulares
 */
function updateUserElements(isAdmin) {
    const userElements = document.querySelectorAll('.user-only');
    userElements.forEach(element => {
        element.style.display = isAdmin ? 'none' : 'block';
    });
}

/**
 * Actualiza el badge de rol en la interfaz
 */
function updateRoleBadge(isAdmin) {
    const roleBadge = document.querySelector('#user-role-badge');
    if (roleBadge) {
        roleBadge.textContent = isAdmin ? 'Administrador' : 'Usuario';
        roleBadge.className = `badge ${isAdmin ? 'bg-warning' : 'bg-primary'}`;
    }
}

/**
 * Protege un elemento de la UI basado en permisos
 */
export function protectElement(elementId, permission, roleManager) {
    const element = document.getElementById(elementId);
    if (element) {
        roleManager.hasPermission(permission).then(hasPermission => {
            element.style.display = hasPermission ? 'block' : 'none';
        });
    }
}

/**
 * Inicializa la protección de UI cuando el DOM está listo
 */
export function initializeUIProtection(roleManager) {
    // Esperar a que Firebase Auth esté listo
    setTimeout(() => {
        updateUIBasedOnRole(roleManager);
    }, 1000);

}
