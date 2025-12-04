/**
 * Cliente para Autenticación Multifactor Simplificada
 * Interfaz fácil de usar para el sistema 2FA
 */

// No requiere imports propios, es standalone para tu raíz.

class Simple2FA {
    constructor() {
        this.baseUrl = (window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.northamerica-south1.run.app') + '/api/auth/2fa-simple';
    }

    /**
     * Mostrar notificación de usuario
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        notification.innerHTML = `
            <strong>${type === 'success' ? '✅' : type === 'danger' ? '❌' : 'ℹ️'}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification?.remove();
        }, 5000);
    }

    /**
     * Realizar petición HTTP
     */
    async request(endpoint, method = 'GET', data = null) {
        try {
            const token = localStorage.getItem('token');
            const options = {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` })
                }
            };
            if (data) options.body = JSON.stringify(data);

            const response = await fetch(`${this.baseUrl}${endpoint}`, options);
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Error en la solicitud');
            return result;
        } catch (error) {
            console.error('Error en petición:', error);
            throw error;
        }
    }

    async enable(email) {
        try {
            const result = await this.request('/enable', 'POST', { method: 'email' });
            this.showNotification(`Código enviado a ${result.destination}. Revisa tu email.`, 'success');
            return result;
        } catch (error) {
            this.showNotification(error.message, 'danger');
            throw error;
        }
    }

    async verifySetup(code) {
        try {
            const result = await this.request('/verify-setup', 'POST', { code });
            this.showNotification('🎉 Autenticación de dos factores activada exitosamente', 'success');
            return result;
        } catch (error) {
            this.showNotification(error.message, 'danger');
            throw error;
        }
    }

    async requestLoginCode(email) {
        try {
            const result = await this.request('/request-code', 'POST', { email });
            this.showNotification(`Código de acceso enviado a ${result.destination}`, 'info');
            return result;
        } catch (error) {
            this.showNotification(error.message, 'danger');
            throw error;
        }
    }

    async verifyLogin(email, code) {
        try {
            const result = await this.request('/verify-login', 'POST', { email, code });
            this.showNotification('✅ Código verificado correctamente', 'success');
            return result;
        } catch (error) {
            this.showNotification(error.message, 'danger');
            throw error;
        }
    }

    async disable(confirmationCode = null) {
        try {
            const result = await this.request('/disable', 'POST', confirmationCode ? { confirmationCode } : {});
            if (result.requiresConfirmation) {
                this.showNotification('Código de confirmación enviado a tu email', 'info');
            } else {
                this.showNotification('2FA desactivado exitosamente', 'success');
            }
            return result;
        } catch (error) {
            this.showNotification(error.message, 'danger');
            throw error;
        }
    }

    async getStatus() {
        try {
            const result = await this.request('/status', 'GET');
            return result;
        } catch (error) {
            console.error('Error obteniendo estado 2FA:', error);
            return { twoFactorEnabled: false };
        }
    }

    createSetupInterface(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = `
            <div class="card">
                <div class="card-header bg-primary text-white">
                    <h5 class="mb-0">
                        <i class="fas fa-shield-alt me-2"></i>
                        Autenticación de Dos Factores (2FA)
                    </h5>
                </div>
                <div class="card-body">
                    <div id="2fa-status" class="mb-3">
                        <div class="d-flex justify-content-center">
                            <div class="spinner-border" role="status">
                                <span class="visually-hidden">Cargando...</span>
                            </div>
                        </div>
                    </div>
                    <div id="2fa-disabled" class="d-none">
                        <div class="alert alert-info">
                            <h6><i class="fas fa-info-circle me-2"></i>¿Qué es la Autenticación de Dos Factores?</h6>
                            <p class="mb-0">Agrega una capa extra de seguridad a tu cuenta. Cuando inicies sesión, recibirás un código por email que deberás introducir.</p>
                        </div>
                        <div class="mb-3">
                            <label for="setup-email" class="form-label">Tu email para recibir códigos:</label>
                            <input type="email" class="form-control" id="setup-email" readonly>
                        </div>
                        <button id="enable-2fa-btn" class="btn btn-success">
                            <i class="fas fa-lock me-2"></i>Activar 2FA
                        </button>
                    </div>
                    <div id="2fa-enabled" class="d-none">
                        <div class="alert alert-success">
                            <h6><i class="fas fa-check-circle me-2"></i>2FA Activado</h6>
                            <p class="mb-0">Tu cuenta está protegida con autenticación de dos factores.</p>
                        </div>
                        <div class="mb-3">
                            <small class="text-muted">
                                Activado el: <span id="2fa-enabled-date"></span>
                            </small>
                        </div>
                        <button id="disable-2fa-btn" class="btn btn-outline-danger">
                            <i class="fas fa-unlock me-2"></i>Desactivar 2FA
                        </button>
                    </div>
                    <div id="2fa-verify" class="d-none">
                        <div class="alert alert-warning">
                            <h6><i class="fas fa-envelope me-2"></i>Verificar Código</h6>
                            <p class="mb-0">Hemos enviado un código de verificación a tu email. Ingrésalo para continuar.</p>
                        </div>
                        <div class="mb-3">
                            <label for="verification-code" class="form-label">Código de 6 dígitos:</label>
                            <input type="text" class="form-control text-center" id="verification-code" maxlength="6" placeholder="123456" style="font-size: 1.2em; letter-spacing: 3px;">
                        </div>
                        <div class="d-flex gap-2">
                            <button id="verify-code-btn" class="btn btn-primary">
                                <i class="fas fa-check me-2"></i>Verificar
                            </button>
                            <button id="cancel-verify-btn" class="btn btn-outline-secondary">
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        this.attachEventListeners();
        this.updateStatusDisplay();
    }

    attachEventListeners() {
        document.getElementById('enable-2fa-btn')?.addEventListener('click', async () => {
            const email = document.getElementById('setup-email').value;
            try {
                await this.enable(email);
                this.showVerifyPanel();
            } catch (error) { }
        });

        document.getElementById('verify-code-btn')?.addEventListener('click', async () => {
            const code = document.getElementById('verification-code').value;
            if (!code || code.length !== 6) {
                this.showNotification('Ingresa un código de 6 dígitos', 'warning');
                return;
            }
            try {
                await this.verifySetup(code);
                this.updateStatusDisplay();
            } catch (error) { }
        });

        document.getElementById('disable-2fa-btn')?.addEventListener('click', async () => {
            try {
                const result = await this.disable();
                if (result.requiresConfirmation) {
                    this.promptDisableConfirmation();
                } else {
                    this.updateStatusDisplay();
                }
            } catch (error) { }
        });

        document.getElementById('cancel-verify-btn')?.addEventListener('click', () => {
            this.updateStatusDisplay();
        });

        document.getElementById('verification-code')?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    showVerifyPanel() {
        document.getElementById('2fa-disabled').classList.add('d-none');
        document.getElementById('2fa-enabled').classList.add('d-none');
        document.getElementById('2fa-verify').classList.remove('d-none');
        document.getElementById('verification-code').focus();
    }

    async promptDisableConfirmation() {
        const code = prompt('Ingresa el código de confirmación que se envió a tu email:');
        if (code) {
            try {
                await this.disable(code);
                this.updateStatusDisplay();
            } catch (error) { }
        }
    }

    async updateStatusDisplay() {
        try {
            const status = await this.getStatus();
            const statusDiv = document.getElementById('2fa-status');
            const disabledDiv = document.getElementById('2fa-disabled');
            const enabledDiv = document.getElementById('2fa-enabled');
            const verifyDiv = document.getElementById('2fa-verify');

            statusDiv.classList.add('d-none');
            disabledDiv.classList.add('d-none');
            enabledDiv.classList.add('d-none');
            verifyDiv.classList.add('d-none');

            if (status.twoFactorEnabled) {
                enabledDiv.classList.remove('d-none');
                if (status.enabledAt) {
                    document.getElementById('2fa-enabled-date').textContent =
                        new Date(status.enabledAt).toLocaleString();
                }
            } else {
                disabledDiv.classList.remove('d-none');
                const user = window.currentUser;
                if (user?.email) {
                    document.getElementById('setup-email').value = user.email;
                }
            }
        } catch (error) {
            document.getElementById('2fa-status').innerHTML = `
                <div class="alert alert-warning">
                    Error cargando estado de 2FA
                </div>
            `;
        }
    }
}

// Exportar para uso global
window.Simple2FA = Simple2FA;
