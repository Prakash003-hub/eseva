// Shop Location & Configuration for SUBI e-Sevai
export const SHOP_LOCATION = {
  name: 'SUBI e-Sevai',
  address: 'Burkitmanagaram, Tirunelveli, Tamil Nadu 627351',
  latitude: 8.753384263928902,
  longitude: 77.79773010000002,
  get coordinatesString() {
    return `${this.latitude},${this.longitude}`;
  },
  // Google Maps Directions: Opens navigation with shop as fixed destination
  // Google Maps automatically determines user's current location when permitted
  get directionsUrl() {
    return `https://www.google.com/maps/dir/?api=1&destination=${this.latitude},${this.longitude}&travelmode=driving`;
  },
  // Alternative View on Google Maps URL
  get viewMapUrl() {
    return `https://www.google.com/maps/search/?api=1&query=${this.latitude},${this.longitude}`;
  },
  // Responsive Embed URL
  get embedUrl() {
    return `https://maps.google.com/maps?q=${this.latitude},${this.longitude}+(SUBI+e-Sevai)&t=&z=16&ie=UTF8&iwloc=&output=embed`;
  }
};
