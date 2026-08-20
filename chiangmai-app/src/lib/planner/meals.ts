import type { Place, PlaceCategory } from "@/data/types";
import type { DaySchedule } from "@/lib/planner/schedule";
import { buildSchedule } from "@/lib/planner/schedule";
import { clockToMinutes, isOpenOnDay } from "@/lib/opening-hours";
import { isoDateDayOfWeek } from "@/lib/date-utils";
import { terrainBetween } from "@/lib/geo/distance";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";

export type MealId = "lunch" | "dinner";

export interface MealWindow {
  id: MealId;
  startMinutes: number;
  endMinutes: number;
}

/**
 * When people actually eat in Chiang Mai, not when a Western itinerary
 * template says they should. Lunch runs late because most kitchens do;
 * dinner starts early because the night markets do. Breakfast is
 * deliberately absent — it is almost always eaten at the accommodation,
 * which the planner does not model, so flagging it would be noise.
 */
export const MEAL_WINDOWS: readonly MealWindow[] = [
  { id: "lunch", startMinutes: 11 * 60 + 30, endMinutes: 14 * 60 },
  { id: "dinner", startMinutes: 18 * 60, endMinutes: 20 * 60 + 30 },
];

/**
 * The same three categories `trip-calculations.ts` buckets as "food" spend.
 * These two lists must agree: a stop that costs money as food has to also
 * count as having eaten, or the planner charges you for a meal and then
 * tells you that you skipped it.
 */
const FOOD_CATEGORIES: ReadonlySet<PlaceCategory> = new Set(["restaurant", "market", "cafe"]);

/**
 * How much of a meal window the day has to overlap before a missing meal is
 * worth mentioning. A day that ends at 12:00 clips the lunch window but the
 * traveller is going home to eat; a day still running at 13:00 is not.
 */
const MIN_WINDOW_OVERLAP_MINUTES = 45;

/** Nobody detours half an hour for lunch mid-itinerary. */
const DEFAULT_MAX_TRAVEL_MINUTES = 25;

export interface MealGap {
  meal: MealId;
  windowStartMinutes: number;
  windowEndMinutes: number;
  /**
   * Index in the day's stop list to insert a food stop after. -1 means the
   * window opens before the first stop, so the meal belongs at the front.
   */
  insertAfterIndex: number;
  /** The stop the traveller is at (or has most recently left) when the window opens — what suggestions are measured from. */
  anchorPlace: Place;
}

export interface MealSuggestion {
  place: Place;
  /** Estimated travel minutes from the anchor stop. */
  travelMinutes: number;
}

function overlapsWindow(startMinutes: number, endMinutes: number, window: MealWindow): boolean {
  return endMinutes > window.startMinutes && startMinutes < window.endMinutes;
}

/**
 * True when the place's own hours cover at least part of the window. Unknown
 * hours never exclude a place — the catalogue leaves `openingHours` null
 * wherever it could not be verified, and silently hiding those would drop
 * most of the street-food stalls.
 */
function isOpenDuringWindow(place: Place, window: MealWindow): boolean {
  if (!place.openingHours) return true;
  const opens = clockToMinutes(place.openingHours.opens);
  const closes = clockToMinutes(place.openingHours.closes);
  if (closes <= opens) return true; // spans midnight or malformed — don't guess
  return overlapsWindow(opens, closes, window);
}

/**
 * Finds the meal windows a day runs straight through without eating.
 *
 * This exists because the planner will happily schedule three temples from
 * 09:00 to 13:30 and then report a food budget of ฿0 — technically true of
 * the itinerary, and false about the day the traveller will actually have.
 */
export function findMealGaps(schedule: DaySchedule): MealGap[] {
  const { stops } = schedule;
  if (stops.length === 0) return [];

  const dayStart = clockToMinutes(stops[0].arrival);
  const dayEnd = clockToMinutes(stops[stops.length - 1].departure);
  const gaps: MealGap[] = [];

  for (const window of MEAL_WINDOWS) {
    const overlap = Math.min(window.endMinutes, dayEnd) - Math.max(window.startMinutes, dayStart);
    if (overlap < MIN_WINDOW_OVERLAP_MINUTES) continue;

    const alreadyEating = stops.some(
      (stop) =>
        FOOD_CATEGORIES.has(stop.place.category) &&
        overlapsWindow(clockToMinutes(stop.arrival), clockToMinutes(stop.departure), window)
    );
    if (alreadyEating) continue;

    let insertAfterIndex = -1;
    for (let i = 0; i < stops.length; i++) {
      if (clockToMinutes(stops[i].arrival) <= window.startMinutes) insertAfterIndex = i;
    }

    gaps.push({
      meal: window.id,
      windowStartMinutes: window.startMinutes,
      windowEndMinutes: window.endMinutes,
      insertAfterIndex,
      anchorPlace: stops[Math.max(0, insertAfterIndex)].place,
    });
  }

  return gaps;
}

/** Total meal windows across the trip that nothing has been planned for — what the budget's meal assumption is counted from. */
export function countUnplannedMeals(days: { places: Place[] }[]): number {
  return days.reduce((sum, day) => sum + findMealGaps(buildSchedule(day.places)).length, 0);
}

/**
 * Food places worth eating at during `gap`, nearest first.
 *
 * Filtered on the things that would make a suggestion useless rather than
 * merely imperfect: wrong category, already in the trip, closed that day of
 * the week, shut during the window, or too far to be a meal stop rather than
 * a destination.
 */
export function suggestMealPlaces({
  gap,
  candidates,
  excludeSlugs,
  isoDate,
  limit = 3,
  maxTravelMinutes = DEFAULT_MAX_TRAVEL_MINUTES,
}: {
  gap: MealGap;
  candidates: Place[];
  excludeSlugs: ReadonlySet<string>;
  isoDate?: string | null;
  limit?: number;
  maxTravelMinutes?: number;
}): MealSuggestion[] {
  const window = MEAL_WINDOWS.find((w) => w.id === gap.meal);
  if (!window) return [];
  const dayOfWeek = isoDate ? isoDateDayOfWeek(isoDate) : null;

  return candidates
    .filter((place) => FOOD_CATEGORIES.has(place.category))
    .filter((place) => !excludeSlugs.has(place.slug) && place.slug !== gap.anchorPlace.slug)
    .filter((place) => dayOfWeek === null || isOpenOnDay(place.closedOnDays, dayOfWeek))
    .filter((place) => isOpenDuringWindow(place, window))
    .map((place) => ({
      place,
      travelMinutes: estimateTravelMinutes(
        gap.anchorPlace.coordinates,
        place.coordinates,
        terrainBetween(gap.anchorPlace, place)
      ),
    }))
    .filter((s) => s.travelMinutes <= maxTravelMinutes)
    .sort((a, b) => a.travelMinutes - b.travelMinutes || b.place.rating - a.place.rating)
    .slice(0, limit);
}
