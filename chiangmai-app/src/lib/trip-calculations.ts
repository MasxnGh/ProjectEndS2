import type { Place, PlaceCategory, TravelMode } from "@/data/types";
import { terrainBetween } from "@/lib/geo/distance";
import { estimateTravelMinutes as estimateRoadTravelMinutes } from "@/lib/geo/travelTime";
import { countUnplannedMeals } from "@/lib/planner/meals";
import { modeCostThb, tripTravelTotals } from "@/lib/planner/vehicle-comparison";

export const SPEND_ESTIMATE_THB: Record<Place["priceLevel"], number> = {
  1: 250,
  2: 700,
  3: 1800,
};

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
  return category === "market" || category === "cafe" || category === "restaurant"
    ? "food"
    : "entry";
}

/**
 * What one meal the itinerary does not name is assumed to cost.
 *
 * Deliberately the catalogue's own price-level-1 figure rather than a second
 * invented scale: adding a cheap restaurant to the plan and leaving that meal
 * unplanned then cost the same, so the total does not lurch when a traveller
 * fills the gap in.
 */
export const ASSUMED_MEAL_THB = SPEND_ESTIMATE_THB[1];

/**
 * `travelMode` decides what the trip's kilometres actually cost — walking is
 * free, a rented car is a daily rate plus fuel. Callers must pass the mode
 * the traveller selected, or the total will disagree with the mode they see
 * highlighted in Summary → Transport.
 */
export function categorySpendBreakdown(
  days: { places: Place[] }[],
  travelMode: TravelMode = "walk"
) {
  let entry = 0;
  let food = 0;

  for (const day of days) {
    for (const place of day.places) {
      const spend = SPEND_ESTIMATE_THB[place.priceLevel];
      if (categoryBucket(place.category) === "food") food += spend;
      else entry += spend;
    }
  }

  const transport = modeCostThb(travelMode, tripTravelTotals(days));

  // A day out that runs through lunch still costs lunch money. Counting only
  // the food stops someone remembered to drag in reports ฿0 for a full day of
  // temples, which is the one number in this planner most likely to be wrong
  // in a way that matters. Kept as its own field so the Budget panel can show
  // the assumption instead of burying it in "food".
  const assumedMeals = countUnplannedMeals(days) * ASSUMED_MEAL_THB;

  return {
    entry,
    food,
    transport,
    assumedMeals,
    total: entry + food + transport + assumedMeals,
  };
}

/**
 * The one "estimated cost" figure shown across the planner — the top stats
 * bar and Summary → Budget must both call this rather than adding up their
 * own totals, or the two numbers drift apart. Entry/food/assumed meals scale
 * per traveller; transport is a shared ride/vehicle cost, not per-person;
 * accommodation is the flat amount the user typed in.
 */
export function estimateTripCostThb(
  breakdown: { entry: number; food: number; transport: number; assumedMeals?: number },
  travelers: number,
  accommodationThb: number
): number {
  const perPerson = breakdown.entry + breakdown.food + (breakdown.assumedMeals ?? 0);
  return perPerson * travelers + breakdown.transport + accommodationThb;
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
