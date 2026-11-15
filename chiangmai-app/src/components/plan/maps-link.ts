import type { Place } from "@/data/types";
import type { Dictionary } from "@/i18n";
import { googleMapsDirectionsUrl, googleMapsPlaceUrl } from "@/lib/google-maps";
import { fill } from "@/components/brand/place-text";

/**
 * A day's way out to Google Maps, and what to call it. Maps takes nine stops
 * between the ends; a longer day loses some, and the label says how many —
 * the same rule as the old OpenInMapsLink, in one place for every surface.
 */
export function dayMapsLink(
  places: Place[],
  dict: Dictionary,
  routeLabel: string = dict.plan.map.openDay,
): { href: string; label: string } | null {
  const directions = googleMapsDirectionsUrl(places);
  const href = directions.url || (places.length === 1 ? googleMapsPlaceUrl(places[0]) : "");
  if (!href) return null;
  const label =
    places.length === 1
      ? dict.plan.map.openPlace
      : directions.omitted > 0
        ? fill(dict.planner.route.openInGoogleMapsTrimmed, { count: directions.omitted })
        : routeLabel;
  return { href, label };
}
