/**
 * Sistema de Gestión de Roles - Configuración
 * Archivo: roles-config.js
 */

// Configuración de roles del sistema
export const ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

// Lista de emails de administradores predefinidos
export const ADMIN_EMAILS = [
    'donantescontacto@gmail.com',
    'admin@utsc.edu.mx',
    'laura.cardona@utsc.edu.mx',
    'administrador@utsc.edu.mx',
    // Agregar más emails de administradores aquí
];

// Permisos por acción
export const PERMISSIONS = {
    'delete_any_article': 'admin',
    'edit_any_article': 'admin', 
    'view_all_users': 'admin',
    'moderate_content': 'admin',
    'view_analytics': 'admin',
    'manage_categories': 'admin',
    'delete_own_article': 'user', // Todos pueden eliminar sus propios artículos
    'edit_own_article': 'user',   // Todos pueden editar sus propios artículos
    'create_article': 'user',     // Todos pueden crear artículos
    'request_article': 'user',    // Todos pueden solicitar artículos
    'view_profile': 'user',
    'update_profile': 'user'
};

// Funcionalidades disponibles por rol
export const FEATURES = {
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