// google-maps-handler.js - Manejo de Google Maps sin scripts inline
document.addEventListener('DOMContentLoaded', function() {
  const googleMapsScript = document.getElementById('google-maps-script');
  if (googleMapsScript) {
    googleMapsScript.addEventListener('error', function() {
      console.log('Google Maps no pudo cargarse, usando mapa estático');
    });
  }
});
