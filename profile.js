// Simulación local de perfil
// 100% datos simulados, sin fetch ni backend
let profileCache = {
  displayName: 'Laura Cardona Morales',
  email: 'laura@example.com',
  phone: 'e7bbaa76798217c8814823c3dd1e57d1:66ee8eb014a9597ede7e3f206e677984:ff9b201a3c9fe4d0217a831c706e43',
  address: 'b2d3f9dd5e2c1c96820c7a572e0b29ff:2975a36c0f1f24578c39663d76b0b606:99c86e0b49cda6967d29cf0b7b6741',
  city: 'Santa Catarina',
  firstName: 'Laura',
  lastName: 'Cardona Morales',
  name: 'Laura Cardona',
  fechaRegistro: '22 de octubre de 2025 a las 7:15:27 p.m. UTC-6',
  location: '25.691608001916787° N, 100.51156873286979° W',
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
