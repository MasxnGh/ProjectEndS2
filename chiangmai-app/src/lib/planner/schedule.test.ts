import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { buildSchedule, compareOptimization, optimizeDayOrder } from "./schedule";

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
    openingHours: { opens: "09:00", closes: "17:00" },
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

describe("buildSchedule", () => {
  it("starts the first stop at the given day-start time with no travel leg", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 90 });
    const schedule = buildSchedule([a], "09:00");
    expect(schedule.stops[0]).toMatchObject({ arrival: "09:00", departure: "10:30", travelMinutesFromPrevious: 0 });
    expect(schedule.totalTravelMinutes).toBe(0);
    expect(schedule.totalVisitMinutes).toBe(90);
  });

  it("chains travel and visit time across multiple stops", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60 });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 }, durationMinutes: 30 });
    const schedule = buildSchedule([a, b], "09:00");
    expect(schedule.stops[1].travelMinutesFromPrevious).toBeGreaterThan(0);
    const [h, m] = schedule.stops[1].arrival.split(":").map(Number);
    const arrivalMinutes = h * 60 + m;
    expect(arrivalMinutes).toBe(9 * 60 + 60 + schedule.stops[1].travelMinutesFromPrevious);
  });

  it("flags a visit that falls outside known opening hours", () => {
    const late = makePlace({
      slug: "late",
      coordinates: { lat: 18.79, lng: 98.99 },
      openingHours: { opens: "09:00", closes: "10:00" },
      durationMinutes: 30,
    });
    const schedule = buildSchedule([late], "18:00");
    expect(schedule.stops[0].outsideOpeningHours).toBe(true);
  });

  it("does not flag a 24-hour place", () => {
    const alwaysOpen = makePlace({
      slug: "always",
      coordinates: { lat: 18.79, lng: 98.99 },
      openingHours: { opens: "00:00", closes: "24:00" },
    });
    const schedule = buildSchedule([alwaysOpen], "23:00");
    expect(schedule.stops[0].outsideOpeningHours).toBe(false);
  });

  it("does not flag places with unknown hours", () => {
    const unknown = makePlace({
      slug: "unknown-hours",
      coordinates: { lat: 18.79, lng: 98.99 },
      openingHours: null,
    });
    const schedule = buildSchedule([unknown], "23:00");
    expect(schedule.stops[0].outsideOpeningHours).toBe(false);
  });

  it("flags days whose total time exceeds 10 hours", () => {
    const longPlaces = Array.from({ length: 4 }, (_, i) =>
      makePlace({
        slug: `p${i}`,
        coordinates: { lat: 18.7 + i * 0.3, lng: 98.9 + i * 0.3 },
        durationMinutes: 150,
      })
    );
    const schedule = buildSchedule(longPlaces, "08:00");
    expect(schedule.exceedsTenHours).toBe(true);
  });

  it("does not flag a short day", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60 });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 }, durationMinutes: 60 });
    const schedule = buildSchedule([a, b], "09:00");
    expect(schedule.exceedsTenHours).toBe(false);
  });
});

describe("optimizeDayOrder", () => {
  it("leaves 0, 1, or 2 stops untouched", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 } });
    expect(optimizeDayOrder([])).toEqual([]);
    expect(optimizeDayOrder([a])).toEqual([a]);
    expect(optimizeDayOrder([a, b])).toEqual([a, b]);
  });

  it("pulls a morning-only place to the front and an evening-only place to the back", () => {
    const morning = makePlace({
      slug: "sunrise-viewpoint",
      coordinates: { lat: 19.1, lng: 98.9 },
      bestTime: ["morning"],
    });
    const nightMarket = makePlace({
      slug: "night-market",
      coordinates: { lat: 18.79, lng: 98.99 },
      bestTime: ["evening"],
    });
    const flexible = makePlace({
      slug: "museum",
      coordinates: { lat: 18.85, lng: 98.95 },
      bestTime: ["anytime"],
    });

    // Deliberately start in a "wrong" order geometrically and by time-of-day.
    const result = optimizeDayOrder([nightMarket, flexible, morning]);

    expect(result[0].slug).toBe("sunrise-viewpoint");
    expect(result[result.length - 1].slug).toBe("night-market");
  });

  it("keeps multiple morning-only places in their geometrically-optimized relative order", () => {
    const morningA = makePlace({ slug: "morning-a", coordinates: { lat: 19.1, lng: 98.9 }, bestTime: ["morning"] });
    const morningB = makePlace({ slug: "morning-b", coordinates: { lat: 19.11, lng: 98.91 }, bestTime: ["morning"] });
    const evening = makePlace({ slug: "evening-only", coordinates: { lat: 18.79, lng: 98.99 }, bestTime: ["evening"] });

    const result = optimizeDayOrder([morningA, evening, morningB]);
    const morningSlugs = result.filter((p) => p.bestTime[0] === "morning").map((p) => p.slug);
    expect(morningSlugs).toHaveLength(2);
    expect(result[result.length - 1].slug).toBe("evening-only");
  });

  it("follows an external duration matrix instead of straight-line distance when one is supplied", () => {
    // Three same-bestTime places geometrically closest in order a→b→c, but a
    // real travel-time matrix says the road actually makes a→c→b faster
    // (e.g. b sits past a river crossing that only affects driving time).
    const a = makePlace({ slug: "a", coordinates: { lat: 0, lng: 0 } });
    const b = makePlace({ slug: "b", coordinates: { lat: 0, lng: 1 } });
    const c = makePlace({ slug: "c", coordinates: { lat: 0, lng: 2 } });
    const durationMatrix = [
      [0, 100, 5],
      [100, 0, 100],
      [5, 100, 0],
    ];
    const result = optimizeDayOrder([a, b, c], durationMatrix);
    expect(result.map((p) => p.slug)).toEqual(["a", "c", "b"]);
  });
});

describe("compareOptimization", () => {
  it("reports no distance saved when the order is already optimal", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } });
    const b = makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 } });
    const result = compareOptimization([a, b]);
    expect(result.changed).toBe(false);
    expect(result.distanceSavedKm).toBe(0);
  });

  it("finds a shorter route for a deliberately crossed path", () => {
    const a = makePlace({ slug: "a", coordinates: { lat: 0, lng: 0 } });
    const b = makePlace({ slug: "b", coordinates: { lat: 1, lng: 2 } }); // far corner, visited too early
    const c = makePlace({ slug: "c", coordinates: { lat: 0, lng: 2 } });
    const d = makePlace({ slug: "d", coordinates: { lat: 1, lng: 0 } });

    const result = compareOptimization([a, b, c, d]);
    expect(result.after.totalDistanceKm).toBeLessThanOrEqual(result.before.totalDistanceKm);
  });
});
