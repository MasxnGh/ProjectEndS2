import type { LatLng } from "./distance";

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Smallest box covering every point, or null if the list is empty. */
export function computeBoundingBox(points: LatLng[]): BoundingBox | null {
  if (points.length === 0) return null;

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (const { lat, lng } of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return { minLat, maxLat, minLng, maxLng };
}

/** [[west, south], [east, north]] — the shape MapLibre's `fitBounds` expects. */
export function boundingBoxToLngLatBounds(box: BoundingBox): [[number, number], [number, number]] {
  return [
    [box.minLng, box.minLat],
    [box.maxLng, box.maxLat],
  ];
}

/** Centre point of a bounding box. */
export function boundingBoxCenter(box: BoundingBox): LatLng {
  return { lat: (box.minLat + box.maxLat) / 2, lng: (box.minLng + box.maxLng) / 2 };
}
