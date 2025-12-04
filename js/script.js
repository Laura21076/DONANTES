import { auth, db, storage } from './firebase.js';
import { getCurrentUser, refreshTokenIfNeeded } from './auth.js';
import { saveToken, getToken } from './db.js';
import { showToast, handleAuthError } from './ui.js';
import { SessionManager } from './session-manager.js';
import { initializeAuthGuard, isProtectedPage, isPublicPage } from './auth-guard.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  doc,
  setDoc,
  serverTimestamp,
  GeoPoint,
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';

// ================== SESSION MANAGER INITIALIZATION ==================

// Inicializar el SessionManager
let sessionManager;
try {
  sessionManager = new SessionManager();
  console.log('🎯 SessionManager inicializado correctamente');
} catch (error) {
  console.error('❌ Error inicializando SessionManager:', error);
}

// ================== PWA Service Worker ==================

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(registration => {
        console.log('Service Worker registrado con éxito:', registration.scope);
      })
      .catch(error => {
        console.error('Error al registrar el Service Worker:', error);
      });
  });
}

// ================== VALIDACIÓN DE FORMULARIOS ==================
(() => {
  'use strict';
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
})();

// (Handlers de login/registro se migraron a archivos dedicados login.js y register.js)

export async function logout() {
  await fetch('/api/auth/logout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include'
  });
  await saveToken('access', null);
  await saveToken('refresh', null);
  window.location.href = 'login.html';
}

async function guardarDonacion(tipo, cantidad, file) {
  const user = await getUser();
  if (!user) return alert('No autenticado');

  let imageUrl = '';

  if (file) {
    const fileRef = ref(storage, `donaciones/${user.uid}/${Date.now()}_${file.name}`);
    await uploadBytes(fileRef, file);
    imageUrl = await getDownloadURL(fileRef);
  }

  await addDoc(collection(db, 'donaciones'), {
    tipo: tipo,
    cantidad: Number(cantidad),
    estado: 'pendiente',
    fecha: serverTimestamp(),
    idDonante: doc(db, 'users', user.uid),
    imagenUrl: imageUrl
  });

  alert('✅ Donación guardada correctamente');
  mostrarDonaciones();
}

function mostrarDonaciones() {
  const cont = document.getElementById('listaDonaciones');
  cont.innerHTML = '';

  getUser().then(user => {
    const refUser = doc(db, 'users', user.uid);

    const q = query(
      collection(db, 'donaciones'),
      where('idDonante', '==', refUser),
      orderBy('fecha', 'desc')
    );

    onSnapshot(q, snapshot => {
      cont.innerHTML = '';
      snapshot.forEach(docu => {
        const d = docu.data();
        cont.innerHTML += `
          <div class="card mb-3 p-2">
            ${d.imagenUrl ? `<img src="${d.imagenUrl}" class="card-img-top rounded" style="max-height:180px;object-fit:cover;">` : ''}
            <div class="card-body">
              <h5 class="mb-0">${d.tipo} (${d.cantidad})</h5>
              <span class="badge" style="background-color: #A992D8; color: white;">${d.estado}</span>
              <p class="text-muted small mt-1">${d.fecha?.toDate().toLocaleString() ?? ''}</p>
            </div>
          </div>
        `;
      });
    });
  });
}

const btnDonar = document.getElementById('btnDonar');
btnDonar?.addEventListener('click', () => {
  const tipo = document.getElementById('tipo').value;
  const cantidad = document.getElementById('cantidad').value;
  const file = document.getElementById('fotoArticulo').files[0];

  guardarDonacion(tipo, cantidad, file);
});

// ================== FUNCIONES GLOBALES PARA SESSION MANAGER ==================

// Función global para obtener usuario actual
window.getCurrentUser = function () {
  try {
    return auth.currentUser;
  } catch (error) {
    console.warn('Error obteniendo usuario actual:', error);
    return null;
  }
};

// Función global para verificar si el usuario está autenticado
window.isUserAuthenticated = function () {
  try {
    return !!auth.currentUser;
  } catch (error) {
    console.warn('Error verificando autenticación:', error);
    return false;
  }
};

// Función global para manejar redirecciones de sesión
window.handleSessionRedirect = function (redirectPath) {
  if (sessionManager) {
    sessionManager.handleSessionRedirect(redirectPath);
  } else {
    console.warn('SessionManager no disponible para redirección');
    window.location.href = redirectPath;
  }
};

// Función global para detectar tipo de dispositivo
window.getDeviceType = function () {
  if (sessionManager) {
    return sessionManager.detectDevice();
  } else {
    return 'desktop'; // fallback
  }
};

// Función global para verificar si es PWA instalada
window.isPWA = function () {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
};

// Evento para manejar cambios de autenticación - LÓGICA SIMPLE Y RÁPIDA
auth.onAuthStateChanged(async (user) => {
  console.log('🔄 Estado de autenticación:', user ? `Usuario: ${user.email}` : 'Sin usuario');

  if (user) {
    const accessToken = await getToken('access');
    const refreshToken = await getToken('refresh');

    if (accessToken && refreshToken) {
      console.log('✅ Usuario autenticado - acceso completo');
      if (sessionManager) {
        sessionManager.initializeUserSession(user);
      }
      return;
    }
  }

  // Sin usuario válido o sin tokens - solo proteger páginas específicas
  const protectedPages = ['donationcenter.html', 'requests.html', 'profile.html', 'dashboard.html'];
  const currentPage = window.location.pathname;
  const isOnProtectedPage = protectedPages.some(page => currentPage.includes(page));

  if (isOnProtectedPage && !window.location.pathname.includes('login.html')) {
    console.log('🔒 Acceso denegado - redirigiendo a login');
    window.location.replace('login.html');
  }

  if (sessionManager) {
    sessionManager.clearUserSession();
  }
});

// Notificar al SessionManager sobre el DOM cargado
document.addEventListener('DOMContentLoaded', () => {
  if (sessionManager) {
    sessionManager.onDOMLoaded();
  }
});
