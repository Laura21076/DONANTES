export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("authDB", 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains("tokens")) {
        db.createObjectStore("tokens", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveToken(key, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tokens", "readwrite");
    const store = tx.objectStore("tokens");
    const req = store.put({ key, value });
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

export async function getToken(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction("tokens").objectStore("tokens").get(key);
    req.onsuccess = () => resolve(req.result?.value || null);
    req.onerror = () => resolve(null);
  });
}

export async function clearTokens() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tokens", "readwrite");
    const store = tx.objectStore("tokens");
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
