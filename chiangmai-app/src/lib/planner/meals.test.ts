import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { buildSchedule } from "./schedule";
import { countUnplannedMeals, findMealGaps, suggestMealPlaces, MEAL_WINDOWS } from "./meals";

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

/** Old-city coordinates a few hundred metres apart — travel between them stays at the 5-minute floor. */
const A = { lat: 18.7873, lng: 98.9853 };
const B = { lat: 18.7876, lng: 98.9908 };
const FAR = { lat: 18.42101, lng: 98.67895 }; // Chom Thong — well over an hour away

describe("findMealGaps", () => {
  it("finds no gap in an empty day", () => {
    expect(findMealGaps(buildSchedule([]))).toEqual([]);
  });

  it("flags lunch when a day runs straight through the window", () => {
    // 09:00 start, three 90-minute stops — last one runs 12:10–13:40.
    const day = [
      makePlace({ slug: "a", coordinates: A, durationMinutes: 90 }),
      makePlace({ slug: "b", coordinates: B, durationMinutes: 90 }),
      makePlace({ slug: "c", coordinates: A, durationMinutes: 90 }),
    ];
    const gaps = findMealGaps(buildSchedule(day));
    expect(gaps.map((g) => g.meal)).toEqual(["lunch"]);
  });

  it("does not flag lunch when a food stop covers the window", () => {
    const day = [
      makePlace({ slug: "a", coordinates: A, durationMinutes: 90 }),
      makePlace({ slug: "b", coordinates: B, durationMinutes: 90 }),
      // Third stop lands at 12:10–13:40, squarely inside the lunch window.
      makePlace({ slug: "lunch-spot", coordinates: A, durationMinutes: 90, category: "restaurant" }),
    ];
    expect(findMealGaps(buildSchedule(day))).toEqual([]);
  });

  it.each(["restaurant", "cafe", "market"] as const)("treats %s as having eaten", (category) => {
    const day = [
      makePlace({ slug: "a", coordinates: A, durationMinutes: 90 }),
      makePlace({ slug: "b", coordinates: B, durationMinutes: 90 }),
      makePlace({ slug: "food", coordinates: A, durationMinutes: 90, category }),
    ];
    expect(findMealGaps(buildSchedule(day))).toEqual([]);
  });

  it("does not flag a meal the day barely clips", () => {
    // One 60-minute stop from 09:00 — nowhere near either meal window.
    const gaps = findMealGaps(buildSchedule([makePlace({ slug: "a", coordinates: A })]));
    expect(gaps).toEqual([]);
  });

  it("flags dinner on a day that runs into the evening", () => {
    // Six 120-minute stops from 09:00 runs past 20:00.
    const day = Array.from({ length: 6 }, (_, i) =>
      makePlace({ slug: `s${i}`, coordinates: i % 2 ? A : B, durationMinutes: 120 })
    );
    const gaps = findMealGaps(buildSchedule(day));
    expect(gaps.map((g) => g.meal)).toContain("dinner");
  });

  it("anchors a gap to the stop the traveller is at when the window opens", () => {
    const day = [
      makePlace({ slug: "morning", coordinates: A, durationMinutes: 120 }),
      makePlace({ slug: "late-morning", coordinates: B, durationMinutes: 120 }),
    ];
    // 09:00–11:00 then 11:05–13:05: the lunch window opens during the second stop.
    const [gap] = findMealGaps(buildSchedule(day));
    expect(gap.anchorPlace.slug).toBe("late-morning");
    expect(gap.insertAfterIndex).toBe(1);
  });
});

describe("countUnplannedMeals", () => {
  it("adds up gaps across every day", () => {
    const busyDay = [
      makePlace({ slug: "a", coordinates: A, durationMinutes: 90 }),
      makePlace({ slug: "b", coordinates: B, durationMinutes: 90 }),
      makePlace({ slug: "c", coordinates: A, durationMinutes: 90 }),
    ];
    const fedDay = [
      makePlace({ slug: "d", coordinates: A, durationMinutes: 90 }),
      makePlace({ slug: "e", coordinates: B, durationMinutes: 90 }),
      makePlace({ slug: "f", coordinates: A, durationMinutes: 90, category: "restaurant" }),
    ];
    expect(countUnplannedMeals([{ places: busyDay }, { places: fedDay }])).toBe(1);
  });

  it("counts nothing for a trip with no stops", () => {
    expect(countUnplannedMeals([{ places: [] }, { places: [] }])).toBe(0);
  });
});

describe("suggestMealPlaces", () => {
  const day = [
    makePlace({ slug: "a", coordinates: A, durationMinutes: 90 }),
    makePlace({ slug: "b", coordinates: B, durationMinutes: 90 }),
    makePlace({ slug: "c", coordinates: A, durationMinutes: 90 }),
  ];
  const [lunchGap] = findMealGaps(buildSchedule(day));
  const lunchWindow = MEAL_WINDOWS.find((w) => w.id === "lunch")!;

  it("only suggests food places", () => {
    const candidates = [
      makePlace({ slug: "temple", coordinates: B }),
      makePlace({ slug: "noodles", coordinates: B, category: "restaurant" }),
    ];
    const results = suggestMealPlaces({ gap: lunchGap, candidates, excludeSlugs: new Set() });
    expect(results.map((r) => r.place.slug)).toEqual(["noodles"]);
  });

  it("skips places already in the trip", () => {
    const candidates = [makePlace({ slug: "noodles", coordinates: B, category: "restaurant" })];
    const results = suggestMealPlaces({
      gap: lunchGap,
      candidates,
      excludeSlugs: new Set(["noodles"]),
    });
    expect(results).toEqual([]);
  });

  it("skips places closed on the trip date's day of week", () => {
    // 2026-08-24 is a Monday.
    const candidates = [
      makePlace({ slug: "closed-mon", coordinates: B, category: "restaurant", closedOnDays: [1] }),
      makePlace({ slug: "open-mon", coordinates: B, category: "restaurant" }),
    ];
    const results = suggestMealPlaces({
      gap: lunchGap,
      candidates,
      excludeSlugs: new Set(),
      isoDate: "2026-08-24",
    });
    expect(results.map((r) => r.place.slug)).toEqual(["open-mon"]);
  });

  it("skips places shut during the meal window", () => {
    const candidates = [
      makePlace({
        slug: "breakfast-only",
        coordinates: B,
        category: "restaurant",
        openingHours: { opens: "06:00", closes: "10:00" },
      }),
      makePlace({
        slug: "lunch-service",
        coordinates: B,
        category: "restaurant",
        openingHours: { opens: "11:00", closes: "15:00" },
      }),
    ];
    const results = suggestMealPlaces({ gap: lunchGap, candidates, excludeSlugs: new Set() });
    expect(results.map((r) => r.place.slug)).toEqual(["lunch-service"]);
  });

  it("keeps places whose hours are unverified rather than hiding them", () => {
    const candidates = [
      makePlace({ slug: "unknown-hours", coordinates: B, category: "restaurant", openingHours: null }),
    ];
    const results = suggestMealPlaces({ gap: lunchGap, candidates, excludeSlugs: new Set() });
    expect(results.map((r) => r.place.slug)).toEqual(["unknown-hours"]);
    expect(lunchWindow.startMinutes).toBe(11 * 60 + 30);
  });

  it("drops anything too far to be a meal stop", () => {
    const candidates = [makePlace({ slug: "chom-thong", coordinates: FAR, category: "restaurant" })];
    expect(suggestMealPlaces({ gap: lunchGap, candidates, excludeSlugs: new Set() })).toEqual([]);
  });

  it("ranks nearer places first and respects the limit", () => {
    const candidates = [
      makePlace({ slug: "near", coordinates: B, category: "restaurant" }),
      makePlace({ slug: "middling", coordinates: { lat: 18.81, lng: 99.02 }, category: "restaurant" }),
      makePlace({ slug: "edge", coordinates: { lat: 18.86, lng: 99.05 }, category: "restaurant" }),
    ];
    const results = suggestMealPlaces({
      gap: lunchGap,
      candidates,
      excludeSlugs: new Set(),
      limit: 2,
    });
    expect(results).toHaveLength(2);
    expect(results[0].travelMinutes).toBeLessThanOrEqual(results[1].travelMinutes);
  });
});
