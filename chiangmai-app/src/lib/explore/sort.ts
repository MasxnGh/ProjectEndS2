import type { Place } from "@/data/types";
import { getPlacePhoto } from "@/data/photo-manifest";
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
 * `recommended` keeps that original editorial sequence, but photographed
 * places come first within it. Only 39 of the catalogue's entries have a
 * verified photograph and the rest fall back to an illustrated placeholder, so
 * left alone the grid opened on whichever mix the file order happened to give —
 * often several placeholders in a row. Leading with the photographs is what a
 * browse page is for, and the illustrated entries are still all there, below.
 *
 * The explicit sorts answer the question they were asked — highest rated means
 * highest rated — so a photo is only a tiebreaker there.
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
  // A stable partition rather than a comparator: within each half the
  // catalogue's own order survives untouched, which is the point of
  // "recommended".
  const photographedFirst = (list: Place[]) => {
    const withPhoto: Place[] = [];
    const without: Place[] = [];
    for (const place of list) {
      (getPlacePhoto(place.slug) ? withPhoto : without).push(place);
    }
    return [...withPhoto, ...without];
  };

  if (sort === "recommended") return photographedFirst(places);

  // "Nearest" is meaningless without somewhere to be near, so it degrades to
  // the editorial order rather than to an arbitrary one.
  if (sort === "nearest" && !reference) return photographedFirst(places);

  const bySlug = (a: Place, b: Place) => a.slug.localeCompare(b.slug);
  const byPhoto = (a: Place, b: Place) =>
    Number(Boolean(getPlacePhoto(b.slug))) - Number(Boolean(getPlacePhoto(a.slug)));

  return [...places].sort((a, b) => {
    switch (sort) {
      case "rating":
        return b.rating - a.rating || byPhoto(a, b) || bySlug(a, b);
      case "shortest":
        return a.durationMinutes - b.durationMinutes || byPhoto(a, b) || bySlug(a, b);
      case "nearest": {
        const distanceA = haversineKm(reference!, a.coordinates);
        const distanceB = haversineKm(reference!, b.coordinates);
        return distanceA - distanceB || byPhoto(a, b) || bySlug(a, b);
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
