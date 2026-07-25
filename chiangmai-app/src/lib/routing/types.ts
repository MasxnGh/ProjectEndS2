export type RoutingMode = "driving" | "cycling" | "walking";

export interface RoutePoint {
  lat: number;
  lng: number;
  /** Metres above sea level, when known — lets the fallback provider pick a mountain detour factor. */
  elevation?: number | null;
}

export interface GeoJsonFeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: { type: string; coordinates: unknown };
  }>;
}

export interface DirectionsResult {
  distanceKm: number;
  durationMinutes: number;
  /** [lng, lat] pairs (GeoJSON order). null when no real polyline is available — draw a straight line between the two points instead. */
  geometry: [number, number][] | null;
  /** True when this came from the Haversine+detour-factor fallback rather than a real routing engine. */
  isEstimate: boolean;
}

export interface MatrixResult {
  /** durations[i][j] = minutes from points[i] to points[j]. */
  durations: number[][];
  /** distances[i][j] = kilometres from points[i] to points[j]. */
  distances: number[][];
  isEstimate: boolean;
}

export interface IsochroneResult {
  geojson: GeoJsonFeatureCollection;
  isEstimate: boolean;
}

export interface RoutingProvider {
  name: string;
  getDirections(from: RoutePoint, to: RoutePoint, mode: RoutingMode): Promise<DirectionsResult>;
  getMatrix(points: RoutePoint[], mode: RoutingMode): Promise<MatrixResult>;
  /** `minutesList` — one polygon per requested time budget (e.g. [10, 20, 30]). */
  getIsochrone(point: RoutePoint, minutesList: number[], mode: RoutingMode): Promise<IsochroneResult>;
}
