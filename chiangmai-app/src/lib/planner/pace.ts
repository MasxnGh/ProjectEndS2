import type { Place } from "@/data/types";
import type { DaySchedule } from "@/lib/planner/schedule";

/** A comfortable full day out — the same neighborhood as schedule.ts's 10-hour warning threshold. */
const WAKING_DAY_MINUTES = 12 * 60;
/** Transit time that reads as "a lot" for one day. */
const MAX_TRANSIT_MINUTES = 180;
/** Roughly a round trip between the Chiang Mai city floor and Doi Inthanon's summit. */
const MAX_ELEVATION_CHANGE_M = 1800;
/** Chiang Mai's city-floor elevation — used for places with `elevation: null` so a city-to-mountain day still registers a real gain. */
const BASELINE_ELEVATION_M = 310;
const MAX_STOPS = 6;
const MIN_BUFFER_MINUTES = -60;
const MAX_BUFFER_MINUTES = 300;
/** Score at/above which a day reads as "ambitious" — the only band `suggestPaceRelief` offers to ease. */
const AMBITIOUS_THRESHOLD = 75;

export interface PaceBreakdown {
  transit: number;
  elevation: number;
  stopCount: number;
  buffer: number;
  intensity: number;
}

export type PaceBand = "easygoing" | "comfortable" | "full" | "ambitious";

export interface DayPace {
  score: number;
  breakdown: PaceBreakdown;
  band: PaceBand;
  /** The factor contributing the most to this day's score, once weighted — what a "why" tooltip or suggestion should point at. Null for an empty day. */
  dominantFactor: keyof PaceBreakdown | null;
}

const WEIGHTS: Record<keyof PaceBreakdown, number> = {
  transit: 0.25,
  elevation: 0.2,
  stopCount: 0.15,
  buffer: 0.2,
  intensity: 0.2,
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function scoreTransit(totalTravelMinutes: number): number {
  return clampPercent((totalTravelMinutes / MAX_TRANSIT_MINUTES) * 100);
}

function scoreElevation(places: Place[]): number {
  if (places.length < 2) return 0;
  let cumulative = 0;
  for (let i = 1; i < places.length; i++) {
    const prev = places[i - 1].elevation ?? BASELINE_ELEVATION_M;
    const curr = places[i].elevation ?? BASELINE_ELEVATION_M;
    cumulative += Math.abs(curr - prev);
  }
  return clampPercent((cumulative / MAX_ELEVATION_CHANGE_M) * 100);
}

function scoreStopCount(count: number): number {
  return clampPercent((count / MAX_STOPS) * 100);
}

/** More slack in the day means a lower pace score, so this is inverted relative to the other factors. */
function scoreBuffer(totalMinutes: number): number {
  const buffer = WAKING_DAY_MINUTES - totalMinutes;
  const clamped = Math.max(MIN_BUFFER_MINUTES, Math.min(MAX_BUFFER_MINUTES, buffer));
  return clampPercent(((MAX_BUFFER_MINUTES - clamped) / (MAX_BUFFER_MINUTES - MIN_BUFFER_MINUTES)) * 100);
}

function scoreIntensity(places: Place[]): number {
  if (places.length === 0) return 0;
  const avg = places.reduce((sum, p) => sum + p.physicalIntensity, 0) / places.length;
  return clampPercent(((avg - 1) / 4) * 100);
}

function bandFor(score: number): PaceBand {
  if (score < 25) return "easygoing";
  if (score < 50) return "comfortable";
  if (score < AMBITIOUS_THRESHOLD) return "full";
  return "ambitious";
}

/**
 * Scores a day's pace 0–100 from five weighted factors: transit time,
 * cumulative elevation change, stop count, buffer/slack time, and average
 * physical intensity. Higher means busier/more demanding, not "worse" —
 * the UI should describe this in editorial, never alarmist, terms.
 */
export function computeDayPace(places: Place[], schedule: DaySchedule): DayPace {
  if (places.length === 0) {
    return {
      score: 0,
      breakdown: { transit: 0, elevation: 0, stopCount: 0, buffer: 0, intensity: 0 },
      band: "easygoing",
      dominantFactor: null,
    };
  }

  const breakdown: PaceBreakdown = {
    transit: scoreTransit(schedule.totalTravelMinutes),
    elevation: scoreElevation(places),
    stopCount: scoreStopCount(places.length),
    buffer: scoreBuffer(schedule.totalMinutes),
    intensity: scoreIntensity(places),
  };

  const factors = Object.keys(breakdown) as (keyof PaceBreakdown)[];
  const score = Math.round(factors.reduce((sum, key) => sum + breakdown[key] * WEIGHTS[key], 0));
  const dominantFactor = factors.reduce((top, key) =>
    breakdown[key] * WEIGHTS[key] > breakdown[top] * WEIGHTS[top] ? key : top
  );

  return { score: clampPercent(score), breakdown, band: bandFor(score), dominantFactor };
}

export interface PaceRelocation {
  placeSlug: string;
  fromDayId: string;
  toDayId: string;
}

/**
 * A single one-click suggestion to ease the busiest "ambitious" day: move
 * its single most physically demanding stop to whichever other day
 * currently reads lightest. Mirrors feasibility.ts's suggestDayFixes —
 * one concrete move, not a full re-plan, to keep the preview simple and
 * avoid oscillation. Returns null when no day is ambitious, when the
 * busiest day only has one stop to give away, or when there's no other
 * day to receive it.
 */
export function suggestPaceRelief(
  days: { dayId: string; places: Place[]; schedule: DaySchedule }[]
): PaceRelocation | null {
  const withPace = days.map((day) => ({ ...day, pace: computeDayPace(day.places, day.schedule) }));

  const busiest = withPace
    .filter((day) => day.pace.band === "ambitious" && day.places.length > 1)
    .sort((a, b) => b.pace.score - a.pace.score)[0];
  if (!busiest) return null;

  const candidate = withPace
    .filter((day) => day.dayId !== busiest.dayId)
    .sort((a, b) => a.pace.score - b.pace.score)[0];
  if (!candidate) return null;

  const heaviest = [...busiest.places].sort((a, b) => b.physicalIntensity - a.physicalIntensity)[0];

  return { placeSlug: heaviest.slug, fromDayId: busiest.dayId, toDayId: candidate.dayId };
}
