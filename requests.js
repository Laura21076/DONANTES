import { getIdToken } from './auth.js';

const API_URL = 'https://donantes-backend-202152301689.northamerica-south1.run.app/api';

// Solicitar un artículo
export async function requestArticle(articleId, message = '') {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso. Por favor inicia sesión nuevamente.');

    const response = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ articleId, message })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error desconocido' }));
      
      // Provide clear error messages based on status code
      if (response.status === 404) {
        throw new Error('El artículo ya no está disponible o fue eliminado.');
      } else if (response.status === 400) {
        throw new Error(error.error || 'No se puede solicitar este artículo. Puede que ya esté reservado o ya hayas enviado una solicitud.');
      } else if (response.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para solicitar este artículo.');
      } else if (response.status === 409) {
        throw new Error('Ya has solicitado este artículo anteriormente.');
      } else {
        throw new Error(error.error || 'Error al solicitar artículo. Intenta de nuevo más tarde.');
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Error al solicitar artículo:', error);
    throw error;
  }
}

// Obtener mis solicitudes enviadas
export async function getMyRequests() {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/requests/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener solicitudes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al obtener mis solicitudes:', error);
    throw error;
  }
}

// Obtener solicitudes recibidas (como donador)
export async function getReceivedRequests() {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/requests/received`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al obtener solicitudes');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al obtener solicitudes recibidas:', error);
    throw error;
  }
}

// Aprobar una solicitud
export async function approveRequest(requestId, lockerId, lockerLocation) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lockerId, lockerLocation })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al aprobar solicitud');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    throw error;
  }
}

// Rechazar una solicitud
export async function rejectRequest(requestId, reason = '') {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al rechazar solicitud');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al rechazar solicitud:', error);
    throw error;
  }
}

// Confirmar retiro del artículo
export async function confirmPickup(requestId) {
  try {
    const token = await getIdToken();
    if (!token) throw new Error('No hay token de acceso');

    const response = await fetch(`${API_URL}/requests/${requestId}/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error al confirmar retiro');
    }

    return await response.json();
  } catch (error) {
    console.error('Error al confirmar retiro:', error);
    throw error;
  }
}
