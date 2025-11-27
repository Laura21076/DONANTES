// profile.js (módulo de funciones para manejar el perfil en Firestore + auth + storage)

import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js';
import { updateProfile as fbUpdateProfile, updatePassword as fbUpdatePassword } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { storage } from './firebase.js';
import { getCurrentUser } from './auth.js';

// Obtener datos de perfil
export async function getProfile() {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  const firestore = getFirestore();
  const userRef = doc(firestore, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return { ...snap.data(), email: user.email, displayName: user.displayName, photoURL: user.photoURL };
  }
  // Si el documento no existe, usa datos básicos del usuario
  return {
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL
  };
}

// Actualizar perfil en Firestore y Firebase Auth displayName
export async function updateProfile(data) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  const firestore = getFirestore();
  const userRef = doc(firestore, 'users', user.uid);
  await updateDoc(userRef, data);

  // Opcional: Actualizar displayName en Firebase Auth si cambia el nombre
  if (data.firstName || data.lastName) {
    const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
    if (fullName && fullName !== user.displayName) {
      await fbUpdateProfile(user, { displayName: fullName });
    }
  }
  return true;
}

// Actualizar contraseña
export async function updatePassword(newPassword) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  await fbUpdatePassword(user, newPassword);
  return true;
}

// Subir/actualizar foto de perfil
export async function uploadProfilePhoto(file) {
  const user = await getCurrentUser();
  if (!user) throw new Error('No autenticado');
  const safeName = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
  const fileRef = ref(storage, `profile_photos/${user.uid}/${Date.now()}_${safeName}`);
  await uploadBytes(fileRef, file);
  const photoURL = await getDownloadURL(fileRef);

  // Actualiza tanto en Auth como en Firestore
  await fbUpdateProfile(user, { photoURL });

  const firestore = getFirestore();
  const userRef = doc(firestore, 'users', user.uid);
  await updateDoc(userRef, { photoURL });

  return photoURL;
}
