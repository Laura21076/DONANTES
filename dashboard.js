// admin-dashboard-firebase.js

import { getCurrentUser } from './auth.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { auth } from './firebase.js';
import { getArticles, approveArticle } from './articles-firebase.js';
import { getUserProfile } from './profile-firebase.js';
import { getMySentRequests, getMyReceivedRequests } from './requests.js';
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
            // Simulación: admin si el email termina en @admin.com
            this.isAdminUser = this.currentUser.email && this.currentUser.email.endsWith('@admin.com');
            if (!this.isAdminUser) {
                window.location.href = 'donationcenter.html';
                return;
            }
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

    async loadProfile() {
        try {
            const profile = await getUserProfile();
            // Renderizar perfil en el dashboard (puedes personalizar el HTML)
            const profileDiv = document.getElementById('admin-profile-section');
            if (profileDiv) {
                profileDiv.innerHTML = `
                    <div class="dashboard-card p-3 mb-3">
                        <h4 class="text-purple mb-2"><i class="bi bi-person-circle me-2"></i>Perfil Administrador</h4>
                        <div class="d-flex align-items-center">
                            <img src="${profile.photoURL || 'assets/default-profile.png'}" alt="Foto" class="rounded-circle me-3" width="64" height="64">
                            <div>
                                <strong>${profile.displayName || 'Sin nombre'}</strong><br>
                                <span class="text-muted">${profile.email || ''}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error cargando perfil:', error);
        }
    }

    async loadRequests() {
        try {
            const sent = await getMySentRequests();
            const received = await getMyReceivedRequests();
            // Renderizar solicitudes en el dashboard (puedes personalizar el HTML)
            const requestsDiv = document.getElementById('admin-requests-section');
            if (requestsDiv) {
                let html = `<div class="dashboard-card p-3 mb-3">
                    <h4 class="text-purple mb-2"><i class="bi bi-envelope-heart me-2"></i>Solicitudes</h4>
                    <div class="row">
                        <div class="col-md-6">
                            <h6 class="mb-2">Enviadas</h6>
                            <ul class="list-group mb-3">
                                ${sent.length === 0 ? '<li class="list-group-item text-muted">Sin solicitudes enviadas</li>' : sent.map(r => `<li class="list-group-item">${r.descripcion || 'Sin descripción'}</li>`).join('')}
                            </ul>
                        </div>
                        <div class="col-md-6">
                            <h6 class="mb-2">Recibidas</h6>
                            <ul class="list-group mb-3">
                                ${received.length === 0 ? '<li class="list-group-item text-muted">Sin solicitudes recibidas</li>' : received.map(r => `<li class="list-group-item">${r.descripcion || 'Sin descripción'}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>`;
                requestsDiv.innerHTML = html;
            }
        } catch (error) {
            console.error('Error cargando solicitudes:', error);
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
            await this.loadProfile();
            await this.loadRequests();

        } catch (error) {
            console.error('Error cargando datos del dashboard:', error);
        }
    }

    async loadUserStats() {
        try {
            // Consulta real a Firestore (usuarios)
            // Requiere que tengas la colección 'usuarios' en Firestore
            const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js');
            const { app } = await import('./firebase.js');
            const db = getFirestore(app);
            const usersSnapshot = await getDocs(collection(db, 'usuarios'));
            this.stats.totalUsers = usersSnapshot.size;
            console.log('Usuarios totales:', this.stats.totalUsers);
        } catch (error) {
            console.error('Error cargando estadísticas de usuarios:', error);
            this.stats.totalUsers = 0;
        }
    }

    async loadArticleStats() {
        try {
            // Obtener todos los artículos reales desde Firestore
            const articles = await getArticles(this.isAdminUser);
            this.stats.totalArticles = articles.length;
            this.pendingArticles = this.isAdminUser ? articles.filter(a => a.status === 'pendiente') : [];
            console.log('Artículos:', articles);
            if (this.isAdminUser) this.renderPendingArticles();
        } catch (error) {
            console.error('Error cargando artículos:', error);
            this.stats.totalArticles = 0;
        }
    }

    async loadDonationStats() {
        try {
            // Si tienes una colección 'donaciones', consulta real aquí
            // const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js');
            // const { app } = await import('./firebase.js');
            // const db = getFirestore(app);
            // const donationsSnapshot = await getDocs(collection(db, 'donaciones'));
            // this.stats.completedDonations = donationsSnapshot.size;
            this.stats.completedDonations = 0; // Si no tienes la colección, dejar en 0
        } catch (error) {
            console.error('Error cargando estadísticas de donaciones:', error);
            this.stats.completedDonations = 0;
        }
    }

    async loadReportStats() {
        try {
            // Si tienes una colección 'reportes', consulta real aquí
            // const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js');
            // const { app } = await import('./firebase.js');
            // const db = getFirestore(app);
            // const reportsSnapshot = await getDocs(collection(db, 'reportes'));
            // this.stats.pendingReports = reportsSnapshot.size;
            this.stats.pendingReports = 0; // Si no tienes la colección, dejar en 0
        } catch (error) {
            console.error('Error cargando estadísticas de reportes:', error);
            this.stats.pendingReports = 0;
        }
    }

    async loadRecentActivity() {
        // Si tienes una colección 'actividad', consulta real aquí
        // const { getFirestore, collection, getDocs } = await import('https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js');
        // const { app } = await import('./firebase.js');
        // const db = getFirestore(app);
        // const activitySnapshot = await getDocs(collection(db, 'actividad'));
        // const activities = activitySnapshot.docs.map(doc => doc.data());
        // this.renderRecentActivity(activities);
        this.renderRecentActivity([]); // Si no tienes la colección, dejar vacío
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

    renderPendingArticles() {
        // Crear sección visual para artículos pendientes
        const adminPanel = document.querySelector('.admin-panel');
        if (!adminPanel) return;
        let html = `
            <h4 class="text-purple mt-4 mb-3">
                <i class="bi bi-hourglass-split me-2"></i>Artículos Pendientes de Revisión
            </h4>
            <div class="list-group mb-4">
        `;
        if (this.pendingArticles.length === 0) {
            html += `<div class="text-center text-muted py-3">No hay artículos pendientes.</div>`;
        } else {
            this.pendingArticles.forEach(art => {
                html += `
                    <div class="list-group-item d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-2">
                        <div>
                            <strong class="text-dark">${art.titulo || 'Sin título'}</strong>
                            <span class="badge bg-warning ms-2">Pendiente</span>
                            <div class="text-muted small">${art.descripcion || ''}</div>
                        </div>
                        <button class="btn btn-success btn-sm mt-2 mt-md-0 approve-btn" data-id="${art.id}">
                            <i class="bi bi-check-circle me-1"></i>Aprobar y Publicar
                        </button>
                    </div>
                `;
            });
        }
        html += `</div>`;
        // Insertar en el panel admin
        const oldSection = adminPanel.querySelector('.pending-articles-section');
        if (oldSection) oldSection.remove();
        const section = document.createElement('div');
        section.className = 'pending-articles-section';
        section.innerHTML = html;
        adminPanel.appendChild(section);
        // Event listeners para aprobar
        section.querySelectorAll('.approve-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = btn.getAttribute('data-id');
                btn.disabled = true;
                btn.innerHTML = '<i class="bi bi-arrow-repeat me-1"></i>Procesando...';
                try {
                    await approveArticle(id);
                    btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Publicado';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-secondary');
                    btn.disabled = true;
                } catch (err) {
                    btn.innerHTML = '<i class="bi bi-x-circle me-1"></i>Error';
                    btn.classList.remove('btn-success');
                    btn.classList.add('btn-danger');
                    setTimeout(() => { btn.innerHTML = '<i class="bi bi-check-circle me-1"></i>Aprobar y Publicar'; btn.classList.remove('btn-danger'); btn.classList.add('btn-success'); btn.disabled = false; }, 2000);
                }
            });
        });
    }

    renderLockerInfo(lockerCode) {
        const lockerDiv = document.getElementById('lockerInfo');
        if (lockerDiv) {
            lockerDiv.innerHTML = `
                <div class="alert alert-info mt-3">
                    <strong>Código de Locker/Caja Fuerte:</strong> <span class="fs-4">${lockerCode}</span><br>
                    <span>Usa este código para dejar o recoger el artículo.</span>
                </div>
                <div class="mt-3 text-center">
                    <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3595.3651338348855!2d-100.51443152638271!3d25.69233201147141!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x86629ecd749f16df%3A0x525aada7e2a78b2c!2sUniversidad%20Tecnol%C3%B3gica%20Santa%20Catarina!5e0!3m2!1ses-419!2smx!4v1765277454590!5m2!1ses-419!2smx" width="350" height="250" style="border:0; border-radius:8px; box-shadow:0 2px 8px #ccc;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
                    <div class="text-muted mt-2">Ubicación aproximada del locker</div>
                </div>
            `;
        }
    }

    async createArticleAndShowLocker(data) {
        try {
            const result = await createArticle(data);
            this.renderLockerInfo(result.lockerCode);
            showToast('Artículo creado. Código de locker generado.', 'success');
        } catch (error) {
            showToast('Error al crear artículo: ' + (error?.message || error), 'danger');
        }
    }

    async createRequestAndShowLocker(data) {
        try {
            const result = await createRequest(data);
            this.renderLockerInfo(result.lockerCode);
            showToast('Solicitud creada. Código de locker generado.', 'success');
        } catch (error) {
            showToast('Error al crear solicitud: ' + (error?.message || error), 'danger');
        }
    }

    setupEventListeners() {
        // Ejemplo: conectar botón de crear artículo
        const createArticleBtn = document.getElementById('createArticleBtn');
        if (createArticleBtn) {
            createArticleBtn.addEventListener('click', async () => {
                const data = this.collectArticleFormData();
                await this.createArticleAndShowLocker(data);
            });
        }
        // Ejemplo: conectar botón de solicitar artículo
        const createRequestBtn = document.getElementById('createRequestBtn');
        if (createRequestBtn) {
            createRequestBtn.addEventListener('click', async () => {
                const data = this.collectRequestFormData();
                await this.createRequestAndShowLocker(data);
            });
        }
    }

    collectArticleFormData() {
        // Implementa la recolección de datos del formulario de artículo
        // Ejemplo:
        return {
            title: document.getElementById('articleTitle').value,
            description: document.getElementById('articleDescription').value,
            category: document.getElementById('articleCategory').value,
            location: document.getElementById('articleLocation').value
        };
    }

    collectRequestFormData() {
        // Implementa la recolección de datos del formulario de solicitud
        // Ejemplo:
        return {
            articleId: document.getElementById('requestArticleId').value,
            message: document.getElementById('requestMessage').value
        };
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

    // Event delegation for dashboard action buttons (CSP compliance)
    document.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        switch (action) {
            case 'view-users':
                viewAllUsers();
                break;
            case 'moderate-content':
                moderateContent();
                break;
            case 'view-analytics':
                viewAnalytics();
                break;
            case 'go-dashboard':
                window.location.href = 'donationcenter.html';
                break;
        }
    });

    // Logout button event listener
    const logoutBtn = document.getElementById('dashboardLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            logout();
        });
    }
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
