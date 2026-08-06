import type { GoldenHourType, Place, TimeWindow } from "@/data/types";
import type { DailyForecastEntry } from "@/lib/weather/types";
import type { LatLng } from "@/lib/geo/distance";
import { terrainBetween } from "@/lib/geo/distance";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";
import { clockToMinutes, isOutsideHours } from "@/lib/opening-hours";
import { calculateSunTimes } from "@/lib/planner/sun";

export interface SunTimes {
  sunriseMinutes: number;
  sunsetMinutes: number;
  /** True when this came from the real astronomical calculation rather than the day's actual weather-forecast sunrise/sunset field. */
  isEstimate: boolean;
}

/** Last-resort constant, only reached if both the forecast and the astronomical calc are unavailable — never happens for Chiang Mai's latitude in practice. */
const FALLBACK_SUN: SunTimes = { sunriseMinutes: 6 * 60, sunsetMinutes: 18 * 60, isEstimate: true };

function timeOfDayMinutes(isoDateTime: string): number {
  const timePart = isoDateTime.split("T")[1] ?? isoDateTime;
  return clockToMinutes(timePart);
}

/**
 * Prefers the real sunrise/sunset from the day's weather forecast (accurate,
 * but only available up to 16 days out); falls back to the astronomical
 * calculation for dates beyond that window.
 */
export function resolveSunTimes(
  entry: DailyForecastEntry | undefined,
  lat: number,
  lng: number,
  isoDate: string
): SunTimes {
  if (entry?.sunrise && entry?.sunset) {
    return {
      sunriseMinutes: timeOfDayMinutes(entry.sunrise),
      sunsetMinutes: timeOfDayMinutes(entry.sunset),
      isEstimate: false,
    };
  }
  const calculated = calculateSunTimes(lat, lng, isoDate);
  return calculated ? { ...calculated, isEstimate: true } : FALLBACK_SUN;
}

/** Converts a place's TimeWindow into absolute clock minutes for one specific date's sun times. */
export function resolveWindowMinutes(window: TimeWindow, sun: SunTimes): { start: number; end: number } {
  if (window.anchor === "clock") {
    return { start: clockToMinutes(window.start as string), end: clockToMinutes(window.end as string) };
  }
  const anchorMinutes = window.anchor === "sunrise" ? sun.sunriseMinutes : sun.sunsetMinutes;
  return { start: anchorMinutes + (window.start as number), end: anchorMinutes + (window.end as number) };
}

const QUALITY_RANK: Record<TimeWindow["quality"], number> = { ideal: 2, good: 1, acceptable: 0 };

export interface AnchorWindow {
  start: number;
  end: number;
  quality: TimeWindow["quality"];
}

/** Picks the highest-quality bestTimeWindow for a place, resolved to this date's actual clock minutes. Null when the place has none. */
export function pickAnchorWindow(place: Place, sun: SunTimes): AnchorWindow | null {
  if (place.bestTimeWindows.length === 0) return null;
  const best = [...place.bestTimeWindows].sort((a, b) => QUALITY_RANK[b.quality] - QUALITY_RANK[a.quality])[0];
  return { ...resolveWindowMinutes(best, sun), quality: best.quality };
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Real-world golden-hour/blue-hour/night windows relative to that day's
 * actual sunrise/sunset, not fixed clock times — Chiang Mai's sun times
 * drift across the year, so these have to move with `sun`.
 */
function goldenWindowFor(type: Exclude<GoldenHourType, null>, sun: SunTimes): [number, number] {
  switch (type) {
    case "sunrise":
      return [sun.sunriseMinutes - 30, sun.sunriseMinutes + 45];
    case "sunset":
      return [sun.sunsetMinutes - 45, sun.sunsetMinutes + 20];
    case "blue_hour":
      return [sun.sunsetMinutes + 15, sun.sunsetMinutes + 50];
    case "night":
      return [sun.sunsetMinutes + 50, sun.sunriseMinutes + 24 * 60];
  }
}

function isGoldenHourStop(place: Place, arrival: number, departure: number, sun: SunTimes): boolean {
  if (!place.goldenHourType) return false;
  const [start, end] = goldenWindowFor(place.goldenHourType, sun);
  return overlaps(arrival, departure, start, end);
}

export interface TimelineStop {
  place: Place;
  travelMinutesFromPrevious: number;
  arrivalMinutes: number;
  departureMinutes: number;
  /** True once the user has dragged this stop to a fixed time — the engine treats it as a hard checkpoint. */
  userLocked: boolean;
  /** True for the one stop (auto-picked or user-locked) the day's schedule is calculated backward/forward from. */
  isAnchor: boolean;
  /** Minutes the traveller would need to wait if they arrived at the natural pace — happens when a later locked/anchored stop is scheduled generously. */
  waitMinutes: number;
  /** True when a locked time is earlier than what's actually reachable from the previous stop — flagged, not silently corrected, since userLocked stops must never be moved. */
  conflict: boolean;
  outsideOpeningHours: boolean;
  isGoldenHour: boolean;
  goldenHourType: GoldenHourType | null;
}

export interface DayTimeline {
  stops: TimelineStop[];
  /** When to leave the accommodation to make the first stop's scheduled arrival — null when no base location is set or the day has no stops. */
  leaveByMinutes: number | null;
  sun: SunTimes;
  /** True when at least one stop drove the schedule (a lock or an ideal-quality bestTimeWindow) — false means this day used the plain forward-from-day-start fallback. */
  hasAnchor: boolean;
}

/**
 * Builds a day's timeline by anchoring the schedule to the first stop that
 * either has a user-locked time or an ideal-quality bestTimeWindow, then
 * chaining forward (later stops) and backward (earlier stops) from it —
 * this is the "what time do I need to leave" backward calculation. Later
 * locked stops are honored exactly (their contract is they never move);
 * gaps become `waitMinutes`, impossible ones become `conflict: true` rather
 * than silently drifting the lock.
 *
 * Days with no lock and no ideal-quality window fall back to the exact same
 * forward-only chaining as `buildSchedule` in schedule.ts, starting from
 * `fallbackDayStartClock` — fully backward compatible for ordinary days.
 */
export function buildDayTimeline(params: {
  order: Place[];
  sun: SunTimes;
  baseLocation: LatLng | null;
  lockedArrivals?: Record<string, string>;
  fallbackDayStartClock?: string;
}): DayTimeline {
  const { order, sun, baseLocation, lockedArrivals = {}, fallbackDayStartClock = "09:00" } = params;

  if (order.length === 0) {
    return { stops: [], leaveByMinutes: null, sun, hasAnchor: false };
  }

  const desired: (number | null)[] = order.map(() => null);
  let anchorIndex = -1;
  order.forEach((place, i) => {
    const locked = lockedArrivals[place.slug];
    if (locked) {
      desired[i] = clockToMinutes(locked);
      if (anchorIndex === -1) anchorIndex = i;
      return;
    }
    if (anchorIndex === -1) {
      const anchor = pickAnchorWindow(place, sun);
      if (anchor && anchor.quality === "ideal") {
        desired[i] = anchor.start;
        anchorIndex = i;
      }
    }
  });

  const arrivals = new Array<number>(order.length);
  const departures = new Array<number>(order.length);
  const travelMinutesArr = new Array<number>(order.length).fill(0);
  const waitMinutesArr = new Array<number>(order.length).fill(0);
  const conflictArr = new Array<boolean>(order.length).fill(false);

  if (anchorIndex === -1) {
    let cursor = clockToMinutes(fallbackDayStartClock);
    order.forEach((place, i) => {
      if (i > 0) {
        const travel = estimateTravelMinutes(order[i - 1].coordinates, place.coordinates, terrainBetween(order[i - 1], place));
        travelMinutesArr[i] = travel;
        cursor += travel;
      }
      arrivals[i] = cursor;
      departures[i] = cursor + place.durationMinutes;
      cursor = departures[i];
    });
  } else {
    arrivals[anchorIndex] = desired[anchorIndex]!;
    departures[anchorIndex] = arrivals[anchorIndex] + order[anchorIndex].durationMinutes;

    for (let i = anchorIndex + 1; i < order.length; i++) {
      const travel = estimateTravelMinutes(order[i - 1].coordinates, order[i].coordinates, terrainBetween(order[i - 1], order[i]));
      travelMinutesArr[i] = travel;
      const naturalArrival = departures[i - 1] + travel;
      if (desired[i] !== null) {
        arrivals[i] = desired[i]!;
        if (arrivals[i] > naturalArrival) waitMinutesArr[i] = arrivals[i] - naturalArrival;
        else if (arrivals[i] < naturalArrival) conflictArr[i] = true;
      } else {
        arrivals[i] = naturalArrival;
      }
      departures[i] = arrivals[i] + order[i].durationMinutes;
    }

    for (let i = anchorIndex - 1; i >= 0; i--) {
      const travel = estimateTravelMinutes(order[i].coordinates, order[i + 1].coordinates, terrainBetween(order[i], order[i + 1]));
      travelMinutesArr[i + 1] = travel;
      departures[i] = arrivals[i + 1] - travel;
      arrivals[i] = departures[i] - order[i].durationMinutes;
    }
  }

  const stops: TimelineStop[] = order.map((place, i) => ({
    place,
    travelMinutesFromPrevious: travelMinutesArr[i],
    arrivalMinutes: arrivals[i],
    departureMinutes: departures[i],
    userLocked: Boolean(lockedArrivals[place.slug]),
    isAnchor: i === anchorIndex,
    waitMinutes: waitMinutesArr[i],
    conflict: conflictArr[i],
    outsideOpeningHours: isOutsideHours(place.openingHours, arrivals[i], departures[i]),
    isGoldenHour: isGoldenHourStop(place, arrivals[i], departures[i], sun),
    goldenHourType: place.goldenHourType,
  }));

  let leaveByMinutes: number | null = null;
  if (baseLocation) {
    const first = order[0];
    const travel = estimateTravelMinutes(baseLocation, first.coordinates, first.elevation ? "mountain" : "urban");
    leaveByMinutes = arrivals[0] - travel;
  }

  return { stops, leaveByMinutes, sun, hasAnchor: anchorIndex !== -1 };
}
