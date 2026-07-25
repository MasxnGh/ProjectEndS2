import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { compareVehicleModes } from "./vehicle-comparison";

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

describe("compareVehicleModes", () => {
  it("returns zero time and zero cost for every mode on a trip with no travel legs", () => {
    const single = [{ places: [makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } })] }];
    const result = compareVehicleModes(single);
    for (const row of result) {
      expect(row.totalTravelMinutes).toBe(0);
    }
    const walk = result.find((r) => r.mode === "walk")!;
    const grab = result.find((r) => r.mode === "grab")!;
    expect(walk.totalCostThb).toBe(0);
    expect(grab.totalCostThb).toBe(0);
  });

  it("ignores empty days entirely", () => {
    const days = [
      { places: [makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } })] },
      { places: [] },
    ];
    const result = compareVehicleModes(days);
    const bike = result.find((r) => r.mode === "rented-bike")!;
    // Only one used day, so exactly one day's rental — not two.
    expect(bike.totalCostThb).toBe(200);
  });

  it("costs nothing to walk regardless of distance", () => {
    const days = [
      {
        places: [
          makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
          makePlace({ slug: "b", coordinates: { lat: 19.3, lng: 98.6 } }),
        ],
      },
    ];
    const result = compareVehicleModes(days);
    expect(result.find((r) => r.mode === "walk")!.totalCostThb).toBe(0);
  });

  it("charges Grab a base fare per leg plus a per-km rate", () => {
    const days = [
      {
        places: [
          makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
          makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 } }),
          makePlace({ slug: "c", coordinates: { lat: 18.81, lng: 99.01 } }),
        ],
      },
    ];
    const result = compareVehicleModes(days);
    const grab = result.find((r) => r.mode === "grab")!;
    // Two legs -> at least two base fares' worth of cost.
    expect(grab.totalCostThb).toBeGreaterThanOrEqual(90);
  });

  it("orders travel time fastest-to-slowest as rented-car, rented-bike/grab, songthaew, walk", () => {
    const days = [
      {
        places: [
          makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
          makePlace({ slug: "b", coordinates: { lat: 19.1, lng: 98.7 } }),
        ],
      },
    ];
    const result = compareVehicleModes(days);
    const byMode = Object.fromEntries(result.map((r) => [r.mode, r.totalTravelMinutes]));
    expect(byMode["rented-car"]).toBeLessThan(byMode.walk);
    expect(byMode["rented-car"]).toBeLessThanOrEqual(byMode["rented-bike"]);
    expect(byMode.grab).toBeLessThan(byMode.songthaew);
  });

  it("charges rented vehicles for every used day even with no travel between stops", () => {
    const days = [
      { places: [makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } })] },
      { places: [makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 } })] },
    ];
    const result = compareVehicleModes(days);
    expect(result.find((r) => r.mode === "rented-car")!.totalCostThb).toBe(1800);
  });
});
