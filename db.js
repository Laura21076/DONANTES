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
  const tx = db.transaction("tokens", "readwrite");
  tx.objectStore("tokens").put({ key, value });
  return tx.complete;
}

export async function getToken(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction("tokens").objectStore("tokens").get(key);
    req.onsuccess = () => resolve(req.result?.value || null);
  });
}

export async function clearTokens() {
  const db = await openDB();
  db.transaction("tokens", "readwrite").objectStore("tokens").clear();
}
