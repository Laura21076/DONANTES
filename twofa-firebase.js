// twofa-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getAuth, PhoneAuthProvider, RecaptchaVerifier, signInWithPhoneNumber, multiFactor, PhoneMultiFactorGenerator } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const firebaseConfig = window.__ENV__;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Inicializar reCAPTCHA para 2FA
export function setupRecaptcha(containerId, callback) {
  window.recaptchaVerifier = new RecaptchaVerifier(containerId, {
    size: 'invisible',
    callback: callback
  }, auth);
}

// Enviar código SMS para 2FA
export async function send2FACode(phoneNumber) {
  if (!window.recaptchaVerifier) throw new Error('reCAPTCHA no inicializado');
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phoneNumber, window.recaptchaVerifier);
  return verificationId;
}

// Verificar código SMS para 2FA
export async function verify2FACode(verificationId, code) {
  const cred = PhoneAuthProvider.credential(verificationId, code);
  const user = auth.currentUser;
  if (!user) throw new Error('No autenticado');
  await multiFactor(user).enroll(cred, '2FA SMS');
}

// Iniciar sesión con 2FA
export async function signInWith2FA(phoneNumber, appVerifier) {
  const provider = new PhoneAuthProvider(auth);
  const verificationId = await provider.verifyPhoneNumber(phoneNumber, appVerifier);
  return verificationId;
}

// Completar login con código 2FA
export async function finalize2FALogin(verificationId, code) {
  const cred = PhoneAuthProvider.credential(verificationId, code);
  return signInWithPhoneNumber(auth, cred);
}
