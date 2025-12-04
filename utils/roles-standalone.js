/**
 * Sistema de Gestión de Roles para DONANTES PWA - Versión Standalone
 * Implementa roles de usuario: admin, user
 * Archivo completamente independiente sin dependencias externas
 */

// Si getCurrentUser NO está global, descomenta la siguiente línea y asegúrate de tener './auth.js' en la raíz.
// import { getCurrentUser } from './auth.js';

// Configuración de roles del sistema
const ROLES_CONFIG = {
    ADMIN: 'admin',
    USER: 'user'
};

// Lista de emails de administradores predefinidos
const ADMIN_EMAILS = [
    'admin@utsc.edu.mx',
    'laura.cardona@utsc.edu.mx', 
    'administrador@utsc.edu.mx',
    // Agregar más emails de administradores aquí
];

// Permisos por acción
const PERMISSIONS_CONFIG = {
    'delete_any_article': 'admin',
    'edit_any_article': 'admin', 
    'view_all_users': 'admin',
    'moderate_content': 'admin',
    'view_analytics': 'admin',
    'manage_categories': 'admin',
    'delete_own_article': 'user',
    'edit_own_article': 'user',
    'create_article': 'user',
    'request_article': 'user',
    'view_profile': 'user',
    'update_profile': 'user'
};

// Funcionalidades disponibles por rol
const FEATURES_CONFIG = {
    user: [
        'create_article',
        'request_article',
        'edit_own_article',
        'delete_own_article',
        'view_profile',
        'update_profile'
    ],
    admin: [
        'create_article',
        'request_article',
        'edit_own_article',
        'delete_own_article',
        'view_profile',
        'update_profile',
        'delete_any_article',
        'edit_any_article',
        'view_all_users',
        'moderate_content',
        'view_analytics',
        'manage_categories'
    ]
};

class RoleManager {
    constructor() {
        this.roles = ROLES_CONFIG;
        this.adminEmails = ADMIN_EMAILS;
        this.permissions = PERMISSIONS_CONFIG;
        this.features = FEATURES_CONFIG;
    }

    /**
     * Obtiene el rol del usuario actual.
     * Cambia getCurrentUser() aquí según cómo obtienes el usuario en tu app.
     */
    async getCurrentUserRole() {
        try {
            // Asegúrate de tener getCurrentUser global o impórtalo arriba
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

    async isAdmin() {
        const role = await this.getCurrentUserRole();
        return role === this.roles.ADMIN;
    }
    async isUser() {
        const role = await this.getCurrentUserRole();
        return role === this.roles.USER;
    }
    async requireAdmin(callback) {
        if (await this.isAdmin()) {
            return callback();
        } else {
            throw new Error('Acceso denegado: Se requieren permisos de administrador');
        }
    }
    async requireAuth(callback) {
        const role = await this.getCurrentUserRole();
        if (role) {
            return callback();
        } else {
            throw new Error('Acceso denegado: Se requiere autenticación');
        }
    }
    async updateUIBasedOnRole() {
        try {
            const isAdmin = await this.isAdmin();
            this.updateAdminElements(isAdmin);
            this.updateUserElements(isAdmin);
            this.updateRoleBadge(isAdmin);
        } catch (error) {
            console.error('Error actualizando UI basada en rol:', error);
        }
    }
    updateAdminElements(isAdmin) {
        const adminElements = document.querySelectorAll('.admin-only');
        adminElements.forEach(element => {
            element.style.display = isAdmin ? 'block' : 'none';
        });
    }
    updateUserElements(isAdmin) {
        const userElements = document.querySelectorAll('.user-only');
        userElements.forEach(element => {
            element.style.display = isAdmin ? 'none' : 'block';
        });
    }
    updateRoleBadge(isAdmin) {
        const roleBadge = document.querySelector('#user-role-badge');
        if (roleBadge) {
            roleBadge.textContent = isAdmin ? 'Administrador' : 'Usuario';
            roleBadge.className = `badge ${isAdmin ? 'bg-warning' : 'bg-primary'}`;
        }
    }
    async hasPermission(action) {
        const isAdmin = await this.isAdmin();
        const requiredRole = this.permissions[action];
        if (!requiredRole) return false;
        if (requiredRole === 'admin') return isAdmin;
        if (requiredRole === 'user') return true;
        return false;
    }
    async getAvailableFeatures() {
        const isAdmin = await this.isAdmin();
        return isAdmin ? this.features.admin : this.features.user;
    }
}

// Instancia global del gestor de roles
const roleManager = new RoleManager();

/**
 * Función auxiliar para verificar si el usuario actual puede realizar una acción
 */
async function canPerformAction(action) {
    return await roleManager.hasPermission(action);
}

/**
 * Función auxiliar para proteger elementos de la UI
 */
function protectElement(elementId, permission) {
    const element = document.getElementById(elementId);
    if (element) {
        roleManager.hasPermission(permission).then(hasPermission => {
            element.style.display = hasPermission ? 'block' : 'none';
        });
    }
}

// Inicialización automática cuando el DOM está listo
document.addEventListener('DOMContentLoaded', () => {
    // Esperar a que Firebase Auth esté listo o un segundo para mayor seguridad
    setTimeout(() => {
        roleManager.updateUIBasedOnRole();
    }, 1000);
});

// Exportar para uso global
window.roleManager = roleManager;
window.canPerformAction = canPerformAction;
window.protectElement = protectElement;
