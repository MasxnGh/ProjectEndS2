import type { Place, PlaceCategory } from "@/data/types";
import { estimateRoadDistanceKm, terrainBetween } from "@/lib/geo/distance";
import { estimateTravelMinutes as estimateRoadTravelMinutes } from "@/lib/geo/travelTime";

export const SPEND_ESTIMATE_THB: Record<Place["priceLevel"], number> = {
  1: 250,
  2: 700,
  3: 1800,
};

const TRANSPORT_THB_PER_KM = 8;

/** Terrain-adjusted road-time estimate — same basis as schedule.ts/golden-hour.ts, so the day cards, budget, and Timeline never disagree. */
export function estimateTravelMinutes(a: Place, b: Place) {
  return estimateRoadTravelMinutes(a.coordinates, b.coordinates, terrainBetween(a, b));
}

export function dayStats(dayPlaces: Place[]) {
  const onSiteMinutes = dayPlaces.reduce((sum, p) => sum + p.durationMinutes, 0);
  let travelMinutes = 0;
  for (let i = 0; i < dayPlaces.length - 1; i++) {
    travelMinutes += estimateTravelMinutes(dayPlaces[i], dayPlaces[i + 1]);
  }
  const budgetThb = dayPlaces.reduce((sum, p) => sum + SPEND_ESTIMATE_THB[p.priceLevel], 0);
  return {
    onSiteMinutes,
    travelMinutes,
    totalMinutes: onSiteMinutes + travelMinutes,
    budgetThb,
  };
}

function categoryBucket(category: PlaceCategory): "entry" | "food" {
  return category === "market" || category === "cafe" ? "food" : "entry";
}

export function categorySpendBreakdown(days: { places: Place[] }[]) {
  let entry = 0;
  let food = 0;
  let transport = 0;

  for (const day of days) {
    for (const place of day.places) {
      const spend = SPEND_ESTIMATE_THB[place.priceLevel];
      if (categoryBucket(place.category) === "food") food += spend;
      else entry += spend;
    }
    for (let i = 0; i < day.places.length - 1; i++) {
      const a = day.places[i];
      const b = day.places[i + 1];
      const km = estimateRoadDistanceKm(a.coordinates, b.coordinates, terrainBetween(a, b));
      transport += Math.round(km * TRANSPORT_THB_PER_KM);
    }
  }

  return { entry, food, transport, total: entry + food + transport };
}

/**
 * The one "estimated cost" figure shown across the planner — the top stats
 * bar and Summary → Budget must both call this rather than adding up their
 * own totals, or the two numbers drift apart. Entry/food scale per
 * traveller; transport is a shared ride/vehicle cost, not per-person;
 * accommodation is the flat amount the user typed in.
 */
export function estimateTripCostThb(
  breakdown: { entry: number; food: number; transport: number },
  travelers: number,
  accommodationThb: number
): number {
  return (breakdown.entry + breakdown.food) * travelers + breakdown.transport + accommodationThb;
}

export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hr` : `${hours} hr ${rest} min`;
}

export function formatThb(amount: number) {
  return `฿${amount.toLocaleString("en-US")}`;
}
