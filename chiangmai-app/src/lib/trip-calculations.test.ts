import { describe, expect, it } from "vitest";
import { categorySpendBreakdown, SPEND_ESTIMATE_THB } from "./trip-calculations";
import type { Place, PlaceCategory } from "@/data/types";

function makePlace(category: PlaceCategory, overrides: Partial<Place> = {}): Place {
  return {
    slug: `${category}-place`,
    name: { en: category, th: category },
    category,
    district: "old-city",
    bestTime: ["anytime"],
    durationMinutes: 60,
    priceLevel: 1,
    rating: 4,
    shortDescription: { en: "s", th: "s" },
    description: { en: "d", th: "d" },
    localTip: { en: "t", th: "t" },
    openingHoursText: { en: "h", th: "h" },
    address: { en: "a", th: "a" },
    coordinates: { lat: 18.79, lng: 98.99 },
    elevation: null,
    tags: ["tag"],
    paletteSeed: 1,
    outdoor: false,
    openingHours: { opens: "09:00", closes: "17:00" },
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

describe("categorySpendBreakdown", () => {
  const spend = SPEND_ESTIMATE_THB[1];

  // A meal is not an admission fee. Every eating category has to land in the
  // "food" bucket or the Summary → Budget chart tells the traveller they spent
  // their money on entry tickets.
  it.each(["restaurant", "cafe", "market"] as const)("counts %s spend as food", (category) => {
    const breakdown = categorySpendBreakdown([{ places: [makePlace(category)] }]);
    expect(breakdown.food).toBe(spend);
    expect(breakdown.entry).toBe(0);
  });

  it.each(["temple", "nature", "village", "museum", "activity"] as const)(
    "counts %s spend as entry",
    (category) => {
      const breakdown = categorySpendBreakdown([{ places: [makePlace(category)] }]);
      expect(breakdown.entry).toBe(spend);
      expect(breakdown.food).toBe(0);
    }
  );

  it("adds a transport estimate only between stops, not for a single stop", () => {
    const single = categorySpendBreakdown([{ places: [makePlace("temple")] }]);
    expect(single.transport).toBe(0);

    const pair = categorySpendBreakdown([
      {
        places: [
          makePlace("temple", { slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
          makePlace("restaurant", { slug: "b", coordinates: { lat: 18.85, lng: 99.05 } }),
        ],
      },
    ]);
    expect(pair.transport).toBeGreaterThan(0);
    expect(pair.total).toBe(pair.entry + pair.food + pair.transport);
  });
});
