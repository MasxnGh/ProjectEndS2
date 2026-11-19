import type { Place } from "@/data/types";

/**
 * The part of a place the explore page reads: what the cards, the map, the
 * filters, the sort and the search need. The page hands every place to the
 * browser at once, so the long text (description, hours, notes, dishes, the
 * story) stayed out: with it, `/th/explore` came to 1.1 MB of HTML in a
 * production build, three quarters of it this list. Add a field here only
 * when the explore page shows or filters by it.
 *
 * Both languages stay for the name and the blurb, because search matches
 * either ("doi suthep" finds it on the Thai page too).
 */
export type ExplorePlace = Pick<
  Place,
  | "slug"
  | "name"
  | "category"
  | "district"
  | "bestTime"
  | "durationMinutes"
  | "priceLevel"
  | "rating"
  | "shortDescription"
  | "coordinates"
  | "tags"
>;

export function toExplorePlace(place: Place): ExplorePlace {
  return {
    slug: place.slug,
    name: place.name,
    category: place.category,
    district: place.district,
    bestTime: place.bestTime,
    durationMinutes: place.durationMinutes,
    priceLevel: place.priceLevel,
    rating: place.rating,
    shortDescription: place.shortDescription,
    coordinates: place.coordinates,
    tags: place.tags,
  };
}
