import './error-handler.js';
import { auth } from './firebase.js';
import { saveToken } from './db.js';
import { showToast } from './ui.js';
import { signInWithRetry, authRetryHandler } from './auth-retry.js';
import './toggle-password.js';

const loginForm = document.getElementById('loginForm');
if (loginForm) {
	loginForm.addEventListener('submit', async (e) => {
		e.preventDefault();
		if (!loginForm.checkValidity()) {
			e.stopPropagation();
			loginForm.classList.add('was-validated');
			return;
		}
		const email = document.getElementById('loginEmail').value.trim();
		const password = document.getElementById('loginPassword').value.trim();
		const submitBtn = loginForm.querySelector('button[type="submit"]');
		const spinner = document.getElementById('loginSpinner');
		try {
			submitBtn.disabled = true;
			if (spinner) spinner.classList.remove('d-none');
			submitBtn.querySelector('span').textContent = 'Entrando...';
			const userCredential = await signInWithRetry(auth, email, password);
			const user = userCredential.user;
			console.log('🟢 Usuario autenticado:', user?.email, user?.uid);
			console.log('🟢 auth.currentUser luego de signin:', auth.currentUser);
			const idToken = await user.getIdToken();
			const backendUrl = window.__ENV__?.BACKEND_URL;
			const response = await fetch(`${backendUrl}/api/auth/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				credentials: 'include',
				body: JSON.stringify({ idToken }),
			});
			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Error en el servidor');
			}
			const data = await response.json();
			await saveToken('access', data.accessToken);
			await saveToken('refresh', data.refreshToken);
			console.log('🟢 accessToken después de guardar:', localStorage.getItem('access') || sessionStorage.getItem('access'));
			console.log('🟢 auth.currentUser antes de redirect:', auth.currentUser);
			setTimeout(() => {
				window.location.replace('donationcenter.html');
			}, 150);
		} catch (error) {
			console.error('Error al iniciar sesión:', error);
			if (authRetryHandler && authRetryHandler.showRateLimitMessage?.(error)) {
			} else {
				const errorMessage = window.handleFirebaseError ?
					window.handleFirebaseError(error, 'Login') :
					(error.message || 'Error al iniciar sesión');
				showToast('error', errorMessage);
			}
			if (error.code === 'auth/too-many-requests') {
				setTimeout(async () => {
					const cleared = await authRetryHandler.clearAuthBlocks?.();
					if (cleared) showToast('info', 'Bloqueos limpiados. Puedes intentar de nuevo.');
				}, 2000);
			}
			submitBtn.disabled = false;
			if (spinner) spinner.classList.add('d-none');
			submitBtn.querySelector('span').textContent = 'Entrar';
		}
	});
}
const toggleBtn = document.getElementById('toggleLoginPassword');
const passwordInput = document.getElementById('loginPassword');
const passwordIcon = document.getElementById('loginPasswordIcon');
if (toggleBtn && passwordInput && passwordIcon) {
	toggleBtn.addEventListener('click', () => {
		window.togglePasswordVisibility('loginPassword', 'loginPasswordIcon');
	});
}
