import type { Dictionary, Locale } from "@/i18n";
import { fill } from "@/components/brand/place-text";

/*
 * Words the planner builds from numbers and dates. Dates are ISO "YYYY-MM-DD"
 * and read as UTC everywhere, the same as the store and the old planner, so a
 * day never shifts with the visitor's time zone.
 */

function utc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function intlLocale(locale: Locale): string {
  return locale === "th" ? "th-TH" : "en-GB";
}

/** "ส. 14 พ.ย." / "Sat 14 Nov" — a day tab. */
export function shortDayDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(utc(iso));
}

/** "เสาร์ 14 พฤศจิกายน" / "Saturday 14 November" — a day heading. */
export function longDayDate(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(utc(iso));
}

/** "14–16 พ.ย. 2569" / "14–16 Nov 2026" — the trip's dates on one chip. */
export function tripRange(startIso: string, endIso: string, locale: Locale): string {
  const format = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  if (startIso === endIso) return format.format(utc(startIso));
  return format.formatRange(utc(startIso), utc(endIso));
}

/** "3 จุด" / "1 stop". */
export function stopsLabel(count: number, dict: Dictionary): string {
  return count === 1 ? dict.plan.days.stopsOne : fill(dict.plan.days.stops, { count });
}

export function dayCountLabel(count: number, dict: Dictionary): string {
  return count === 1 ? dict.myTrips.dayCountOne : fill(dict.myTrips.dayCount, { count });
}

export function placeCountLabel(count: number, dict: Dictionary): string {
  return count === 1 ? dict.myTrips.placeCountOne : fill(dict.myTrips.placeCount, { count });
}

/** ฿1,250 — the planner's money, always whole baht. */
export function baht(amount: number): string {
  return `฿${Math.round(amount).toLocaleString("en-US")}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
