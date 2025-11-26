// Servicio para obtener el código actual de la caja fuerte desde Firebase Realtime Database
export async function getCurrentLockerCode() {
  const url = 'https://donantes-400ba-default-rtdb.firebaseio.com/cajaFuerte/claveActual.json';
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo obtener el código de la caja fuerte');
  const code = await resp.json();
  return code;
}
