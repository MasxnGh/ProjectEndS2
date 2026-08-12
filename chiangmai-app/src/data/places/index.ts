import type { Place } from "../types";
import { temples } from "./temples";
import { nature } from "./nature";
import { villages } from "./villages";
import { cafes } from "./cafes";
import { restaurants } from "./restaurants";
import { markets } from "./markets";
import { museums } from "./museums";
import { activities } from "./activities";

export { TEMPLE_DRESS_CODE } from "./shared";

/**
 * Every place on the site, grouped by category in the same order the category
 * filter pills use — the explore grid and planner picker render in this order,
 * so a place's position here is its default position on screen.
 */
export const places: Place[] = [
  ...temples,
  ...nature,
  ...villages,
  ...cafes,
  ...restaurants,
  ...markets,
  ...museums,
  ...activities,
];

const bySlug = new Map(places.map((place) => [place.slug, place]));

export function getPlaceBySlug(slug: string) {
  return bySlug.get(slug);
}
