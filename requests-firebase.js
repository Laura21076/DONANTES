// requests-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const firebaseConfig = window.__ENV__;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Crear solicitud
export async function createRequest(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = await addDoc(collection(db, "solicitudes"), {
    ...data,
    senderId: user.uid,
    createdAt: new Date()
  });
  return docRef.id;
}

// Obtener solicitudes enviadas por el usuario
export async function getSentRequests() {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const q = query(collection(db, "solicitudes"), where("senderId", "==", user.uid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Obtener solicitudes recibidas por el usuario
export async function getReceivedRequests() {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const q = query(collection(db, "solicitudes"), where("receiverId", "==", user.uid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Actualizar solicitud
export async function updateRequest(id, data) {
  const docRef = doc(db, "solicitudes", id);
  await updateDoc(docRef, { ...data, updatedAt: new Date() });
}

// Eliminar solicitud
export async function deleteRequest(id) {
  const docRef = doc(db, "solicitudes", id);
  await deleteDoc(docRef);
}
