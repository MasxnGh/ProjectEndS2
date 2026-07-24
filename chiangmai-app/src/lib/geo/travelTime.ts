import { estimateRoadDistanceKm, type LatLng, type TerrainType } from "./distance";

const AVG_SPEED_KMH: Record<TerrainType, number> = {
  urban: 22,
  suburban: 32,
  mountain: 28,
};

const MIN_TRAVEL_MINUTES = 5;

/**
 * Rough travel time between two points: apply the terrain's detour factor to
 * get an approximate road distance, then divide by a typical speed for that
 * terrain. This is an estimate for itinerary planning, not a live routing
 * result — always label it as approximate in the UI.
 */
export function estimateTravelMinutes(a: LatLng, b: LatLng, terrain: TerrainType = "urban"): number {
  const roadKm = estimateRoadDistanceKm(a, b, terrain);
  const minutes = (roadKm / AVG_SPEED_KMH[terrain]) * 60;
  return Math.max(MIN_TRAVEL_MINUTES, Math.round(minutes));
}
