// ...existing code...

// Simulación local de solicitudes
let requestsCache = [];

export async function requestArticle(data) {
  const id = Math.random().toString(36).substr(2, 9);
  const lockerCode = Math.floor(1000 + Math.random() * 9000).toString();
  const newRequest = { ...data, id, lockerCode };
  requestsCache.push(newRequest);
  return newRequest;
}

export async function getMySentRequests() {
  return requestsCache;
}

export async function getMyReceivedRequests() {
  return requestsCache;
}

export async function updateMyRequest(id, data) {
  const idx = requestsCache.findIndex(r => r.id === id);
  if (idx !== -1) {
    requestsCache[idx] = { ...requestsCache[idx], ...data };
    return requestsCache[idx];
  }
  throw new Error('Solicitud no encontrada');
}

export async function deleteMyRequest(id) {
  requestsCache = requestsCache.filter(r => r.id !== id);
  return true;
}

// ...existing code...





