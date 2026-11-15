import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { getDictionary } from "@/i18n";
import { EMPTY_FILTERS, matchesFilters, placeFacts, queryTerms, type ExploreFilters } from "./filter";

const th = getDictionary("th");

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
    coordinates: { lat: 18.7883, lng: 98.9853 },
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

function passes(place: Place, filters: Partial<ExploreFilters>, skip?: keyof ExploreFilters) {
  const all = { ...EMPTY_FILTERS, ...filters };
  return matchesFilters(place, placeFacts(place, th), all, queryTerms(all.query), skip);
}

describe("explore filtering", () => {
  const cafe = makePlace({
    slug: "ristr8to",
    name: { en: "Ristr8to", th: "ริสเตรตโต้" },
    category: "cafe",
    district: "nimman",
    priceLevel: 2,
    bestTime: ["morning"],
    tags: ["coffee", "latte art"],
    coordinates: { lat: 18.7975, lng: 98.9675 },
  });

  it("passes everything when nothing is set", () => {
    expect(passes(cafe, {})).toBe(true);
  });

  it("finds a place by its district, in Thai or by key", () => {
    expect(passes(cafe, { query: "นิมมาน" })).toBe(true);
    expect(passes(cafe, { query: "nimman" })).toBe(true);
  });

  it("finds a place by its category name and its tags", () => {
    expect(passes(cafe, { query: "คาเฟ่" })).toBe(true);
    expect(passes(cafe, { query: "LATTE art" })).toBe(true);
  });

  it("needs every word of the query", () => {
    expect(passes(cafe, { query: "coffee nimman" })).toBe(true);
    expect(passes(cafe, { query: "coffee waterfall" })).toBe(false);
  });

  it("applies category, price and time", () => {
    expect(passes(cafe, { category: "temple" })).toBe(false);
    expect(passes(cafe, { price: 2, time: "morning" })).toBe(true);
    expect(passes(cafe, { time: "evening" })).toBe(false);
  });

  it("can leave one filter out, for a chip's would-be count", () => {
    expect(passes(cafe, { category: "temple" }, "category")).toBe(true);
    expect(passes(cafe, { category: "temple", price: 3 }, "category")).toBe(false);
  });

  it("places a point inside the walls in the 'inside' zone", () => {
    const inside = makePlace({ slug: "wat-in-town", coordinates: { lat: 18.7883, lng: 98.9853 } });
    expect(passes(inside, { zone: "inside" })).toBe(true);
    expect(passes(inside, { zone: "west" })).toBe(false);
  });
});

describe("queryTerms", () => {
  it("splits on any whitespace and lower-cases", () => {
    expect(queryTerms("  Khao   SOI ")).toEqual(["khao", "soi"]);
    expect(queryTerms("")).toEqual([]);
  });
});
