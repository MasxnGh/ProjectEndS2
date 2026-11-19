import type { Place } from "@/data/types";
import { getPlacePhoto } from "@/data/photo-manifest";
import { haversineKm, type LatLng } from "@/lib/geo/distance";

/** What sorting reads; Explore passes a trimmed place (ExplorePlace), not the whole record. */
type SortablePlace = Pick<Place, "slug" | "rating" | "durationMinutes" | "coordinates">;

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
export function sortPlaces<T extends SortablePlace>(
  places: T[],
  sort: ExploreSort,
  reference: LatLng | null
): T[] {
  // A stable partition rather than a comparator: within each half the
  // catalogue's own order survives untouched, which is the point of
  // "recommended".
  const photographedFirst = (list: T[]) => {
    const withPhoto: T[] = [];
    const without: T[] = [];
    for (const place of list) {
      (getPlacePhoto(place.slug) ? withPhoto : without).push(place);
    }
    return [...withPhoto, ...without];
  };

  if (sort === "recommended") return photographedFirst(places);

  // "Nearest" is meaningless without somewhere to be near, so it degrades to
  // the editorial order rather than to an arbitrary one.
  if (sort === "nearest" && !reference) return photographedFirst(places);

  const bySlug = (a: T, b: T) => a.slug.localeCompare(b.slug);
  const byPhoto = (a: T, b: T) =>
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

/**
 * "Recommended" with no category chosen: the same order, dealt out one
 * category at a time.
 *
 * The catalogue files are grouped by category and temples come first, so the
 * unfiltered list used to open on two dozen temples before anything else —
 * which made the site look like a temple guide. This keeps everything else
 * about the order: photographed places still come first, and inside each
 * category the editorial sequence is untouched. Only the interleaving is new.
 */
export function mixCategories<T extends Pick<Place, "slug" | "category">>(places: T[]): T[] {
  const deal = (list: T[]) => {
    const queues = new Map<string, T[]>();
    for (const place of list) {
      const queue = queues.get(place.category);
      if (queue) queue.push(place);
      else queues.set(place.category, [place]);
    }
    const out: T[] = [];
    const lanes = [...queues.values()];
    for (let i = 0; out.length < list.length; i++) {
      for (const lane of lanes) if (i < lane.length) out.push(lane[i]);
    }
    return out;
  };
  const withPhoto = places.filter((p) => getPlacePhoto(p.slug));
  const without = places.filter((p) => !getPlacePhoto(p.slug));
  return [...deal(withPhoto), ...deal(without)];
}
