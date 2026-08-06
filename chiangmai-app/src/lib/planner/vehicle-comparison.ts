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
export function compareVehicleModes(days: { places: Place[] }[]): VehicleComparisonRow[] {
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
  const dayCount = usedDays.length;

  const modes: TravelMode[] = ["walk", "songthaew", "grab", "rented-bike", "rented-car"];

  return modes.map((mode) => {
    const totalTravelMinutes = Math.round((totalDistanceKm / VEHICLE_SPEED_KMH[mode]) * 60);

    let totalCostThb: number;
    switch (mode) {
      case "walk":
        totalCostThb = 0;
        break;
      case "songthaew":
        totalCostThb = totalLegs * SONGTHAEW_FARE_PER_LEG_THB;
        break;
      case "grab":
        totalCostThb = totalLegs > 0 ? totalLegs * GRAB_BASE_FARE_THB + totalDistanceKm * GRAB_PER_KM_THB : 0;
        break;
      case "rented-bike":
        totalCostThb = dayCount * BIKE_RENTAL_PER_DAY_THB + totalDistanceKm * BIKE_FUEL_PER_KM_THB;
        break;
      case "rented-car":
        totalCostThb = dayCount * CAR_RENTAL_PER_DAY_THB + totalDistanceKm * CAR_FUEL_PER_KM_THB;
        break;
    }

    return { mode, totalTravelMinutes, totalCostThb: Math.round(totalCostThb) };
  });
}
