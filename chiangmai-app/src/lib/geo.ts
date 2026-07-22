const REFERENCE_POINT = { lat: 18.7877, lng: 98.993 }; // Tha Phae Gate, old city

export const CHIANGMAI_CENTER = REFERENCE_POINT;

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type DistanceBucket = "walkable" | "short-ride" | "day-trip";

export function distanceBucketFrom(coords: { lat: number; lng: number }): DistanceBucket {
  const km = haversineKm(REFERENCE_POINT, coords);
  if (km <= 2.5) return "walkable";
  if (km <= 15) return "short-ride";
  return "day-trip";
}
