/**
 * Date-only arithmetic on "YYYY-MM-DD" strings, done in UTC so it never
 * drifts a day from the local timezone's DST transitions.
 */

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function toIsoDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Adds `days` (may be 0 or negative) to an ISO date, rolling over months/years correctly. */
export function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIsoDate(date);
}

/** 0=Sunday..6=Saturday, matching Date#getDay() and the app's closedOnDays convention. */
export function isoDateDayOfWeek(iso: string): number {
  return parseIsoDate(iso).getUTCDay();
}

/** Whole days between two ISO dates (b - a); negative if b is before a. */
export function daysBetweenIso(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseIsoDate(b).getTime() - parseIsoDate(a).getTime()) / msPerDay);
}
