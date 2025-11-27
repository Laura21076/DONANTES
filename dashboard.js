// admin-dashboard-firebase.js

import { getCurrentUser } from './auth.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase.js';
// Si deseas importar tu roleManager explícitamente, descomenta la siguiente línea y ajusta el nombre:
// import { roleManager } from './roles.js';

/**
 * Dashboard de Administrador - DONANTES PWA
 * Funcionalidades específicas para administradores del sistema
 */

class AdminDashboard {
    constructor() {
        this.currentUser = null;
        this.isAdminUser = false;
        this.stats = {
            totalUsers: 0,
            totalArticles: 0,
            completedDonations: 0,
            pendingReports: 0
        };

        this.init();
    }

    async init() {
        try {
            // Verificar autenticación y rol de administrador
            await this.checkAdminAccess();

            if (!this.isAdminUser) {
                // Redirigir a usuario no autorizado
                window.location.href = 'donationcenter.html';
                return;
            }

            // Cargar datos del dashboard
            await this.loadDashboardData();

            // Actualizar UI
            this.updateUI();

            // Ocultar loading screen
            this.hideLoadingScreen();

        } catch (error) {
            console.error('Error inicializando dashboard de administrador:', error);
            this.hideLoadingScreen();
        }
    }

    async checkAdminAccess() {
        try {
            this.currentUser = await getCurrentUser();
            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }

            // Verificar si es administrador usando el sistema de roles
            // Si roleManager está en window, usa window.roleManager
            if (window.roleManager) {
                this.isAdminUser = await window.roleManager.isAdmin();
            }
            // Si usas import { roleManager } from './roles.js', entonces sería:
            // this.isAdminUser = await roleManager.isAdmin();

            if (!this.isAdminUser) {
                this.showAccessDenied();
                return;
            }

            // Actualizar badge de usuario
            this.updateUserInfo();

        } catch (error) {
            console.error('Error verificando acceso de administrador:', error);
            window.location.href = 'login.html';
        }
    }

    showAccessDenied() {
        document.body.innerHTML = `
            <div class="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
                <div class="text-center">
                    <div class="mb-4">
                        <i class="bi bi-shield-x text-danger" style="font-size: 4rem;"></i>
                    </div>
                    <h2 class="text-danger mb-3">Acceso Denegado</h2>
                    <p class="lead text-muted mb-4">No tienes permisos de administrador para acceder a esta página.</p>
                    <div class="d-flex gap-3 justify-content-center">
                        <button class="btn btn-primary btn-go-home">
                            <i class="bi bi-house-fill me-2"></i>Ir al Dashboard Principal
                        </button>
                        <button class="btn btn-outline-secondary btn-logout-denied">
                            <i class="bi bi-box-arrow-right me-2"></i>Cerrar Sesión
                        </button>
                    </div>
                </div>
            </div>
        `;
        // Attach event listeners for access denied buttons
        const goHomeBtn = document.querySelector('.btn-go-home');
        if (goHomeBtn) {
            goHomeBtn.addEventListener('click', function() {
                window.location.href = 'donationcenter.html';
            });
        }
        const logoutDeniedBtn = document.querySelector('.btn-logout-denied');
        if (logoutDeniedBtn) {
            logoutDeniedBtn.addEventListener('click', function() {
                logout();
            });
        }
    }

    async loadDashboardData() {
        try {
            // Simular carga de datos (en producción, estos vendrían de la API)
            await this.loadUserStats();
            await this.loadArticleStats();
            await this.loadDonationStats();
            await this.loadReportStats();
            await this.loadRecentActivity();

        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
        }
    }

    async loadUserStats() {
        try {
            this.stats.totalUsers = 156; // Simulated data

            // TODO: Implementar consulta real a Firestore
            // const usersSnapshot = await getDocs(collection(db, 'users'));
            // this.stats.totalUsers = usersSnapshot.size;
        } catch (error) {
            console.error('Error cargando estadísticas de usuarios:', error);
        }
    }

    async loadArticleStats() {
        try {
            this.stats.totalArticles = 89; // Simulated data

            // TODO: Implementar consulta real a Firestore
            // const articlesSnapshot = await getDocs(collection(db, 'articles'));
            // this.stats.totalArticles = articlesSnapshot.size;
        } catch (error) {
            console.error('Error cargando estadísticas de artículos:', error);
        }
    }

    async loadDonationStats() {
        try {
            this.stats.completedDonations = 67; // Simulated data
        } catch (error) {
            console.error('Error cargando estadísticas de donaciones:', error);
        }
    }

    async loadReportStats() {
        try {
            this.stats.pendingReports = 3; // Simulated data
        } catch (error) {
            console.error('Error cargando estadísticas de reportes:', error);
        }
    }

    async loadRecentActivity() {
        // Simular actividad reciente
        const activities = [
            {
                type: 'user_registration',
                message: 'Nuevo usuario registrado: maria.gonzalez@utsc.edu.mx',
                time: '2 minutos',
                icon: 'bi-person-plus-fill',
                color: 'success'
            },
            {
                type: 'article_published',
                message: 'Artículo publicado: "Laptop DELL en buen estado"',
                time: '15 minutos',
                icon: 'bi-heart-fill',
                color: 'primary'
            },
            {
                type: 'donation_completed',
                message: 'Donación completada: "Libros de Programación"',
                time: '1 hora',
                icon: 'bi-check-circle-fill',
                color: 'success'
            },
            {
                type: 'report_submitted',
                message: 'Reporte de contenido inapropiado',
                time: '2 horas',
                icon: 'bi-flag-fill',
                color: 'warning'
            },
            {
                type: 'user_verified',
                message: 'Usuario verificado: carlos.rodriguez@utsc.edu.mx',
                time: '3 horas',
                icon: 'bi-shield-check',
                color: 'info'
            }
        ];

        this.renderRecentActivity(activities);
    }

    renderRecentActivity(activities) {
        const container = document.getElementById('recent-activity');
        if (!container) return;

        container.innerHTML = activities.map(activity => `
            <div class="list-group-item list-group-item-action d-flex align-items-center">
                <div class="me-3">
                    <i class="bi ${activity.icon} text-${activity.color}" style="font-size: 1.5rem;"></i>
                </div>
                <div class="flex-grow-1">
                    <div class="fw-semibold">${activity.message}</div>
                    <small class="text-muted">Hace ${activity.time}</small>
                </div>
                <div class="text-end">
                    <small class="text-muted">${activity.time}</small>
                </div>
            </div>
        `).join('');
    }

    updateUI() {
        // Actualizar estadísticas en la UI
        this.updateElement('total-users', this.stats.totalUsers);
        this.updateElement('total-articles', this.stats.totalArticles);
        this.updateElement('completed-donations', this.stats.completedDonations);
        this.updateElement('pending-reports', this.stats.pendingReports);

        // Actualizar mensaje de bienvenida
        const welcomeMessage = document.getElementById('welcome-message');
        if (welcomeMessage && this.currentUser) {
            welcomeMessage.textContent = `Bienvenido al panel administrativo, ${this.currentUser.email}`;
        }
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            // Animación de conteo
            this.animateCounter(element, 0, value, 1000);
        }
    }

    animateCounter(element, start, end, duration) {
        const range = end - start;
        const minTimer = 50;
        const stepTime = Math.abs(Math.floor(duration / range));
        const timer = stepTime < minTimer ? minTimer : stepTime;

        let current = start;
        const increment = end > start ? 1 : -1;

        const counter = setInterval(() => {
            current += increment;
            element.textContent = current;

            if (current === end) {
                clearInterval(counter);
            }
        }, timer);
    }

    updateUserInfo() {
        if (this.currentUser) {
            const roleBadge = document.getElementById('user-role-badge');
            if (roleBadge) {
                roleBadge.textContent = 'Administrador';
                roleBadge.className = 'badge bg-danger user-role-badge';
            }
        }
    }

    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'none';
        }
    }
}

// Funciones para las acciones del dashboard
async function viewAllUsers() {
    try {
        alert('Función en desarrollo: Gestión de Usuarios\n\nEsta función permitirá:\n- Ver todos los usuarios registrados\n- Activar/desactivar cuentas\n- Verificar usuarios\n- Ver estadísticas de actividad');
    } catch (error) {
        console.error('Error abriendo gestión de usuarios:', error);
    }
}

async function moderateContent() {
    try {
        alert('Función en desarrollo: Moderación de Contenido\n\nEsta función permitirá:\n- Revisar reportes de contenido\n- Aprobar/rechazar artículos\n- Eliminar contenido inapropiado\n- Enviar notificaciones a usuarios');
    } catch (error) {
        console.error('Error abriendo moderación:', error);
    }
}

async function viewAnalytics() {
    try {
        alert('Función en desarrollo: Analíticas\n\nEsta función mostrará:\n- Estadísticas de uso\n- Gráficos de donaciones por período\n- Usuarios más activos\n- Categorías más populares\n- Reportes de rendimiento');
    } catch (error) {
        console.error('Error abriendo analíticas:', error);
    }
}

// Función de logout
async function logout() {
    try {
        if (confirm('¿Estás seguro que deseas cerrar sesión?')) {
            await signOut(auth);
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        alert('Error al cerrar sesión. Inténtalo de nuevo.');
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Attach event listeners for dashboard buttons (CSP compatible)
    attachDashboardEventListeners();
    
    setTimeout(() => {
        new AdminDashboard();
    }, 1500);
});

// Attach event listeners for dashboard buttons (CSP compatible)
function attachDashboardEventListeners() {
    // Logout button
    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            logout();
        });
    }

    // Quick action buttons
    document.querySelectorAll('.btn-view-all-users').forEach(btn => {
        btn.addEventListener('click', function() {
            viewAllUsers();
        });
    });

    document.querySelectorAll('.btn-moderate-content').forEach(btn => {
        btn.addEventListener('click', function() {
            moderateContent();
        });
    });

    document.querySelectorAll('.btn-view-analytics').forEach(btn => {
        btn.addEventListener('click', function() {
            viewAnalytics();
        });
    });

    document.querySelectorAll('.btn-go-donations').forEach(btn => {
        btn.addEventListener('click', function() {
            window.location.href = 'donationcenter.html';
        });
    });

    // Admin panel buttons
    document.querySelectorAll('.btn-admin-users').forEach(btn => {
        btn.addEventListener('click', function() {
            viewAllUsers();
        });
    });

    document.querySelectorAll('.btn-admin-moderate').forEach(btn => {
        btn.addEventListener('click', function() {
            moderateContent();
        });
    });

    document.querySelectorAll('.btn-admin-analytics').forEach(btn => {
        btn.addEventListener('click', function() {
            viewAnalytics();
        });
    });
}

// Hacer funciones disponibles globalmente
window.viewAllUsers = viewAllUsers;
window.moderateContent = moderateContent;
window.viewAnalytics = viewAnalytics;
window.logout = logout;
