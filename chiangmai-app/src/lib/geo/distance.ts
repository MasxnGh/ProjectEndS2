export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two points, in kilometres (Haversine formula). */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, h)));
}

export type TerrainType = "urban" | "suburban" | "mountain";

/**
 * Straight-line (Haversine) distance understates real road distance a lot
 * around Chiang Mai — the old-city grid, the flatter suburbs, and the
 * switchback mountain roads up to Doi Suthep/Inthanon each detour from
 * straight-line by a different amount. These multipliers turn a Haversine
 * distance into a rough road-distance estimate; always present the result
 * as approximate, never as an exact figure.
 */
export const DETOUR_FACTORS: Record<TerrainType, number> = {
  urban: 1.3,
  suburban: 1.4,
  mountain: 1.8,
};

/** Approximate road distance in kilometres, applying a terrain-specific detour factor. */
export function estimateRoadDistanceKm(a: LatLng, b: LatLng, terrain: TerrainType = "urban"): number {
  return haversineKm(a, b) * DETOUR_FACTORS[terrain];
}
