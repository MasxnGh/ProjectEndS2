import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { isSortAvailable, sortPlaces } from "./sort";

function makePlace(overrides: Partial<Place> & Pick<Place, "slug">): Place {
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
    coordinates: { lat: 18.7873, lng: 98.9853 },
    elevation: null,
    tags: [],
    paletteSeed: 1,
    outdoor: false,
    openingHours: null,
    closedOnDays: [],
    seasonalClosure: null,
    bestTimeWindows: [],
    goldenHourType: null,
    exposure: "indoor",
    rainSensitivity: "none",
    dustSensitivity: "none",
    physicalIntensity: 1,
    dressCode: null,
    requiresBooking: false,
    dataLastVerified: null,
    ...overrides,
  };
}

const OLD_CITY = { lat: 18.7873, lng: 98.9853 };

const places = [
  makePlace({ slug: "c-mid", rating: 4.2, durationMinutes: 90, coordinates: { lat: 18.9, lng: 99.0 } }),
  makePlace({ slug: "a-best", rating: 4.9, durationMinutes: 240, coordinates: { lat: 19.4, lng: 98.9 } }),
  makePlace({ slug: "b-quick", rating: 4.5, durationMinutes: 20, coordinates: OLD_CITY }),
];

describe("sortPlaces", () => {
  it("leaves the editorial order alone for 'recommended'", () => {
    const result = sortPlaces(places, "recommended", null);
    expect(result.map((p) => p.slug)).toEqual(["c-mid", "a-best", "b-quick"]);
    // Same array reference is fine here, but it must not have been reordered.
    expect(result[0].slug).toBe(places[0].slug);
  });

  it("never mutates the array it was given", () => {
    const before = places.map((p) => p.slug);
    sortPlaces(places, "rating", null);
    sortPlaces(places, "shortest", null);
    sortPlaces(places, "nearest", OLD_CITY);
    expect(places.map((p) => p.slug)).toEqual(before);
  });

  it("sorts by rating, highest first", () => {
    expect(sortPlaces(places, "rating", null).map((p) => p.slug)).toEqual([
      "a-best",
      "b-quick",
      "c-mid",
    ]);
  });

  it("sorts by shortest visit first", () => {
    expect(sortPlaces(places, "shortest", null).map((p) => p.slug)).toEqual([
      "b-quick",
      "c-mid",
      "a-best",
    ]);
  });

  it("sorts by distance from the reference point", () => {
    expect(sortPlaces(places, "nearest", OLD_CITY).map((p) => p.slug)).toEqual([
      "b-quick",
      "c-mid",
      "a-best",
    ]);
  });

  // Nearest-to-nowhere is not a meaningful order, so it falls back rather
  // than silently producing an arbitrary one.
  it("falls back to the editorial order when 'nearest' has no reference point", () => {
    expect(sortPlaces(places, "nearest", null).map((p) => p.slug)).toEqual([
      "c-mid",
      "a-best",
      "b-quick",
    ]);
  });

  it("breaks ties by slug so the order is stable", () => {
    const tied = [
      makePlace({ slug: "zebra", rating: 4.5 }),
      makePlace({ slug: "alpha", rating: 4.5 }),
      makePlace({ slug: "monkey", rating: 4.5 }),
    ];
    expect(sortPlaces(tied, "rating", null).map((p) => p.slug)).toEqual([
      "alpha",
      "monkey",
      "zebra",
    ]);
  });

  it("handles an empty result set", () => {
    expect(sortPlaces([], "rating", null)).toEqual([]);
  });
});

describe("isSortAvailable", () => {
  it("allows every sort that does not need a location", () => {
    for (const sort of ["recommended", "rating", "shortest"] as const) {
      expect(isSortAvailable(sort, null)).toBe(true);
    }
  });

  it("only allows 'nearest' once there is somewhere to measure from", () => {
    expect(isSortAvailable("nearest", null)).toBe(false);
    expect(isSortAvailable("nearest", OLD_CITY)).toBe(true);
  });
});
