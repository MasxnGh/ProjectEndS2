import type { Place } from "@/data/types";

/**
 * Building a Google Maps directions link for a day of the plan.
 *
 * The Maps URL API takes an origin, a destination and **at most nine
 * waypoints** between them — eleven stops in total. A longer day silently loses
 * the overflow if you just join every coordinate, which is the worst possible
 * failure for a navigation link: it opens, it looks right, and it quietly skips
 * places. So the count is capped here and the caller is told how many were left
 * out, to say so rather than pretend.
 *
 * Coordinates rather than names, on purpose. A search string like "Wat Chedi
 * Luang" resolves to whatever Google decides it means today; the catalogue's own
 * pins are the ones the rest of this site plans around, and they are what should
 * open on the phone.
 */

/** Google Maps URL API: origin + destination + this many stops in between. */
export const MAX_WAYPOINTS = 9;

export interface DirectionsLink {
  /** Empty when there is nothing to route — fewer than two stops. */
  url: string;
  /** How many of the day's stops the link actually contains. */
  included: number;
  /** How many had to be dropped to fit the waypoint limit. */
  omitted: number;
}

export type TravelMode = "driving" | "walking" | "bicycling" | "transit";

/**
 * Six decimals is about 10cm, which is far past what a pin means. Rounding
 * also keeps floating-point noise — 18.781000000000002 — out of a URL a
 * person may see or paste.
 */
const round6 = (n: number) => Number(n.toFixed(6));
const coord = (place: Place) =>
  `${round6(place.coordinates.lat)},${round6(place.coordinates.lng)}`;

/**
 * Keeps the first and last stop and thins the middle when a day is too long.
 *
 * Dropping the tail would end the route in the wrong place, so the ends are
 * fixed and the intermediate stops are sampled at even spacing — the route
 * still starts and finishes where the day does, and passes through the day in
 * order, with the closest-together stops the first to go.
 */
function fitWaypoints(middle: Place[]): Place[] {
  if (middle.length <= MAX_WAYPOINTS) return middle;
  const step = middle.length / MAX_WAYPOINTS;
  const kept: Place[] = [];
  for (let i = 0; i < MAX_WAYPOINTS; i++) {
    kept.push(middle[Math.floor(i * step)]);
  }
  return kept;
}

export function googleMapsDirectionsUrl(
  placesInOrder: Place[],
  travelMode: TravelMode = "driving"
): DirectionsLink {
  // One stop is a place to look at, not a route. Google's directions action
  // needs somewhere to go from.
  if (placesInOrder.length < 2) return { url: "", included: 0, omitted: 0 };

  const origin = placesInOrder[0];
  const destination = placesInOrder[placesInOrder.length - 1];
  const middle = placesInOrder.slice(1, -1);
  const kept = fitWaypoints(middle);

  const params = new URLSearchParams({
    api: "1",
    origin: coord(origin),
    destination: coord(destination),
    travelmode: travelMode,
  });
  if (kept.length > 0) params.set("waypoints", kept.map(coord).join("|"));

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    included: kept.length + 2,
    omitted: middle.length - kept.length,
  };
}

/**
 * A link that just shows one place, for a day with a single stop.
 *
 * Uses the same coordinates as everything else rather than a name search, so
 * the pin that opens is the pin the plan was built on.
 */
export function googleMapsPlaceUrl(place: Place): string {
  return `https://www.google.com/maps/search/?api=1&query=${coord(place)}`;
}
