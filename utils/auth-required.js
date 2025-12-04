// auth-required.js - Handles countdown redirect and PWA detection for auth-required page

document.addEventListener('DOMContentLoaded', function () {
    // Countdown redirect
    let countdown = 10;
    const countdownEl = document.getElementById('countdown');

    if (countdownEl) {
        const timer = setInterval(function () {
            countdown--;
            countdownEl.textContent = countdown;

            if (countdown <= 0) {
                clearInterval(timer);
                window.location.href = 'login.html';
            }
        }, 1000);
    }

    // Detect if accessed from installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
        document.body.classList.add('pwa-mode');
    }

    // URL parameters for customization
    const urlParams = new URLSearchParams(window.location.search);
    const redirectTo = urlParams.get('redirect');
    const reason = urlParams.get('reason');

    if (reason === 'expired') {
        const headerTitle = document.querySelector('.auth-header h2');
        const headerDesc = document.querySelector('.auth-header p');
        if (headerTitle) {
            headerTitle.textContent = 'Sesión Expirada';
        }
        if (headerDesc) {
            headerDesc.textContent = 'Tu sesión ha expirado, inicia sesión nuevamente';
        }
    }

    if (redirectTo) {
        // Save redirect destination
        localStorage.setItem('auth-redirect-after', redirectTo);
    }
});
