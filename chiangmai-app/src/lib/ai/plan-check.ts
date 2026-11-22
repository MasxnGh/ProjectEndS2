import { getPlaceBySlug } from "@/data/places";
import type { Place } from "@/data/types";
import { addDaysIso } from "@/lib/date-utils";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { minutesToClock } from "@/lib/opening-hours";
import { suggestAnchorFirst } from "@/lib/planner/anchor-first";
import { checkDayFeasibility } from "@/lib/planner/feasibility";
import { buildDayTimeline, resolveSunTimes, type DayTimeline } from "@/lib/planner/golden-hour";
import { findMealGaps } from "@/lib/planner/meals";
import { buildSchedule, type DaySchedule } from "@/lib/planner/schedule";

/**
 * An AI plan seen the way the planner page will see it once it is used. The
 * page times each day with `buildDayTimeline` (around a stop's best-time
 * window when the day has one, otherwise from 09:00), and warns from four of
 * its checks; this runs the same ones, unchanged, so the dialog, the server's
 * fix pass and the eval all judge a plan by what the traveller will be shown.
 *
 * Shared by the server and the dialog, so it must stay free of server-only
 * imports.
 */

export interface PlannedDay {
  /** The day's date, or null when the trip has none. */
  isoDate: string | null;
  places: Place[];
  /** The times the planner page shows for the day. */
  timeline: DayTimeline;
  /** Forward from 09:00: the planner's ten-hour, meal and cost checks read this one. */
  schedule: DaySchedule;
}

/** Today's date as the planner page reads it, for sun times when the trip has no date. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Each day as the planner page builds it right after "use this plan": no
 * pinned times (applying clears them), no base location (it only adds a
 * leave-by time), and sun times calculated for the day's date — the page
 * uses a forecast's when one is loaded, a few minutes' difference at most.
 */
export function planDays(days: string[][], travelDate: string | null, today: string = todayIso()): PlannedDay[] {
  return days.map((slugs, i) => {
    const places = slugs.map((slug) => getPlaceBySlug(slug)).filter((p): p is Place => Boolean(p));
    const isoDate = travelDate ? addDaysIso(travelDate, i) : null;
    const sun = resolveSunTimes(undefined, CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng, isoDate ?? today);
    return {
      isoDate,
      places,
      timeline: buildDayTimeline({ order: places, sun, baseLocation: null }),
      schedule: buildSchedule(places),
    };
  });
}

/** Something the planner page would warn about. `day` counts from 1. */
export type PlanIssue =
  | { type: "closedOnDay" | "seasonalClosure"; day: number; slug: string; isoDate: string }
  | { type: "outsideHours"; day: number; slug: string; arrival: string; departure: string }
  | { type: "longDay"; day: number; totalMinutes: number }
  /** The day is timed around `slug`'s best window, which counts the stops before it back to `startsAt`, while some are shut. */
  | { type: "anchorFirst"; day: number; slug: string; startsAt: string };

/** The planner page's warnings for these days, in day order. */
export function checkPlanDays(days: PlannedDay[]): PlanIssue[] {
  return days.flatMap((day, i): PlanIssue[] => {
    const n = i + 1;
    if (day.places.length === 0) return [];
    const issues: PlanIssue[] = [];

    // Haze is a seasonal warning about the air, not something a different
    // plan fixes, so it is left to the planner page.
    for (const issue of checkDayFeasibility(day.places, day.isoDate)) {
      if (issue.type === "hazeSensitive" || !day.isoDate) continue;
      issues.push({ type: issue.type, day: n, slug: issue.placeSlug, isoDate: day.isoDate });
    }

    const anchor = suggestAnchorFirst({
      order: day.places,
      timeline: day.timeline,
      sun: day.timeline.sun,
      baseLocation: null,
    });
    if (anchor) {
      issues.push({ type: "anchorFirst", day: n, slug: anchor.placeSlug, startsAt: minutesToClock(anchor.currentStartMinutes) });
    }

    for (const stop of day.timeline.stops) {
      if (!stop.outsideOpeningHours) continue;
      issues.push({
        type: "outsideHours",
        day: n,
        slug: stop.place.slug,
        arrival: minutesToClock(stop.arrivalMinutes),
        departure: minutesToClock(stop.departureMinutes),
      });
    }

    if (day.schedule.exceedsTenHours) issues.push({ type: "longDay", day: n, totalMinutes: day.schedule.totalMinutes });
    return issues;
  });
}

/**
 * Meals a day runs through with no food stop: the planner page offers a
 * place for each ("No lunch stop — you are out from …") rather than warning,
 * so these are not issues, but a fix that adds one has made the plan worse.
 */
export function countMealGaps(days: PlannedDay[]): number {
  return days.reduce((sum, day) => sum + findMealGaps(day.schedule).length, 0);
}
