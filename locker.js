// Servicio para obtener el código actual de la caja fuerte desde Firebase Realtime Database

// Servicio para obtener el código actual de la caja fuerte desde el backend seguro
import { getToken } from './db.js';

export async function getCurrentLockerCode() {
  const backendUrl = window.__ENV__?.BACKEND_URL || 'https://donantes-backend-202152301689.us-central1.run.app';
  const token = await getToken('access'); // JWT propio del backend
  console.log('[locker.js] getCurrentLockerCode: token', token?.substring(0, 30) + '...');
  const url = `${backendUrl}/api/caja-fuerte/clave-actual`;
  console.log('[locker.js] Fetching:', url);
  const resp = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  console.log('[locker.js] Response status:', resp.status);
  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[locker.js] Error response:', errText);
    throw new Error('No se pudo obtener el código de la caja fuerte');
  }
  const data = await resp.json();
  console.log('[locker.js] claveActual:', data.claveActual);
  return data.claveActual;
}
