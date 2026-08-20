import type { Place, TravelMode } from "@/data/types";
import { estimateRoadDistanceKm, terrainBetween } from "@/lib/geo/distance";

/**
 * Typical Chiang Mai transport speeds/fares as of the mid-2020s —
 * reasonable approximations for RELATIVE comparison between modes, not a
 * live quote. Never present these numbers as exact; always disclose them
 * as typical/approximate in the UI, the same way schedule.ts's terrain
 * detour factors are disclosed as estimates rather than routed distances.
 */
const VEHICLE_SPEED_KMH: Record<TravelMode, number> = {
  walk: 4.5,
  songthaew: 20,
  grab: 25,
  "rented-bike": 32,
  "rented-car": 35,
};

const SONGTHAEW_FARE_PER_LEG_THB = 30;
const GRAB_BASE_FARE_THB = 45;
const GRAB_PER_KM_THB = 9;
const BIKE_RENTAL_PER_DAY_THB = 200;
const BIKE_FUEL_PER_KM_THB = 1.5;
const CAR_RENTAL_PER_DAY_THB = 900;
const CAR_FUEL_PER_KM_THB = 3;

export interface VehicleComparisonRow {
  mode: TravelMode;
  totalTravelMinutes: number;
  totalCostThb: number;
}

/**
 * Compares every travel mode over the whole trip's actual scheduled
 * distance: total time (distance ÷ that mode's typical speed) and total
 * approximate cost (walking is free; songthaew and Grab charge per ride;
 * rented bike/car charge a flat daily rate plus fuel). `days` should only
 * include days that actually have stops — an empty day contributes no
 * distance and no rental day.
 */
export const TRAVEL_MODES: readonly TravelMode[] = [
  "walk",
  "songthaew",
  "grab",
  "rented-bike",
  "rented-car",
];

/** The distance/leg/day totals every mode is priced against. */
export interface TripTravelTotals {
  totalDistanceKm: number;
  totalLegs: number;
  dayCount: number;
}

export function tripTravelTotals(days: { places: Place[] }[]): TripTravelTotals {
  const usedDays = days.filter((d) => d.places.length > 0);

  let totalDistanceKm = 0;
  let totalLegs = 0;
  for (const day of usedDays) {
    for (let i = 1; i < day.places.length; i++) {
      const terrain = terrainBetween(day.places[i - 1], day.places[i]);
      totalDistanceKm += estimateRoadDistanceKm(day.places[i - 1].coordinates, day.places[i].coordinates, terrain);
      totalLegs++;
    }
  }

  return { totalDistanceKm, totalLegs, dayCount: usedDays.length };
}

/**
 * What one mode costs over the whole trip.
 *
 * The single place this arithmetic lives: the comparison table and the
 * headline "estimated cost" both call it, so the row a traveller selects and
 * the total they are shown can never disagree — which they did, with Walk
 * reading ฿0 in the table while the total still billed 8 THB/km.
 */
export function modeCostThb(mode: TravelMode, totals: TripTravelTotals): number {
  const { totalDistanceKm, totalLegs, dayCount } = totals;

  switch (mode) {
    case "walk":
      return 0;
    case "songthaew":
      return Math.round(totalLegs * SONGTHAEW_FARE_PER_LEG_THB);
    case "grab":
      return totalLegs > 0
        ? Math.round(totalLegs * GRAB_BASE_FARE_THB + totalDistanceKm * GRAB_PER_KM_THB)
        : 0;
    // Rental is charged per day you have the vehicle, not per kilometre
    // ridden — a day with a single stop still costs a full day's rental.
    case "rented-bike":
      return Math.round(dayCount * BIKE_RENTAL_PER_DAY_THB + totalDistanceKm * BIKE_FUEL_PER_KM_THB);
    case "rented-car":
      return Math.round(dayCount * CAR_RENTAL_PER_DAY_THB + totalDistanceKm * CAR_FUEL_PER_KM_THB);
  }
}

export function compareVehicleModes(days: { places: Place[] }[]): VehicleComparisonRow[] {
  const totals = tripTravelTotals(days);

  return TRAVEL_MODES.map((mode) => ({
    mode,
    totalTravelMinutes: Math.round((totals.totalDistanceKm / VEHICLE_SPEED_KMH[mode]) * 60),
    totalCostThb: modeCostThb(mode, totals),
  }));
}
