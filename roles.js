/**
 * Sistema de Gestión de Roles para DONANTES PWA
 * Implementa roles de usuario: admin, user
 * Archivo principal que coordina la funcionalidad de roles
 */

import { ROLES, ADMIN_EMAILS, PERMISSIONS, FEATURES } from './roles-config.js';
import { updateUIBasedOnRole, protectElement, initializeUIProtection } from './roles-ui.js';

// Si getCurrentUser NO es global, descomenta esto:
// import { getCurrentUser } from './auth.js';

class RoleManager {
    constructor() {
        this.roles = ROLES;
        this.adminEmails = ADMIN_EMAILS;
        this.permissions = PERMISSIONS;
        this.features = FEATURES;
    }

    /**
     * Obtiene el rol del usuario actual
     */
    async getCurrentUserRole() {
        try {
            // Asegúrate de tener getCurrentUser global, o importa arriba
            const user = await getCurrentUser();
            if (!user) return null;
            if (this.adminEmails.includes(user.email.toLowerCase())) {
                return this.roles.ADMIN;
            }
            return this.roles.USER;
        } catch (error) {
            console.error('Error obteniendo rol del usuario:', error);
            return null;
        }
    }

    /**
     * Verifica si el usuario actual es admin
     */
    async isAdmin() {
        const role = await this.getCurrentUserRole();
        return role === this.roles.ADMIN;
    }

    /**
     * Verifica si el usuario actual es usuario regular
     */
    async isUser() {
        const role = await this.getCurrentUserRole();
        return role === this.roles.USER;
    }

    /**
     * Protege una función para que solo admins puedan ejecutarla
     */
    async requireAdmin(callback) {
        if (await this.isAdmin()) {
            return callback();
        } else {
            throw new Error('Acceso denegado: Se requieren permisos de administrador');
        }
    }

    /**
     * Protege una función para que solo usuarios autenticados puedan ejecutarla
     */
    async requireAuth(callback) {
        const role = await this.getCurrentUserRole();
        if (role) {
            return callback();
        } else {
            throw new Error('Acceso denegado: Se requiere autenticación');
        }
    }

    /**
     * Actualiza la UI basada en el rol del usuario
     */
    async updateUIBasedOnRole() {
        return await updateUIBasedOnRole(this);
    }

    /**
     * Verifica permisos para acciones específicas
     */
    async hasPermission(action) {
        const isAdmin = await this.isAdmin();
        const requiredRole = this.permissions[action];
        if (!requiredRole) return false;
        if (requiredRole === 'admin') return isAdmin;
        if (requiredRole === 'user') return true;
        return false;
    }

    /**
     * Obtiene las funcionalidades disponibles para el rol actual
     */
    async getAvailableFeatures() {
        const isAdmin = await this.isAdmin();
        return isAdmin ? this.features.admin : this.features.user;
    }
}

// Instancia global del gestor de roles
const roleManager = new RoleManager();

// Función auxiliar para verificar si el usuario actual puede realizar una acción
async function canPerformAction(action) {
    return await roleManager.hasPermission(action);
}

// Función auxiliar para proteger elementos de la UI
function protectElementWrapper(elementId, permission) {
    protectElement(elementId, permission, roleManager);
}

// Inicialización automática cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    initializeUIProtection(roleManager);
});

// Exportar para uso global
window.roleManager = roleManager;
window.canPerformAction = canPerformAction;
window.protectElement = protectElementWrapper;
