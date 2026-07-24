import type { LatLng } from "@/lib/geo/distance";

export interface AqiLayerPoint {
  key: string;
  coordinates: LatLng;
}

export interface AqiLayerGroup extends AqiLayerPoint {
  members: string[];
}

/**
 * Groups points that round to the same coordinate (~100m at 3 decimal places)
 * so the overlay fires one air-quality request per distinct location instead
 * of one per place, then caps the number of distinct requests.
 */
export function groupPointsForAqiLayer(
  points: AqiLayerPoint[],
  { precision = 3, maxGroups = 60 }: { precision?: number; maxGroups?: number } = {}
): AqiLayerGroup[] {
  const groups = new Map<string, AqiLayerGroup>();
  for (const point of points) {
    const bucketKey = `${point.coordinates.lat.toFixed(precision)},${point.coordinates.lng.toFixed(precision)}`;
    const existing = groups.get(bucketKey);
    if (existing) {
      existing.members.push(point.key);
    } else {
      groups.set(bucketKey, { key: bucketKey, coordinates: point.coordinates, members: [point.key] });
    }
  }
  return Array.from(groups.values()).slice(0, maxGroups);
}

/** Maps a PM2.5 concentration (µg/m³) to a marker radius in pixels for the map overlay. */
export function pm25ToMarkerRadiusPx(pm2_5: number): number {
  const clamped = Math.max(0, Math.min(pm2_5, 150));
  return 5 + (clamped / 150) * 7;
}
