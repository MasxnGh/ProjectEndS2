import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import type { DailyForecastEntry } from "@/lib/weather/types";
import {
  buildDayTimeline,
  pickAnchorWindow,
  resolveSunTimes,
  resolveWindowMinutes,
  type SunTimes,
} from "./golden-hour";

function makePlace(overrides: Partial<Place> & Pick<Place, "slug" | "coordinates">): Place {
  return {
    name: { en: overrides.slug, th: overrides.slug },
    category: "temple",
    district: "old-city",
    bestTime: ["anytime"],
    durationMinutes: 60,
    priceLevel: 1,
    rating: 4.5,
    shortDescription: { en: "", th: "" },
    description: { en: "", th: "" },
    localTip: { en: "", th: "" },
    openingHoursText: { en: "Daily, 9:00 AM – 5:00 PM", th: "" },
    address: { en: "", th: "" },
    elevation: null,
    tags: [],
    paletteSeed: 1,
    outdoor: false,
    openingHours: null,
    closedOnDays: [],
    seasonalClosure: null,
    bestTimeWindows: [],
    goldenHourType: null,
    exposure: "outdoor",
    rainSensitivity: "none",
    dustSensitivity: "none",
    physicalIntensity: 1,
    dressCode: null,
    requiresBooking: false,
    dataLastVerified: null,
    ...overrides,
  };
}

const SUN: SunTimes = { sunriseMinutes: 6 * 60, sunsetMinutes: 18 * 60, isEstimate: true };

describe("resolveSunTimes", () => {
  it("prefers the real forecast sunrise/sunset when available", () => {
    const entry: DailyForecastEntry = {
      date: "2026-08-01",
      condition: { code: 0, icon: "clear-day", label: { en: "Clear", th: "" } },
      maxTempC: 32,
      minTempC: 24,
      precipitationProbability: 10,
      sunrise: "2026-08-01T05:52",
      sunset: "2026-08-01T18:38",
    };
    const result = resolveSunTimes(entry, 18.79, 98.99, "2026-08-01");
    expect(result).toEqual({ sunriseMinutes: 5 * 60 + 52, sunsetMinutes: 18 * 60 + 38, isEstimate: false });
  });

  it("falls back to the astronomical calculation when no forecast entry is available", () => {
    const result = resolveSunTimes(undefined, 18.79, 98.99, "2026-11-23");
    expect(result.isEstimate).toBe(true);
    expect(result.sunriseMinutes).toBeGreaterThan(0);
    expect(result.sunsetMinutes).toBeGreaterThan(result.sunriseMinutes);
  });
});

describe("resolveWindowMinutes", () => {
  it("uses literal clock times for a clock-anchored window", () => {
    const result = resolveWindowMinutes({ label: { en: "", th: "" }, anchor: "clock", start: "14:00", end: "16:00", quality: "good" }, SUN);
    expect(result).toEqual({ start: 14 * 60, end: 16 * 60 });
  });

  it("offsets from sunrise/sunset for sun-anchored windows", () => {
    const result = resolveWindowMinutes(
      { label: { en: "", th: "" }, anchor: "sunrise", start: -30, end: 60, quality: "ideal" },
      SUN
    );
    expect(result).toEqual({ start: SUN.sunriseMinutes - 30, end: SUN.sunriseMinutes + 60 });
  });
});

describe("pickAnchorWindow", () => {
  it("returns null when the place has no bestTimeWindows", () => {
    const place = makePlace({ slug: "plain", coordinates: { lat: 18.79, lng: 98.99 } });
    expect(pickAnchorWindow(place, SUN)).toBeNull();
  });

  it("picks the highest-quality window when several exist", () => {
    const place = makePlace({
      slug: "multi",
      coordinates: { lat: 18.79, lng: 98.99 },
      bestTimeWindows: [
        { label: { en: "", th: "" }, anchor: "clock", start: "10:00", end: "11:00", quality: "acceptable" },
        { label: { en: "", th: "" }, anchor: "sunrise", start: -20, end: 40, quality: "ideal" },
        { label: { en: "", th: "" }, anchor: "clock", start: "15:00", end: "16:00", quality: "good" },
      ],
    });
    const anchor = pickAnchorWindow(place, SUN);
    expect(anchor).toEqual({ start: SUN.sunriseMinutes - 20, end: SUN.sunriseMinutes + 40, quality: "ideal" });
  });
});

describe("buildDayTimeline", () => {
  it("returns an empty timeline for an empty day", () => {
    const timeline = buildDayTimeline({ order: [], sun: SUN, baseLocation: null });
    expect(timeline).toEqual({ stops: [], leaveByMinutes: null, sun: SUN, hasAnchor: false });
  });

  it("falls back to plain forward chaining from the default day start when no place has an ideal window or lock", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60 });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 }, durationMinutes: 30 });
    const timeline = buildDayTimeline({ order: [a, b], sun: SUN, baseLocation: null, fallbackDayStartClock: "09:00" });
    expect(timeline.hasAnchor).toBe(false);
    expect(timeline.stops[0].arrivalMinutes).toBe(9 * 60);
    expect(timeline.stops[1].arrivalMinutes).toBeGreaterThan(timeline.stops[0].departureMinutes);
  });

  it("anchors the schedule to an ideal sunrise window and calculates backward for the base location's leave-by time", () => {
    const viewpoint = makePlace({
      slug: "sunrise-viewpoint",
      coordinates: { lat: 19.1, lng: 98.9 },
      elevation: 1200,
      durationMinutes: 90,
      goldenHourType: "sunrise",
      bestTimeWindows: [
        { label: { en: "Sunrise", th: "" }, anchor: "sunrise", start: -15, end: 60, quality: "ideal" },
      ],
    });
    const timeline = buildDayTimeline({
      order: [viewpoint],
      sun: SUN,
      baseLocation: { lat: 18.79, lng: 98.99 },
    });

    expect(timeline.hasAnchor).toBe(true);
    expect(timeline.stops[0].isAnchor).toBe(true);
    expect(timeline.stops[0].arrivalMinutes).toBe(SUN.sunriseMinutes - 15);
    expect(timeline.stops[0].isGoldenHour).toBe(true);
    expect(timeline.leaveByMinutes).not.toBeNull();
    expect(timeline.leaveByMinutes!).toBeLessThan(timeline.stops[0].arrivalMinutes);
  });

  it("calculates backward through a stop preceding the anchor", () => {
    const early = makePlace({ slug: "early", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 30 });
    const anchor = makePlace({
      slug: "anchor",
      coordinates: { lat: 18.8, lng: 99.0 },
      durationMinutes: 60,
      bestTimeWindows: [{ label: { en: "", th: "" }, anchor: "clock", start: "10:00", end: "11:00", quality: "ideal" }],
    });
    const timeline = buildDayTimeline({ order: [early, anchor], sun: SUN, baseLocation: null });

    expect(timeline.stops[1].arrivalMinutes).toBe(10 * 60);
    expect(timeline.stops[0].departureMinutes).toBeLessThan(timeline.stops[1].arrivalMinutes);
    expect(timeline.stops[0].arrivalMinutes).toBe(timeline.stops[0].departureMinutes - 30);
  });

  it("honors a second locked stop exactly, flagging a wait when it's later than the natural arrival from the first lock", () => {
    // "a" is the first stop with a locked time, so it becomes the anchor; "b" is
    // a second, independent lock further down — its natural arrival (chained
    // forward from "a") is compared against its own locked time.
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 30 });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 }, durationMinutes: 30 });
    const timeline = buildDayTimeline({
      order: [a, b],
      sun: SUN,
      baseLocation: null,
      lockedArrivals: { a: "09:00", b: "15:00" },
    });

    const bStop = timeline.stops[1];
    expect(bStop.userLocked).toBe(true);
    expect(bStop.arrivalMinutes).toBe(15 * 60);
    expect(bStop.waitMinutes).toBeGreaterThan(0);
    expect(bStop.conflict).toBe(false);
  });

  it("flags a conflict when a second locked time is earlier than what's actually reachable", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 300 });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 }, durationMinutes: 30 });
    const timeline = buildDayTimeline({
      order: [a, b],
      sun: SUN,
      baseLocation: null,
      lockedArrivals: { a: "09:00", b: "09:30" },
    });

    expect(timeline.stops[1].conflict).toBe(true);
    expect(timeline.stops[1].arrivalMinutes).toBe(9 * 60 + 30);
  });
});
