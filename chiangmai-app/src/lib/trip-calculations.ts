import type { Place, PlaceCategory } from "@/data/types";
import { haversineKm } from "@/lib/geo";

export const SPEND_ESTIMATE_THB: Record<Place["priceLevel"], number> = {
  1: 250,
  2: 700,
  3: 1800,
};

const AVG_SPEED_KMH = 22;
const MIN_TRAVEL_MINUTES = 5;
const TRANSPORT_THB_PER_KM = 8;

export function estimateTravelMinutes(a: Place, b: Place) {
  const km = haversineKm(a.coordinates, b.coordinates);
  return Math.max(MIN_TRAVEL_MINUTES, Math.round((km / AVG_SPEED_KMH) * 60));
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
      const km = haversineKm(day.places[i].coordinates, day.places[i + 1].coordinates);
      transport += Math.round(km * TRANSPORT_THB_PER_KM);
    }
  }

  return { entry, food, transport, total: entry + food + transport };
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
