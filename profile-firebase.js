// profile-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAuth, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-storage.js";

const firebaseConfig = window.__ENV__;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Obtener perfil del usuario
export async function getUserProfile() {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = doc(db, "usuarios", user.uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
}

// Actualizar perfil del usuario
export async function updateUserProfile(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = doc(db, "usuarios", user.uid);
  await setDoc(docRef, data, { merge: true });
  if (data.displayName || data.photoURL) {
    await updateProfile(user, {
      displayName: data.displayName,
      photoURL: data.photoURL
    });
  }
}

// Subir imagen de perfil
export async function uploadProfileImage(file) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const storageRef = ref(storage, `profile-images/${user.uid}`);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateUserProfile({ photoURL: url });
  return url;
}
