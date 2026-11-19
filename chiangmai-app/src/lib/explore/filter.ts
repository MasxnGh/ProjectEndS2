import type { BestTime, District, Place, PlaceCategory, PriceLevel } from "@/data/types";
import type { Dictionary } from "@/i18n";
import { locateInSquare, type SquareBucket } from "@/lib/city-square";
import { distanceBucketFrom, type DistanceBucket } from "@/lib/geo";

/** Everything Explore can narrow by, apart from "near a point", which is a radius on top. */
export interface ExploreFilters {
  query: string;
  category: PlaceCategory | null;
  zone: SquareBucket | null;
  district: District | null;
  price: PriceLevel | null;
  time: BestTime | null;
  distance: DistanceBucket | null;
}

export type ExploreFilterKey = keyof ExploreFilters;

export const EMPTY_FILTERS: ExploreFilters = {
  query: "",
  category: null,
  zone: null,
  district: null,
  price: null,
  time: null,
  distance: null,
};

/** What one place is matched against, worked out once per place rather than on every keystroke. */
export interface PlaceFacts {
  haystack: string;
  zone: SquareBucket;
  distance: DistanceBucket;
}

/**
 * The text a search is matched against. Names and blurbs in both languages,
 * the tags (which carry the dish and theme words people actually type — "khao
 * soi", "ข้าวซอย", "waterfall"), and now the district and category in the
 * reader's language plus the district's key, so "นิมมาน" or "nimman" finds
 * the places in Nimman.
 */
export function placeFacts(
  place: Pick<Place, "name" | "shortDescription" | "tags" | "district" | "category" | "coordinates">,
  dict: Dictionary,
): PlaceFacts {
  const haystack = [
    place.name.en,
    place.name.th,
    place.shortDescription.en,
    place.shortDescription.th,
    place.tags.join(" "),
    place.district,
    dict.common.districts[place.district] ?? "",
    dict.common.categories[place.category],
  ]
    .join(" ")
    .toLowerCase();
  return { haystack, zone: locateInSquare(place.coordinates).bucket, distance: distanceBucketFrom(place.coordinates) };
}

/** The query split into words; a place must contain every one. Thai is usually one word, and that is fine. */
export function queryTerms(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

/**
 * Whether a place passes the filters. `skip` leaves one filter out, which is
 * how a chip can show how many results it would give: the count under every
 * other filter that is on.
 */
export function matchesFilters(
  place: Pick<Place, "category" | "district" | "priceLevel" | "bestTime">,
  facts: PlaceFacts,
  filters: ExploreFilters,
  terms: string[],
  skip?: ExploreFilterKey,
): boolean {
  if (skip !== "query" && terms.some((term) => !facts.haystack.includes(term))) return false;
  if (skip !== "category" && filters.category && place.category !== filters.category) return false;
  if (skip !== "zone" && filters.zone && facts.zone !== filters.zone) return false;
  if (skip !== "district" && filters.district && place.district !== filters.district) return false;
  if (skip !== "price" && filters.price && place.priceLevel !== filters.price) return false;
  if (skip !== "time" && filters.time && !place.bestTime.includes(filters.time)) return false;
  if (skip !== "distance" && filters.distance && facts.distance !== filters.distance) return false;
  return true;
}
