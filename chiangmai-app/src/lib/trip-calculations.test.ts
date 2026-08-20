import { describe, expect, it } from "vitest";
import {
  ASSUMED_MEAL_THB,
  categorySpendBreakdown,
  estimateTripCostThb,
  SPEND_ESTIMATE_THB,
} from "./trip-calculations";
import type { Place, PlaceCategory } from "@/data/types";
import { compareVehicleModes } from "./planner/vehicle-comparison";

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
    const single = categorySpendBreakdown([{ places: [makePlace("temple")] }], "songthaew");
    expect(single.transport).toBe(0);

    const pair = categorySpendBreakdown(
      [
        {
          places: [
            makePlace("temple", { slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
            makePlace("restaurant", { slug: "b", coordinates: { lat: 18.85, lng: 99.05 } }),
          ],
        },
      ],
      "songthaew"
    );
    expect(pair.transport).toBeGreaterThan(0);
    // This pair is done by 11:15, before any meal window opens.
    expect(pair.assumedMeals).toBe(0);
    expect(pair.total).toBe(pair.entry + pair.food + pair.transport + pair.assumedMeals);
  });
});

// The planner will happily schedule a full day of temples and then report a
// food budget of ฿0. These pin the correction in place.
describe("assumed meal cost", () => {
  const OLD_CITY = { lat: 18.7873, lng: 98.9853 };
  const NEARBY = { lat: 18.7876, lng: 98.9908 };

  /** 09:00 start, three 90-minute stops — the last runs 12:10–13:40, straight through lunch. */
  function dayThroughLunch(lastCategory: PlaceCategory = "temple") {
    return {
      places: [
        makePlace("temple", { slug: "a", coordinates: OLD_CITY, durationMinutes: 90 }),
        makePlace("temple", { slug: "b", coordinates: NEARBY, durationMinutes: 90 }),
        makePlace(lastCategory, { slug: "c", coordinates: OLD_CITY, durationMinutes: 90 }),
      ],
    };
  }

  it("charges for a meal the itinerary runs through but never names", () => {
    const breakdown = categorySpendBreakdown([dayThroughLunch()]);
    expect(breakdown.food).toBe(0);
    expect(breakdown.assumedMeals).toBe(ASSUMED_MEAL_THB);
  });

  it("stops assuming once a real food stop covers the window", () => {
    const breakdown = categorySpendBreakdown([dayThroughLunch("restaurant")]);
    expect(breakdown.assumedMeals).toBe(0);
    expect(breakdown.food).toBe(SPEND_ESTIMATE_THB[1]);
  });

  it("assumes nothing for an empty trip", () => {
    expect(categorySpendBreakdown([{ places: [] }]).assumedMeals).toBe(0);
  });

  it("scales the assumption per traveller, like any other meal", () => {
    const breakdown = categorySpendBreakdown([dayThroughLunch()]);
    const solo = estimateTripCostThb(breakdown, 1, 0);
    const pair = estimateTripCostThb(breakdown, 2, 0);
    expect(pair - solo).toBe(breakdown.entry + breakdown.food + breakdown.assumedMeals);
  });

  it("still totals correctly for callers that predate the field", () => {
    expect(estimateTripCostThb({ entry: 100, food: 50, transport: 20 }, 1, 0)).toBe(170);
  });
});

// Picking "Walk" showed 0 THB in Summary -> Transport while the headline total
// still billed 8 THB/km. One model now drives both.
describe("transport cost follows the selected travel mode", () => {
  const twoStopDay = [
    {
      places: [
        makePlace("temple", { slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
        makePlace("temple", { slug: "b", coordinates: { lat: 18.85, lng: 99.05 } }),
      ],
    },
  ];

  it("charges nothing to walk", () => {
    expect(categorySpendBreakdown(twoStopDay, "walk").transport).toBe(0);
  });

  it("agrees with the figure the comparison table shows for that mode", () => {
    const rows = compareVehicleModes(twoStopDay);
    for (const row of rows) {
      expect(categorySpendBreakdown(twoStopDay, row.mode).transport).toBe(row.totalCostThb);
    }
  });

  it("moves the trip total when the mode changes", () => {
    const walking = estimateTripCostThb(categorySpendBreakdown(twoStopDay, "walk"), 2, 0);
    const driving = estimateTripCostThb(categorySpendBreakdown(twoStopDay, "rented-car"), 2, 0);
    expect(driving).toBeGreaterThan(walking);
  });
});
