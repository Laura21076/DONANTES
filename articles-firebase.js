// articles-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
import { app } from "./firebase.js";

// Crear artículo (siempre inicia como pendiente)
export async function createArticle(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = await addDoc(collection(db, "articulos"), {
    ...data,
    userId: user.uid,
    createdAt: new Date(),
    status: "pendiente"
  });
  return docRef.id;
}

// Leer todos los artículos (solo publicados para usuarios normales)
export async function getArticles(isAdmin = false) {
  const querySnapshot = await getDocs(collection(db, "articulos"));
  return querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(art => isAdmin || art.status === "publicado");
}
// Aprobar y publicar artículo (solo admin)
export async function approveArticle(id) {
  const user = auth.currentUser;
  // Simulación: solo permite si el usuario tiene email de admin
  if (!user || !user.email.endsWith('@admin.com')) throw new Error("No autorizado");
  const docRef = doc(db, "articulos", id);
  await updateDoc(docRef, { status: "publicado", approvedAt: new Date() });
}

// Editar artículo
export async function updateArticle(id, data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = doc(db, "articulos", id);
  await updateDoc(docRef, { ...data, updatedAt: new Date() });
}

// Eliminar artículo
export async function deleteArticle(id) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = doc(db, "articulos", id);
  await deleteDoc(docRef);
}
