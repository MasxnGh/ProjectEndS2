import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { buildSchedule } from "./schedule";
import { detourBudgetMinutes, findLongestLeg, findOnRouteStops } from "./detours";

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
    openingHoursText: { en: "", th: "" },
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

/** Old city → San Kamphaeng: a real leg long enough to be worth breaking up. */
const OLD_CITY = { lat: 18.7873, lng: 98.9853 };
const SAN_KAMPHAENG = { lat: 18.7424, lng: 99.1229 };
/** Roughly on the line between the two. */
const ON_THE_LINE = { lat: 18.7648, lng: 99.0541 };
/** Same distance from the old city, but in the opposite direction. */
const WRONG_WAY = { lat: 18.8098, lng: 98.9165 };

const legDay = [
  makePlace({ slug: "old-city", coordinates: OLD_CITY }),
  makePlace({ slug: "san-kamphaeng", coordinates: SAN_KAMPHAENG }),
];

describe("detourBudgetMinutes", () => {
  it("gives a short leg the floor budget", () => {
    expect(detourBudgetMinutes(25)).toBe(15);
  });

  it("scales with the leg, up to a ceiling", () => {
    expect(detourBudgetMinutes(100)).toBe(20);
    expect(detourBudgetMinutes(600)).toBe(30);
  });
});

describe("findLongestLeg", () => {
  it("returns null for a day with nothing to drive between", () => {
    expect(findLongestLeg(buildSchedule([]))).toBeNull();
    expect(findLongestLeg(buildSchedule([legDay[0]]))).toBeNull();
  });

  it("ignores legs too short to be worth breaking up", () => {
    const closeTogether = [
      makePlace({ slug: "a", coordinates: OLD_CITY }),
      makePlace({ slug: "b", coordinates: { lat: 18.7876, lng: 98.9908 } }),
    ];
    expect(findLongestLeg(buildSchedule(closeTogether))).toBeNull();
  });

  it("picks the longest leg of the day, not the first", () => {
    const day = [
      makePlace({ slug: "a", coordinates: OLD_CITY }),
      makePlace({ slug: "b", coordinates: { lat: 18.79, lng: 99.03 } }),
      makePlace({ slug: "c", coordinates: SAN_KAMPHAENG }),
      makePlace({ slug: "d", coordinates: { lat: 18.42101, lng: 98.67895 } }),
    ];
    const leg = findLongestLeg(buildSchedule(day));
    expect(leg?.from.slug).toBe("c");
    expect(leg?.to.slug).toBe("d");
  });

  it("carries the index and departure time needed to insert a stop", () => {
    const leg = findLongestLeg(buildSchedule(legDay))!;
    expect(leg.fromIndex).toBe(0);
    // First stop is 09:00–10:00 by default, so the leg departs at 600 minutes.
    expect(leg.departureMinutes).toBe(10 * 60);
  });
});

describe("findOnRouteStops", () => {
  const leg = findLongestLeg(buildSchedule(legDay))!;

  it("prefers a place on the line over one the same distance the wrong way", () => {
    const candidates = [
      makePlace({ slug: "wrong-way", coordinates: WRONG_WAY }),
      makePlace({ slug: "on-the-line", coordinates: ON_THE_LINE }),
    ];
    const results = findOnRouteStops({ leg, candidates, excludeSlugs: new Set() });
    expect(results.map((r) => r.place.slug)).toEqual(["on-the-line"]);
  });

  it("never reports a negative saving as a detour", () => {
    const candidates = [makePlace({ slug: "on-the-line", coordinates: ON_THE_LINE })];
    const [result] = findOnRouteStops({ leg, candidates, excludeSlugs: new Set() });
    expect(result.addedMinutes).toBeGreaterThanOrEqual(0);
  });

  it("skips the leg's own endpoints and anything already planned", () => {
    const candidates = [
      makePlace({ slug: "old-city", coordinates: OLD_CITY }),
      makePlace({ slug: "san-kamphaeng", coordinates: SAN_KAMPHAENG }),
      makePlace({ slug: "on-the-line", coordinates: ON_THE_LINE }),
    ];
    const results = findOnRouteStops({
      leg,
      candidates,
      excludeSlugs: new Set(["on-the-line"]),
    });
    expect(results).toEqual([]);
  });

  it("skips all-day places — a detour has to be a short stop", () => {
    const candidates = [
      makePlace({ slug: "all-day-park", coordinates: ON_THE_LINE, durationMinutes: 300 }),
    ];
    expect(findOnRouteStops({ leg, candidates, excludeSlugs: new Set() })).toEqual([]);
  });

  it("skips places closed on the trip date's day of week", () => {
    // 2026-08-24 is a Monday.
    const candidates = [
      makePlace({ slug: "closed-mon", coordinates: ON_THE_LINE, closedOnDays: [1] }),
    ];
    const results = findOnRouteStops({
      leg,
      candidates,
      excludeSlugs: new Set(),
      isoDate: "2026-08-24",
    });
    expect(results).toEqual([]);
  });

  it("skips places that would be shut by the time the traveller arrives", () => {
    const candidates = [
      makePlace({
        slug: "shuts-at-ten",
        coordinates: ON_THE_LINE,
        openingHours: { opens: "06:00", closes: "10:00" },
      }),
      makePlace({
        slug: "open-all-afternoon",
        coordinates: ON_THE_LINE,
        openingHours: { opens: "06:00", closes: "18:00" },
      }),
    ];
    const results = findOnRouteStops({ leg, candidates, excludeSlugs: new Set() });
    expect(results.map((r) => r.place.slug)).toEqual(["open-all-afternoon"]);
  });

  it("breaks ties on added time by rating", () => {
    const candidates = [
      makePlace({ slug: "lower", coordinates: ON_THE_LINE, rating: 4.1 }),
      makePlace({ slug: "higher", coordinates: ON_THE_LINE, rating: 4.9 }),
    ];
    const results = findOnRouteStops({ leg, candidates, excludeSlugs: new Set() });
    expect(results.map((r) => r.place.slug)).toEqual(["higher", "lower"]);
  });

  it("respects the limit", () => {
    const candidates = Array.from({ length: 6 }, (_, i) =>
      makePlace({ slug: `c${i}`, coordinates: ON_THE_LINE })
    );
    expect(findOnRouteStops({ leg, candidates, excludeSlugs: new Set(), limit: 2 })).toHaveLength(2);
  });
});
