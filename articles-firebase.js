import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.2/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
import { app } from "./firebase.js";

// Crear artículo (siempre inicia como pendiente)
export async function createArticle(data) {s
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  // Generar código de locker/caja fuerte (4 dígitos aleatorios)
  const lockerCode = Math.floor(1000 + Math.random() * 9000).toString();
  const docRef = await addDoc(collection(db, "articles"), {
    ...data,
    userId: user.uid,
    createdAt: new Date(),
    status: "disponible",
    lockerCode
  });
  return { id: docRef.id, lockerCode };
}

// Leer todos los artículos (solo publicados para usuarios normales)
export async function getArticles(isAdmin = false) {
  const querySnapshot = await getDocs(collection(db, "articles"));
  return querySnapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(art => isAdmin || art.status === "publicado" || art.status === "disponible");
}
// Aprobar y publicar artículo (solo admin)
export async function approveArticle(id) {
  const user = auth.currentUser;
  // Simulación: solo permite si el usuario tiene email de admin
  if (!user || !user.email.endsWith('@admin.com')) throw new Error("No autorizado");
  const docRef = doc(db, "articles", id);
  await updateDoc(docRef, { status: "publicado", approvedAt: new Date() });
}

// Editar artículo
export async function updateArticle(id, data) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = doc(db, "articles", id);
  await updateDoc(docRef, { ...data, updatedAt: new Date() });
}

// Eliminar artículo
export async function deleteArticle(id) {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const docRef = doc(db, "articles", id);
  await deleteDoc(docRef);
}

// --- Artículos de prueba para desarrollo ---
export async function createTestArticles() {
  const user = auth.currentUser;
  if (!user) throw new Error("No autenticado");
  const testArticles = [
    {
      title: "Libro de texto universitario",
      description: "Libro de cálculo avanzado, buen estado.",
      category: "Libros",
      location: "CDMX",
      condition: "Bueno",
      status: "disponible"
    },
    {
      title: "Laptop usada",
      description: "Laptop Dell, funciona pero tiene detalles en la pantalla.",
      category: "Electrónica",
      location: "Guadalajara",
      condition: "Regular",
      status: "disponible"
    },
    {
      title: "Ropa de invierno",
      description: "Abrigos y bufandas para mujer, talla M.",
      category: "Ropa",
      location: "Monterrey",
      condition: "Excelente",
      status: "disponible"
    }
  ];
  for (const art of testArticles) {
    await addDoc(collection(db, "articles"), {
      ...art,
      userId: user.uid,
      createdAt: new Date(),
      lockerCode: Math.floor(1000 + Math.random() * 9000).toString()
    });
  }
}
