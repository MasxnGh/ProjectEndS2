import turfCircle from "@turf/circle";
import { haversineKm, estimateRoadDistanceKm, terrainBetween, type TerrainType } from "@/lib/geo/distance";
import { estimateTravelMinutes, AVG_SPEED_KMH } from "@/lib/geo/travelTime";
import type {
  DirectionsResult,
  GeoJsonFeatureCollection,
  MatrixResult,
  IsochroneResult,
  RoutePoint,
  RoutingProvider,
} from "../types";

function terrainOf(point: RoutePoint): TerrainType {
  return point.elevation ? "mountain" : "urban";
}

/**
 * The always-available fallback: Haversine distance with a terrain-specific
 * detour factor, standing in for a real routing engine. Every result is
 * marked `isEstimate: true` so the UI can label it as approximate — this is
 * never meant to look as precise as a real routed path.
 */
export const fallbackRoutingProvider: RoutingProvider = {
  name: "haversine-fallback",

  async getDirections(from, to) {
    const terrain = terrainBetween(from, to);
    return {
      distanceKm: estimateRoadDistanceKm(from, to, terrain),
      durationMinutes: estimateTravelMinutes(from, to, terrain),
      geometry: null,
      isEstimate: true,
    } satisfies DirectionsResult;
  },

  async getMatrix(points) {
    const n = points.length;
    const durations: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    const distances: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const terrain = terrainBetween(points[i], points[j]);
        const d = estimateRoadDistanceKm(points[i], points[j], terrain);
        const t = estimateTravelMinutes(points[i], points[j], terrain);
        distances[i][j] = distances[j][i] = d;
        durations[i][j] = durations[j][i] = t;
      }
    }
    return { durations, distances, isEstimate: true } satisfies MatrixResult;
  },

  async getIsochrone(point, minutesList, mode) {
    const terrain = terrainOf(point);
    const speedKmh = mode === "walking" ? Math.min(AVG_SPEED_KMH[terrain], 5) : AVG_SPEED_KMH[terrain];
    const features = minutesList.map((minutes) => {
      const radiusKm = (speedKmh / 60) * minutes;
      const circle = turfCircle([point.lng, point.lat], Math.max(radiusKm, 0.05), {
        units: "kilometers",
        steps: 48,
      });
      return {
        type: "Feature" as const,
        properties: { minutes, isEstimate: true },
        geometry: circle.geometry,
      };
    });
    const geojson: GeoJsonFeatureCollection = { type: "FeatureCollection", features };
    return { geojson, isEstimate: true } satisfies IsochroneResult;
  },
};

// Re-exported for callers that just need a quick distance without going
// through the full provider interface (e.g. the fallback provider itself
// being unit-tested against known Haversine values).
export { haversineKm };
