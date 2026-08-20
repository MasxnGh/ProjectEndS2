import type { Place } from "@/data/types";
import { haversineKm, type LatLng } from "@/lib/geo/distance";

export type ExploreSort = "recommended" | "rating" | "nearest" | "shortest";

export const EXPLORE_SORTS: readonly ExploreSort[] = [
  "recommended",
  "rating",
  "nearest",
  "shortest",
];

/**
 * Orders the explore results.
 *
 * Until now there was no ordering at all: the grid rendered the catalogue in
 * file order, so 193 places always came out temples-first and someone
 * filtering to cafés got them in whatever sequence they happen to sit in
 * `src/data/places/cafes.ts`. With 24 shown at a time that meant the last
 * two-thirds of any category were effectively unreachable.
 *
 * `recommended` deliberately keeps that original order — it is the editorial
 * sequence the catalogue was written in, and it stays the default so nobody's
 * existing links or expectations shift underneath them.
 *
 * Sorting never mutates the input, and every comparison falls back to slug so
 * the order is stable across renders rather than depending on the engine's
 * sort implementation.
 */
export function sortPlaces(
  places: Place[],
  sort: ExploreSort,
  reference: LatLng | null
): Place[] {
  if (sort === "recommended") return places;

  // "Nearest" is meaningless without somewhere to be near, so it degrades to
  // the editorial order rather than to an arbitrary one.
  if (sort === "nearest" && !reference) return places;

  const bySlug = (a: Place, b: Place) => a.slug.localeCompare(b.slug);

  return [...places].sort((a, b) => {
    switch (sort) {
      case "rating":
        return b.rating - a.rating || bySlug(a, b);
      case "shortest":
        return a.durationMinutes - b.durationMinutes || bySlug(a, b);
      case "nearest": {
        const distanceA = haversineKm(reference!, a.coordinates);
        const distanceB = haversineKm(reference!, b.coordinates);
        return distanceA - distanceB || bySlug(a, b);
      }
      default:
        return 0;
    }
  });
}

/** Whether this sort can do anything useful right now — "nearest" needs a reference point. */
export function isSortAvailable(sort: ExploreSort, reference: LatLng | null): boolean {
  return sort !== "nearest" || reference !== null;
}
