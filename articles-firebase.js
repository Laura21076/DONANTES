// articles-firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const firebaseConfig = window.__ENV__;
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Crear artículo
export async function createArticle(data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = await addDoc(collection(db, "articulos"), {
    ...data,
    userId: user.uid,
    createdAt: new Date()
  });
  return docRef.id;
}

// Leer todos los artículos
export async function getArticles() {
  const querySnapshot = await getDocs(collection(db, "articulos"));
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
