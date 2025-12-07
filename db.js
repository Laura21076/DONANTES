export function openDB() {
  console.log('[db.js] openDB called');
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
  console.log(`[db.js] saveToken: key=${key}, value=${typeof value === 'string' ? value.substring(0, 30) + '...' : typeof value}`);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tokens", "readwrite");
    const store = tx.objectStore("tokens");
    const req = store.put({ key, value });
    req.onsuccess = () => {
      console.log(`[db.js] Token saved: ${key}`);
      resolve(true);
    };
    req.onerror = () => {
      console.error('[db.js] Error saving token', req.error);
      reject(req.error);
    };
  });
}

export async function getToken(key) {
  console.log(`[db.js] getToken: key=${key}`);
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction("tokens").objectStore("tokens").get(key);
    req.onsuccess = () => {
      const val = req.result?.value || null;
      console.log(`[db.js] Token loaded: ${key} = ${val ? val.substring(0, 30) + '...' : null}`);
      resolve(val);
    };
    req.onerror = () => {
      console.error('[db.js] Error loading token', req.error);
      resolve(null);
    };
  });
}

export async function clearTokens() {
  console.log('[db.js] clearTokens called');
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("tokens", "readwrite");
    const store = tx.objectStore("tokens");
    const req = store.clear();
    req.onsuccess = () => {
      console.log('[db.js] All tokens cleared');
      resolve(true);
    };
    req.onerror = () => {
      console.error('[db.js] Error clearing tokens', req.error);
      reject(req.error);
    };
  });
}
