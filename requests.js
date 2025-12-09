// ...existing code...
  import { createRequest, getSentRequests, getReceivedRequests, updateRequest, deleteRequest } from './requests-firebase.js';

  // Crear solicitud (Firebase)
  export async function requestArticle(data) {
    return createRequest(data);
  }

  // Obtener solicitudes enviadas (Firebase)
  export async function getMySentRequests() {
    return getSentRequests();
  }

  // Obtener solicitudes recibidas (Firebase)
  export async function getMyReceivedRequests() {
    return getReceivedRequests();
  }

  // Actualizar solicitud (Firebase)
  export async function updateMyRequest(id, data) {
    return updateRequest(id, data);
  }

  // Eliminar solicitud (Firebase)
  export async function deleteMyRequest(id) {
    return deleteRequest(id);
  }

// ...existing code...





