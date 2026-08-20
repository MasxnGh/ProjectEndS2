import type { Place } from "@/data/types";
import type { DaySchedule } from "@/lib/planner/schedule";
import { clockToMinutes, isOpenOnDay, isOutsideHours } from "@/lib/opening-hours";
import { isoDateDayOfWeek } from "@/lib/date-utils";
import { terrainBetween } from "@/lib/geo/distance";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";

export interface RouteLeg {
  /** Index of the stop the leg departs from — a suggestion is inserted at `fromIndex + 1`. */
  fromIndex: number;
  from: Place;
  to: Place;
  directMinutes: number;
  /** Clock minutes the traveller leaves `from` — what a candidate's arrival time is measured from. */
  departureMinutes: number;
}

export interface DetourSuggestion {
  place: Place;
  /** Travel time this adds versus driving the leg straight through. */
  addedMinutes: number;
}

/**
 * Below this the leg is a hop across the old city and a "stop on the way"
 * suggestion is just clutter.
 */
const MIN_LEG_MINUTES = 25;
/** Floor and ceiling for how much detour counts as "on the way". */
const MIN_ADDED_BUDGET_MINUTES = 15;
const MAX_ADDED_BUDGET_MINUTES = 30;
/** A longer drive tolerates a longer detour — ten minutes off a two-hour drive is nothing. */
const ADDED_BUDGET_FRACTION = 0.2;

/** How much extra travel a leg of this length can absorb before a stop stops being "on the way". */
export function detourBudgetMinutes(directMinutes: number): number {
  return Math.min(
    MAX_ADDED_BUDGET_MINUTES,
    Math.max(MIN_ADDED_BUDGET_MINUTES, Math.round(directMinutes * ADDED_BUDGET_FRACTION))
  );
}

/**
 * A stop on the way has to be short. Without this cap the catalogue happily
 * offers a national park with a 5-hour visit as a detour on a drive.
 */
const MAX_STOP_DURATION_MINUTES = 120;

/**
 * The one leg of a day most worth breaking up — the longest drive. Days have
 * at most a handful of legs and suggesting something for every one of them
 * buries the useful case, so the planner asks about this leg only.
 */
export function findLongestLeg(schedule: DaySchedule): RouteLeg | null {
  const { stops } = schedule;
  let best: RouteLeg | null = null;

  for (let i = 1; i < stops.length; i++) {
    const directMinutes = stops[i].travelMinutesFromPrevious;
    if (directMinutes < MIN_LEG_MINUTES) continue;
    if (best && directMinutes <= best.directMinutes) continue;
    best = {
      fromIndex: i - 1,
      from: stops[i - 1].place,
      to: stops[i].place,
      directMinutes,
      departureMinutes: clockToMinutes(stops[i - 1].departure),
    };
  }

  return best;
}

/**
 * Places that sit near enough to the straight-through route that stopping at
 * one barely lengthens the drive.
 *
 * `addedMinutes` is the honest measure: time via the candidate minus time
 * driving the leg directly. A place a kilometre off the midpoint scores far
 * better than one the same distance from the start but in the wrong
 * direction, which a plain radius search around either endpoint cannot tell
 * apart.
 *
 * **Known limitation.** Both figures come from straight-line distance with a
 * terrain detour factor (lib/geo/distance.ts), not a routed road distance, so
 * this only finds places that are near the straight line. Somewhere that is
 * on the *road* but not on the line — Wat Phra That Si Chom Thong sits on
 * Highway 108, the only sane way up Doi Inthanon, yet is ~20 km off the
 * straight line to the summit — will not be suggested. That is the safe
 * direction to be wrong in: a missed suggestion costs nothing, while
 * promising "+10 min" for what is really an hour's detour would send someone
 * down the wrong road. Routing the candidates through lib/routing would fix
 * it, at one matrix request per leg.
 */
export function findOnRouteStops({
  leg,
  candidates,
  excludeSlugs,
  isoDate,
  limit = 3,
  maxAddedMinutes,
}: {
  leg: RouteLeg;
  candidates: Place[];
  excludeSlugs: ReadonlySet<string>;
  isoDate?: string | null;
  limit?: number;
  maxAddedMinutes?: number;
}): DetourSuggestion[] {
  const dayOfWeek = isoDate ? isoDateDayOfWeek(isoDate) : null;
  const budget = maxAddedMinutes ?? detourBudgetMinutes(leg.directMinutes);

  return candidates
    .filter((place) => !excludeSlugs.has(place.slug))
    .filter((place) => place.slug !== leg.from.slug && place.slug !== leg.to.slug)
    .filter((place) => place.durationMinutes <= MAX_STOP_DURATION_MINUTES)
    .filter((place) => dayOfWeek === null || isOpenOnDay(place.closedOnDays, dayOfWeek))
    .map((place) => {
      const toPlace = estimateTravelMinutes(
        leg.from.coordinates,
        place.coordinates,
        terrainBetween(leg.from, place)
      );
      const onward = estimateTravelMinutes(
        place.coordinates,
        leg.to.coordinates,
        terrainBetween(place, leg.to)
      );
      const arrivalMinutes = leg.departureMinutes + toPlace;
      return {
        place,
        addedMinutes: toPlace + onward - leg.directMinutes,
        arrivalMinutes,
      };
    })
    .filter((s) => s.addedMinutes <= budget)
    // Would the traveller actually find it open when they got there? Places
    // with unverified hours are kept — isOutsideHours never flags a null.
    .filter(
      (s) =>
        !isOutsideHours(
          s.place.openingHours,
          s.arrivalMinutes,
          s.arrivalMinutes + s.place.durationMinutes
        )
    )
    .sort((a, b) => a.addedMinutes - b.addedMinutes || b.place.rating - a.place.rating)
    .slice(0, limit)
    .map(({ place, addedMinutes }) => ({ place, addedMinutes: Math.max(0, addedMinutes) }));
}
