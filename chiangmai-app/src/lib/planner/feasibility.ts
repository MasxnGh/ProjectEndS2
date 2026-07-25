import type { Place } from "@/data/types";
import { isOpenOnDay } from "@/lib/opening-hours";
import { isoDateDayOfWeek, addDaysIso } from "@/lib/date-utils";
import { isBurningSeasonDate } from "@/lib/weather/day-forecast";

export type FeasibilityIssueType = "closedOnDay" | "seasonalClosure" | "hazeSensitive";

export interface FeasibilityIssue {
  type: FeasibilityIssueType;
  placeSlug: string;
  /** The nearest date within the trip's neighbourhood the place is actually open, when one exists — feeds the "here's when to go instead" suggestion. */
  suggestedIsoDate: string | null;
}

function isInSeasonalClosure(place: Place, isoDate: string): boolean {
  if (!place.seasonalClosure) return false;
  return place.seasonalClosure.some((range) => isoDate >= range.start && isoDate <= range.end);
}

/** Outdoor places that are highly sensitive to haze-season dust — worth flagging even though burning season is a calendar fact, not something the live AQI forecast can confirm for a far-future trip date. */
function isHazeSensitiveOnDate(place: Place, isoDate: string): boolean {
  return place.outdoor && place.dustSensitivity === "high" && isBurningSeasonDate(isoDate);
}

/** Nearest date (checking both directions, up to `withinDays` away) the place is open on — ignores seasonal closures, which are usually much longer than a single trip's neighbourhood. */
export function findNextOpenDate(place: Place, fromIsoDate: string, withinDays = 14): string | null {
  for (let offset = 1; offset <= withinDays; offset++) {
    for (const direction of [1, -1] as const) {
      const candidate = addDaysIso(fromIsoDate, offset * direction);
      if (isOpenOnDay(place.closedOnDays, isoDateDayOfWeek(candidate))) return candidate;
    }
  }
  return null;
}

/** Checks one place against one date: closed that day of week, or inside a known seasonal closure window. */
export function checkPlaceOnDate(place: Place, isoDate: string): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];
  if (!isOpenOnDay(place.closedOnDays, isoDateDayOfWeek(isoDate))) {
    issues.push({ type: "closedOnDay", placeSlug: place.slug, suggestedIsoDate: findNextOpenDate(place, isoDate) });
  }
  if (isInSeasonalClosure(place, isoDate)) {
    issues.push({ type: "seasonalClosure", placeSlug: place.slug, suggestedIsoDate: null });
  }
  if (isHazeSensitiveOnDate(place, isoDate)) {
    issues.push({ type: "hazeSensitive", placeSlug: place.slug, suggestedIsoDate: null });
  }
  return issues;
}

/** Checks every place scheduled on a day. Returns [] when the day has no date yet — nothing to check against. */
export function checkDayFeasibility(places: Place[], isoDate: string | null): FeasibilityIssue[] {
  if (!isoDate) return [];
  return places.flatMap((place) => checkPlaceOnDate(place, isoDate));
}

export interface FeasibilityDay {
  dayId: string;
  isoDate: string | null;
  places: Place[];
}

export interface PlaceRelocation {
  placeSlug: string;
  fromDayId: string;
  toDayId: string;
}

/** True when a place is open that day of the week and not inside a known seasonal closure — the bar a target day must clear to receive a relocated place. */
function isPlaceFineOnDate(place: Place, isoDate: string): boolean {
  return isOpenOnDay(place.closedOnDays, isoDateDayOfWeek(isoDate)) && !isInSeasonalClosure(place, isoDate);
}

/**
 * Finds places that are closed on their currently-scheduled day (by day of
 * week, or a seasonal closure window) but would be fine on a different day
 * already in the trip, and suggests moving each one there — the calculation
 * behind the "จัดวันใหม่ให้ลงตัว" button. This only ever proposes moves
 * within the trip's existing days (never invents a new day), and each day
 * only gives up or receives one place per pass to keep the resulting
 * preview easy to read and to avoid oscillating a place back and forth.
 * Returns [] when nothing needs fixing or nothing can be fixed within the
 * trip's own days.
 */
export function suggestDayFixes(days: FeasibilityDay[]): PlaceRelocation[] {
  const relocations: PlaceRelocation[] = [];
  const daysThatGaveOnePlaceAway = new Set<string>();
  const daysThatReceivedOnePlace = new Set<string>();

  for (const day of days) {
    if (!day.isoDate || daysThatGaveOnePlaceAway.has(day.dayId)) continue;

    for (const place of day.places) {
      if (isPlaceFineOnDate(place, day.isoDate)) continue;

      const targetDay = days.find(
        (candidate) =>
          candidate.dayId !== day.dayId &&
          candidate.isoDate &&
          !daysThatReceivedOnePlace.has(candidate.dayId) &&
          isPlaceFineOnDate(place, candidate.isoDate)
      );
      if (!targetDay) continue;

      relocations.push({ placeSlug: place.slug, fromDayId: day.dayId, toDayId: targetDay.dayId });
      daysThatGaveOnePlaceAway.add(day.dayId);
      daysThatReceivedOnePlace.add(targetDay.dayId);
      break;
    }
  }

  return relocations;
}
