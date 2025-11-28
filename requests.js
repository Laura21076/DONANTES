import { getIdToken } from './auth.js';

import { getCurrentLockerCode } from './locker.js';

const lockerCode = await getCurrentLockerCode();
const API_URL = 'https://donantes-backend-202152301689.northamerica-south1.run.app/api';

/**
 * Helper para parsear respuesta del backend de forma segura
 * Si el backend responde con error no-JSON, retorna un objeto de error genérico
 */
async function safeParseJSON(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error('[PARSE_ERROR] Respuesta no es JSON válido:', text.substring(0, 200));
    return { error: text || 'Error desconocido del servidor', _raw: text };
  }
}

// Solicitar un artículo
export async function requestArticle(articleId, message = '', lockerCode = null) {
  console.log('[requestArticle] Solicitando artículo:', articleId);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[requestArticle] No hay token de acceso');
      throw new Error('No hay token de acceso. Por favor inicia sesión nuevamente.');
    }

    console.log('[requestArticle] Enviando solicitud al backend...');
    const response = await fetch(`${API_URL}/requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ articleId, message, lockerCode})
    });

    console.log('[requestArticle] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[requestArticle] Error del backend:', errorData);
      
      // Provide clear error messages based on status code
      if (response.status === 404) {
        throw new Error('El artículo ya no está disponible o fue eliminado.');
      } else if (response.status === 400) {
        throw new Error(errorData.error || 'No se puede solicitar este artículo. Puede que ya esté reservado o ya hayas enviado una solicitud.');
      } else if (response.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      } else if (response.status === 403) {
        throw new Error('No tienes permiso para solicitar este artículo.');
      } else if (response.status === 409) {
        throw new Error('Ya has solicitado este artículo anteriormente.');
      } else {
        throw new Error(errorData.error || `Error al solicitar artículo (HTTP ${response.status})`);
      }
    }

    const result = await safeParseJSON(response);
    console.log('[requestArticle] Solicitud enviada exitosamente');
    return result;
  } catch (error) {
    console.error('[requestArticle] Excepción:', error);
    throw error;
  }
}

// Obtener mis solicitudes enviadas
export async function getMyRequests() {
  console.log('[getMyRequests] Obteniendo mis solicitudes...');
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[getMyRequests] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[getMyRequests] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/requests/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[getMyRequests] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[getMyRequests] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al obtener solicitudes (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[getMyRequests] Solicitudes obtenidas:', Array.isArray(result) ? result.length : 'N/A');
    return result;
  } catch (error) {
    console.error('[getMyRequests] Excepción:', error);
    throw error;
  }
}

// Obtener solicitudes recibidas (como donador)
export async function getReceivedRequests() {
  console.log('[getReceivedRequests] Obteniendo solicitudes recibidas...');
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[getReceivedRequests] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[getReceivedRequests] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/requests/received`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[getReceivedRequests] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[getReceivedRequests] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al obtener solicitudes (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[getReceivedRequests] Solicitudes obtenidas:', Array.isArray(result) ? result.length : 'N/A');
    return result;
  } catch (error) {
    console.error('[getReceivedRequests] Excepción:', error);
    throw error;
  }
}

// Aprobar una solicitud
export async function approveRequest(requestId, lockerId, lockerLocation) {
  console.log('[approveRequest] Aprobando solicitud:', requestId);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[approveRequest] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[approveRequest] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ lockerId, lockerLocation })
    });

    console.log('[approveRequest] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[approveRequest] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al aprobar solicitud (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[approveRequest] Solicitud aprobada exitosamente');
    return result;
  } catch (error) {
    console.error('[approveRequest] Excepción:', error);
    throw error;
  }
}

// Rechazar una solicitud
export async function rejectRequest(requestId, reason = '') {
  console.log('[rejectRequest] Rechazando solicitud:', requestId);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[rejectRequest] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[rejectRequest] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/requests/${requestId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    });

    console.log('[rejectRequest] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[rejectRequest] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al rechazar solicitud (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[rejectRequest] Solicitud rechazada exitosamente');
    return result;
  } catch (error) {
    console.error('[rejectRequest] Excepción:', error);
    throw error;
  }
}

// Confirmar retiro del artículo
export async function confirmPickup(requestId) {
  console.log('[confirmPickup] Confirmando retiro:', requestId);
  try {
    const token = await getIdToken();
    if (!token) {
      console.error('[confirmPickup] No hay token de acceso');
      throw new Error('No hay token de acceso');
    }

    console.log('[confirmPickup] Enviando petición al backend...');
    const response = await fetch(`${API_URL}/requests/${requestId}/confirm`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('[confirmPickup] Respuesta del backend:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await safeParseJSON(response);
      console.error('[confirmPickup] Error del backend:', errorData);
      throw new Error(errorData.error || `Error al confirmar retiro (HTTP ${response.status})`);
    }

    const result = await safeParseJSON(response);
    console.log('[confirmPickup] Retiro confirmado exitosamente');
    return result;
  } catch (error) {
    console.error('[confirmPickup] Excepción:', error);
    throw error;
  }
}



