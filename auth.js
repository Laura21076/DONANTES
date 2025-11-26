import { saveToken, getToken, clearTokens } from './db.js';
import { showSpinner, hideSpinner, handleAuthError } from './ui.js';
import { auth } from './firebase.js';
import { 
  signInWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
