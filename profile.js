// Simulación local de perfil
// 100% datos simulados, sin fetch ni backend
let profileCache = {
  displayName: 'Usuario Simulado',
  email: 'simulado@donantes.com',
  phone: '555-123-4567',
  address: 'Calle Falsa 123',
  photoURL: ''
};

export async function getProfile() {
  return profileCache;
}

export async function updateProfile(data) {
  profileCache = { ...profileCache, ...data };
  return profileCache;
}

export async function uploadProfilePhoto(file) {
  profileCache.photoURL = URL.createObjectURL(file);
  return profileCache.photoURL;
}
// ...existing code...
