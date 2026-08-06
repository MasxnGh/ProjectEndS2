import { haversineKm, type LatLng } from "./distance";

export type LngLat = [number, number];

function toLatLng([lng, lat]: LngLat): LatLng {
  return { lat, lng };
}

/**
 * Returns the leading portion of a polyline up to fraction `t` (0–1) of its
 * total length, interpolating a point partway along whichever segment the
 * cut falls in — used to animate a route "drawing in" on the map frame by
 * frame. Uses straight-line distance between vertices to measure progress,
 * which is precise enough for a visual reveal (not for real routing).
 */
export function sliceLineProgress(coordinates: LngLat[], t: number): LngLat[] {
  if (coordinates.length < 2 || t >= 1) return coordinates;
  if (t <= 0) return [coordinates[0]];

  const segmentLengths: number[] = [];
  let total = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const length = haversineKm(toLatLng(coordinates[i]), toLatLng(coordinates[i + 1]));
    segmentLengths.push(length);
    total += length;
  }
  if (total === 0) return coordinates;

  const targetDistance = total * t;
  const result: LngLat[] = [coordinates[0]];
  let covered = 0;
  for (let i = 0; i < segmentLengths.length; i++) {
    const segmentLength = segmentLengths[i];
    if (covered + segmentLength >= targetDistance) {
      const segmentT = segmentLength === 0 ? 0 : (targetDistance - covered) / segmentLength;
      const [lng1, lat1] = coordinates[i];
      const [lng2, lat2] = coordinates[i + 1];
      result.push([lng1 + (lng2 - lng1) * segmentT, lat1 + (lat2 - lat1) * segmentT]);
      return result;
    }
    covered += segmentLength;
    result.push(coordinates[i + 1]);
  }
  return result;
}
