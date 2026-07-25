import type { OpeningHours } from "@/data/types";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToClock(totalMinutes: number): string {
  const normalized = ((totalMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** dayOfWeek: 0=Sunday..6=Saturday (matches Date#getDay()). */
export function isOpenOnDay(closedOnDays: number[], dayOfWeek: number): boolean {
  return !closedOnDays.includes(dayOfWeek);
}

/**
 * True when [arrivalMinutes, departureMinutes) falls outside `hours` on a day
 * the place is open. Returns false (never flags) when hours are unknown, the
 * day is closed by a different mechanism the caller already checked, or the
 * range spans/reaches midnight — chained-day math isn't worth the complexity
 * this dataset doesn't need yet.
 */
export function isOutsideHours(
  hours: OpeningHours | null,
  arrivalMinutes: number,
  departureMinutes: number
): boolean {
  if (!hours) return false;
  const opens = clockToMinutes(hours.opens);
  const closes = clockToMinutes(hours.closes);
  if (closes <= opens) return false; // spans midnight (e.g. 24:00) or malformed — skip rather than guess
  return arrivalMinutes < opens || departureMinutes > closes;
}

/**
 * Builds a schema.org OpeningHoursSpecification from the structured fields.
 * Returns null when hours aren't known, rather than guessing.
 */
export function toJsonLdOpeningHoursSpecification(hours: OpeningHours | null, closedOnDays: number[]) {
  if (!hours) return null;
  const openDays = DAY_NAMES.filter((_, i) => isOpenOnDay(closedOnDays, i));
  if (openDays.length === 0) return null;
  return {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: openDays,
    opens: hours.opens,
    closes: hours.closes === "24:00" ? "23:59" : hours.closes,
  };
}
