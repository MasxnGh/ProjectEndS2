import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import {
  checkPlaceOnDate,
  checkDayFeasibility,
  findNextOpenDate,
  suggestDayFixes,
  type FeasibilityDay,
} from "./feasibility";

function makePlace(overrides: Partial<Place> & Pick<Place, "slug">): Place {
  return {
    name: { en: overrides.slug, th: overrides.slug },
    category: "market",
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
    coordinates: { lat: 18.79, lng: 98.99 },
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

// 2026-07-25 is a Saturday (day 6); 2026-07-27 is a Monday (day 1).
const SATURDAY = "2026-07-25";
const MONDAY = "2026-07-27";

describe("checkPlaceOnDate", () => {
  it("flags a place closed on that day of the week", () => {
    const mondayOnlyClosed = makePlace({ slug: "sunday-market", closedOnDays: [1] }); // closed Mondays
    expect(checkPlaceOnDate(mondayOnlyClosed, MONDAY)).toContainEqual(
      expect.objectContaining({ type: "closedOnDay", placeSlug: "sunday-market" })
    );
  });

  it("does not flag a place open on that day", () => {
    const alwaysOpen = makePlace({ slug: "temple", closedOnDays: [] });
    expect(checkPlaceOnDate(alwaysOpen, MONDAY)).toEqual([]);
  });

  it("flags a place inside a seasonal closure window", () => {
    const closedForRenovation = makePlace({
      slug: "renovating-temple",
      seasonalClosure: [{ start: "2026-07-01", end: "2026-08-01" }],
    });
    expect(checkPlaceOnDate(closedForRenovation, SATURDAY)).toContainEqual(
      expect.objectContaining({ type: "seasonalClosure", placeSlug: "renovating-temple" })
    );
  });

  it("does not flag a seasonal closure outside its window", () => {
    const closedForRenovation = makePlace({
      slug: "renovating-temple",
      seasonalClosure: [{ start: "2026-01-01", end: "2026-02-01" }],
    });
    expect(checkPlaceOnDate(closedForRenovation, SATURDAY)).toEqual([]);
  });

  it("flags a highly dust-sensitive outdoor place scheduled during burning season", () => {
    const viewpoint = makePlace({ slug: "mountain-viewpoint", outdoor: true, dustSensitivity: "high" });
    expect(checkPlaceOnDate(viewpoint, "2026-03-15")).toContainEqual(
      expect.objectContaining({ type: "hazeSensitive", placeSlug: "mountain-viewpoint" })
    );
  });

  it("does not flag a dust-sensitive place outside burning season", () => {
    const viewpoint = makePlace({ slug: "mountain-viewpoint", outdoor: true, dustSensitivity: "high" });
    expect(checkPlaceOnDate(viewpoint, "2026-07-15")).toEqual([]);
  });

  it("does not flag an indoor place even with high dust sensitivity during burning season", () => {
    const indoorMuseum = makePlace({ slug: "museum", outdoor: false, dustSensitivity: "high" });
    expect(checkPlaceOnDate(indoorMuseum, "2026-03-15")).toEqual([]);
  });

  it("does not flag an outdoor place with only moderate dust sensitivity during burning season", () => {
    const cafe = makePlace({ slug: "cafe", outdoor: true, dustSensitivity: "moderate" });
    expect(checkPlaceOnDate(cafe, "2026-03-15")).toEqual([]);
  });

  it("suggests the nearest date the place is actually open", () => {
    const closedMonday = makePlace({ slug: "sunday-market", closedOnDays: [1] });
    const issues = checkPlaceOnDate(closedMonday, MONDAY);
    expect(issues[0].suggestedIsoDate).not.toBeNull();
    expect(issues[0].suggestedIsoDate).not.toBe(MONDAY);
  });
});

describe("checkDayFeasibility", () => {
  it("returns no issues when the day has no date yet", () => {
    const place = makePlace({ slug: "sunday-market", closedOnDays: [1] });
    expect(checkDayFeasibility([place], null)).toEqual([]);
  });

  it("aggregates issues across every place in the day", () => {
    const closedMonday = makePlace({ slug: "a", closedOnDays: [1] });
    const fine = makePlace({ slug: "b", closedOnDays: [] });
    const issues = checkDayFeasibility([closedMonday, fine], MONDAY);
    expect(issues).toHaveLength(1);
    expect(issues[0].placeSlug).toBe("a");
  });
});

describe("findNextOpenDate", () => {
  it("finds the closest surrounding day the place is open", () => {
    const closedMonday = makePlace({ slug: "a", closedOnDays: [1] });
    const next = findNextOpenDate(closedMonday, MONDAY);
    expect(next).not.toBeNull();
    expect(next).not.toBe(MONDAY);
  });

  it("returns null when the place is closed every day (degenerate case)", () => {
    const alwaysClosed = makePlace({ slug: "a", closedOnDays: [0, 1, 2, 3, 4, 5, 6] });
    expect(findNextOpenDate(alwaysClosed, MONDAY, 3)).toBeNull();
  });
});

describe("suggestDayFixes", () => {
  it("moves a place to a day in the trip where it's actually open", () => {
    const marketClosedMonday = makePlace({ slug: "sunday-market", closedOnDays: [1, 2, 3, 4, 5, 6] }); // Sundays only
    const fineOnMonday = makePlace({ slug: "temple", closedOnDays: [] });

    const days: FeasibilityDay[] = [
      { dayId: "day-1", isoDate: MONDAY, places: [marketClosedMonday] }, // wrong day
      { dayId: "day-2", isoDate: "2026-08-02", places: [fineOnMonday] }, // 2026-08-02 is a Sunday
    ];

    const relocations = suggestDayFixes(days);
    expect(relocations).toEqual([{ placeSlug: "sunday-market", fromDayId: "day-1", toDayId: "day-2" }]);
  });

  it("moves a place that's inside a seasonal closure window to a day outside it", () => {
    const renovatingTemple = makePlace({
      slug: "renovating-temple",
      closedOnDays: [],
      seasonalClosure: [{ start: "2026-07-01", end: "2026-07-31" }],
    });
    const days: FeasibilityDay[] = [
      { dayId: "day-1", isoDate: "2026-07-15", places: [renovatingTemple] }, // inside closure
      { dayId: "day-2", isoDate: "2026-08-05", places: [] }, // outside closure
    ];
    const relocations = suggestDayFixes(days);
    expect(relocations).toEqual([{ placeSlug: "renovating-temple", fromDayId: "day-1", toDayId: "day-2" }]);
  });

  it("does not move a seasonally-closed place to another day still inside the closure window", () => {
    const renovatingTemple = makePlace({
      slug: "renovating-temple",
      closedOnDays: [],
      seasonalClosure: [{ start: "2026-07-01", end: "2026-07-31" }],
    });
    const days: FeasibilityDay[] = [
      { dayId: "day-1", isoDate: "2026-07-10", places: [renovatingTemple] },
      { dayId: "day-2", isoDate: "2026-07-20", places: [] }, // still inside the closure
    ];
    expect(suggestDayFixes(days)).toEqual([]);
  });

  it("suggests nothing when every place is already on a day it's open", () => {
    const fine = makePlace({ slug: "temple", closedOnDays: [] });
    const days: FeasibilityDay[] = [{ dayId: "day-1", isoDate: MONDAY, places: [fine] }];
    expect(suggestDayFixes(days)).toEqual([]);
  });

  it("suggests nothing when no day in the trip has a date yet", () => {
    const closedMonday = makePlace({ slug: "a", closedOnDays: [1] });
    const days: FeasibilityDay[] = [{ dayId: "day-1", isoDate: null, places: [closedMonday] }];
    expect(suggestDayFixes(days)).toEqual([]);
  });

  it("suggests nothing when no other day in the trip would work either", () => {
    const alwaysClosedOnTripDays = makePlace({ slug: "a", closedOnDays: [1, 2] }); // Mon and Tue
    const days: FeasibilityDay[] = [
      { dayId: "day-1", isoDate: "2026-07-27", places: [alwaysClosedOnTripDays] }, // Monday
      { dayId: "day-2", isoDate: "2026-07-28", places: [] }, // Tuesday — also closed
    ];
    expect(suggestDayFixes(days)).toEqual([]);
  });
});
