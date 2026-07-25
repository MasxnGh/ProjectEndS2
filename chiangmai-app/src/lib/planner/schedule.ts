import type { Place } from "@/data/types";
import { haversineKm, type TerrainType } from "@/lib/geo/distance";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";
import { optimizeRoute } from "@/lib/geo/route";
import { isOutsideHours } from "@/lib/opening-hours";

const DEFAULT_DAY_START = "09:00";
const TEN_HOURS_MINUTES = 600;

export interface ScheduleStop {
  place: Place;
  travelMinutesFromPrevious: number;
  arrival: string;
  departure: string;
  /** True only when the place's opening hours are known (parseable) and the visit would fall outside them — unknown/irregular hours never trigger this. */
  outsideOpeningHours: boolean;
}

export interface DaySchedule {
  order: Place[];
  stops: ScheduleStop[];
  /** Straight-line total — the same metric optimizeRoute minimizes, kept comparable between before/after. */
  totalDistanceKm: number;
  totalTravelMinutes: number;
  totalVisitMinutes: number;
  totalMinutes: number;
  exceedsTenHours: boolean;
}

export interface OptimizationComparison {
  before: DaySchedule;
  after: DaySchedule;
  distanceSavedKm: number;
  minutesSaved: number;
  changed: boolean;
}

function terrainBetween(a: Place, b: Place): TerrainType {
  return a.elevation || b.elevation ? "mountain" : "urban";
}

function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

function minutesToClock(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function isOutsideOpeningHours(place: Place, arrivalMinutes: number, departureMinutes: number): boolean {
  return isOutsideHours(place.openingHours, arrivalMinutes, departureMinutes);
}

/**
 * Simulates a day's clock: for a given stop order (no reordering here),
 * works out an approximate arrival/departure time at each stop by chaining
 * travel time (terrain-aware) and visit duration from a nominal start time.
 * This is an estimate for planning purposes, not a guarantee — opening
 * hours are only checked where they're confidently parseable.
 */
export function buildSchedule(order: Place[], dayStartClock: string = DEFAULT_DAY_START): DaySchedule {
  let cursor = clockToMinutes(dayStartClock);
  let totalDistanceKm = 0;
  let totalTravelMinutes = 0;
  let totalVisitMinutes = 0;
  const stops: ScheduleStop[] = [];

  order.forEach((place, i) => {
    let travelMinutes = 0;
    if (i > 0) {
      const prev = order[i - 1];
      travelMinutes = estimateTravelMinutes(prev.coordinates, place.coordinates, terrainBetween(prev, place));
      totalDistanceKm += haversineKm(prev.coordinates, place.coordinates);
      cursor += travelMinutes;
    }
    const arrivalMinutes = cursor;
    const departureMinutes = arrivalMinutes + place.durationMinutes;

    stops.push({
      place,
      travelMinutesFromPrevious: travelMinutes,
      arrival: minutesToClock(arrivalMinutes),
      departure: minutesToClock(departureMinutes),
      outsideOpeningHours: isOutsideOpeningHours(place, arrivalMinutes, departureMinutes),
    });

    totalTravelMinutes += travelMinutes;
    totalVisitMinutes += place.durationMinutes;
    cursor = departureMinutes;
  });

  const totalMinutes = totalTravelMinutes + totalVisitMinutes;
  return {
    order,
    stops,
    totalDistanceKm,
    totalTravelMinutes,
    totalVisitMinutes,
    totalMinutes,
    exceedsTenHours: totalMinutes > TEN_HOURS_MINUTES,
  };
}

type BestTimeBucket = "morning" | "flexible" | "evening";

function bestTimeBucket(place: Place): BestTimeBucket {
  if (place.bestTime.length === 1 && place.bestTime[0] === "morning") return "morning";
  if (place.bestTime.length === 1 && place.bestTime[0] === "evening") return "evening";
  return "flexible";
}

/**
 * Orders a day's stops: nearest-neighbour + 2-opt (see lib/geo/route.ts) for
 * the shortest route, then a light second pass that pulls morning-only
 * places (sunrise viewpoints, misty ridges) to the front and evening-only
 * places (night markets) to the back — without disturbing the relative
 * order the first pass found within each group. This is a heuristic, not a
 * guarantee every constraint is satisfiable; buildSchedule's
 * outsideOpeningHours flag is what surfaces any remaining conflict.
 *
 * `externalDurationMatrix` (e.g. a real travel-time matrix from
 * lib/routing) drives which order counts as "shortest" — pass one to
 * optimize against real travel time instead of straight-line distance
 * (Phase 1's routing layer). Its indices must line up with `places`.
 */
export function optimizeDayOrder(places: Place[], externalDurationMatrix?: number[][]): Place[] {
  if (places.length <= 2) return places;

  const { items: geoOrder } = optimizeRoute(places, (p) => p.coordinates, 0, externalDurationMatrix);

  const morning = geoOrder.filter((p) => bestTimeBucket(p) === "morning");
  const evening = geoOrder.filter((p) => bestTimeBucket(p) === "evening");
  const flexible = geoOrder.filter((p) => bestTimeBucket(p) === "flexible");

  return [...morning, ...flexible, ...evening];
}

/**
 * Builds the before/after comparison a confirm UI needs, without applying
 * anything. `before`/`after` schedules always compute their own
 * displayed distance/duration independently (Haversine + terrain-aware
 * estimate, same as ever) — `externalDurationMatrix` only influences which
 * order optimizeDayOrder picks as "best", not what gets displayed for it.
 */
export function compareOptimization(
  currentOrder: Place[],
  dayStartClock?: string,
  externalDurationMatrix?: number[][]
): OptimizationComparison {
  const before = buildSchedule(currentOrder, dayStartClock);
  const optimizedOrder = optimizeDayOrder(currentOrder, externalDurationMatrix);
  const after = buildSchedule(optimizedOrder, dayStartClock);

  return {
    before,
    after,
    distanceSavedKm: before.totalDistanceKm - after.totalDistanceKm,
    minutesSaved: before.totalTravelMinutes - after.totalTravelMinutes,
    changed: optimizedOrder.map((p) => p.slug).join(",") !== currentOrder.map((p) => p.slug).join(","),
  };
}
