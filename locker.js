// Servicio para obtener el código actual de la caja fuerte desde Firebase Realtime Database

// Servicio para obtener el código actual de la caja fuerte desde el backend seguro
import { getToken } from './db.js';

export async function getCurrentLockerCode() {
  const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.us-central1.run.app';
  const token = await getToken('accessToken');
  const resp = await fetch(`${backendUrl}/api/caja-fuerte/clave-actual`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  if (!resp.ok) throw new Error('No se pudo obtener el código de la caja fuerte');
  const data = await resp.json();
  return data.claveActual;
}
