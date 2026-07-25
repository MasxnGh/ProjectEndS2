import { ORS_BASE_URL, getOrsApiKey, orsProfile } from "../config";
import type {
  DirectionsResult,
  GeoJsonFeatureCollection,
  IsochroneResult,
  MatrixResult,
  RoutePoint,
  RoutingMode,
  RoutingProvider,
} from "../types";

interface OrsDirectionsResponse {
  features: Array<{
    geometry: { coordinates: [number, number][] };
    properties: { summary: { distance: number; duration: number } };
  }>;
}

interface OrsMatrixResponse {
  durations: number[][];
  distances: number[][];
}

async function orsFetch<T>(path: string, body: unknown): Promise<T> {
  const key = getOrsApiKey();
  if (!key) throw new Error("OpenRouteService is not configured");

  const res = await fetch(`${ORS_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: key,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OpenRouteService request failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json();
}

export const openRouteServiceProvider: RoutingProvider = {
  name: "openrouteservice",

  async getDirections(from, to, mode) {
    const profile = orsProfile(mode);
    const data = await orsFetch<OrsDirectionsResponse>(`/v2/directions/${profile}/geojson`, {
      coordinates: [
        [from.lng, from.lat],
        [to.lng, to.lat],
      ],
    });
    const feature = data.features[0];
    if (!feature) throw new Error("OpenRouteService returned no route");

    return {
      distanceKm: feature.properties.summary.distance / 1000,
      durationMinutes: feature.properties.summary.duration / 60,
      geometry: feature.geometry.coordinates,
      isEstimate: false,
    } satisfies DirectionsResult;
  },

  async getMatrix(points: RoutePoint[], mode: RoutingMode) {
    const profile = orsProfile(mode);
    const data = await orsFetch<OrsMatrixResponse>(`/v2/matrix/${profile}`, {
      locations: points.map((p) => [p.lng, p.lat]),
      metrics: ["duration", "distance"],
    });

    return {
      durations: data.durations.map((row) => row.map((seconds) => seconds / 60)),
      distances: data.distances.map((row) => row.map((meters) => meters / 1000)),
      isEstimate: false,
    } satisfies MatrixResult;
  },

  async getIsochrone(point, minutesList, mode) {
    const profile = orsProfile(mode);
    const geojson = await orsFetch<GeoJsonFeatureCollection>(`/v2/isochrones/${profile}`, {
      locations: [[point.lng, point.lat]],
      range: minutesList.map((m) => m * 60),
      range_type: "time",
    });

    return { geojson, isEstimate: false } satisfies IsochroneResult;
  },
};
