import type { Place, TravelMode } from "@/data/types";
import { estimateRoadDistanceKm, terrainBetween } from "@/lib/geo/distance";
import { VEHICLE_SPEED_KMH } from "@/lib/planner/vehicle-comparison";

/**
 * The longest hop a plan can call a walk without saying more: 2 km is about
 * 27 minutes at the 4.5 km/h the transport comparison already uses. The old
 * city is 1.6 km across, so anything inside the walls stays under it.
 */
export const WALKABLE_LEG_KM = 2;

export interface FarWalkLeg {
  from: Place;
  to: Place;
  distanceKm: number;
  /** What the hop would take on foot, by the comparison table's own speed. */
  walkMinutes: number;
}

/**
 * The day's schedule times every hop as a ride by road, whichever travel mode
 * is chosen: the mode decides the fare, not the clock. That is fine for a
 * songthaew or a rented bike, but with "walk" chosen a 13 km hop still shows
 * as 27 minutes. This finds the hop that makes the gap worth saying out loud:
 * the longest one over `WALKABLE_LEG_KM`, or null when the day really can be
 * walked or another mode is chosen. It reports; it changes no time.
 */
export function farthestWalkLeg(places: Place[], mode: TravelMode): FarWalkLeg | null {
  if (mode !== "walk") return null;

  let farthest: FarWalkLeg | null = null;
  for (let i = 1; i < places.length; i++) {
    const from = places[i - 1];
    const to = places[i];
    // The same distance the transport comparison prices, so the two agree.
    const distanceKm = estimateRoadDistanceKm(from.coordinates, to.coordinates, terrainBetween(from, to));
    if (distanceKm <= WALKABLE_LEG_KM) continue;
    if (!farthest || distanceKm > farthest.distanceKm) {
      farthest = {
        from,
        to,
        distanceKm,
        walkMinutes: Math.round((distanceKm / VEHICLE_SPEED_KMH.walk) * 60),
      };
    }
  }
  return farthest;
}
