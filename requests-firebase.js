import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

import { app } from "./firebase.js";
const db = getFirestore(app);
const auth = getAuth(app);

// Crear solicitud
export async function createRequest(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  // Generar código de locker/caja fuerte (4 dígitos aleatorios)
  const lockerCode = Math.floor(1000 + Math.random() * 9000).toString();
  const docRef = await addDoc(collection(db, "requests"), {
    ...data,
    senderId: user.uid,
    createdAt: new Date(),
    lockerCode
  });
  return { id: docRef.id, lockerCode };
}

// Obtener solicitudes enviadas por el usuario
export async function getSentRequests() {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const q = query(collection(db, "requests"), where("senderId", "==", user.uid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Obtener solicitudes recibidas por el usuario
export async function getReceivedRequests() {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const q = query(collection(db, "requests"), where("receiverId", "==", user.uid));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// Actualizar solicitud
export async function updateRequest(id, data) {
  const docRef = doc(db, "requests", id);
  await updateDoc(docRef, { ...data, updatedAt: new Date() });
}

// Eliminar solicitud
export async function deleteRequest(id) {
  const docRef = doc(db, "requests", id);
  await deleteDoc(docRef);
}
