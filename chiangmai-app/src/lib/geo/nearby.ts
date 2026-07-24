import { haversineKm, type LatLng } from "./distance";

export interface NearbyResult<T> {
  item: T;
  distanceKm: number;
}

/**
 * Radius query: returns every item within `radiusKm` of `center`, sorted
 * nearest-first. A genuine spatial calculation against live coordinates —
 * not a hand-curated "nearby places" list.
 */
export function findNearby<T>(
  center: LatLng,
  items: T[],
  radiusKm: number,
  getCoords: (item: T) => LatLng
): NearbyResult<T>[] {
  return items
    .map((item) => ({ item, distanceKm: haversineKm(center, getCoords(item)) }))
    .filter((result) => result.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/** Same as `findNearby` but excludes the item at `excludeIndex`-equivalent — handy for "nearby places" on a detail page where the current place shouldn't list itself. */
export function findNearbyExcluding<T>(
  center: LatLng,
  items: T[],
  radiusKm: number,
  getCoords: (item: T) => LatLng,
  isExcluded: (item: T) => boolean
): NearbyResult<T>[] {
  return findNearby(center, items, radiusKm, getCoords).filter((result) => !isExcluded(result.item));
}
