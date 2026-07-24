export * from "./distance";
export * from "./bbox";
export * from "./nearby";
export * from "./route";
export * from "./travelTime";

import { haversineKm, type LatLng } from "./distance";

const REFERENCE_POINT: LatLng = { lat: 18.7877, lng: 98.993 }; // Tha Phae Gate, old city

export const CHIANGMAI_CENTER = REFERENCE_POINT;

export type DistanceBucket = "walkable" | "short-ride" | "day-trip";

export function distanceBucketFrom(coords: LatLng): DistanceBucket {
  const km = haversineKm(REFERENCE_POINT, coords);
  if (km <= 2.5) return "walkable";
  if (km <= 15) return "short-ride";
  return "day-trip";
}
