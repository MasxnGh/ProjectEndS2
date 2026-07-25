import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { suggestPackingItems } from "./packing-suggestions";

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
    coordinates: { lat: 18.79, lng: 98.99 },
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

describe("suggestPackingItems", () => {
  it("returns nothing for an empty trip", () => {
    expect(suggestPackingItems([])).toEqual([]);
  });

  it("returns nothing for a plain place with no special requirements", () => {
    expect(suggestPackingItems([makePlace({ slug: "plain" })])).toEqual([]);
  });

  it("suggests modest clothing for a place requiring covered shoulders or knees", () => {
    const temple = makePlace({
      slug: "temple",
      dressCode: { coverShoulders: true, coverKnees: false, removeShoes: false, note: null },
    });
    expect(suggestPackingItems([temple])).toContain("modestClothing");
  });

  it("suggests slip-on shoes for a place requiring shoes removed", () => {
    const temple = makePlace({
      slug: "temple",
      dressCode: { coverShoulders: false, coverKnees: false, removeShoes: true, note: null },
    });
    expect(suggestPackingItems([temple])).toContain("slipOnShoes");
  });

  it("suggests sturdy shoes for a strenuous place", () => {
    expect(suggestPackingItems([makePlace({ slug: "hike", physicalIntensity: 5 })])).toContain("sturdyShoes");
  });

  it("does not suggest sturdy shoes for a low-intensity place", () => {
    expect(suggestPackingItems([makePlace({ slug: "cafe", physicalIntensity: 1 })])).not.toContain("sturdyShoes");
  });

  it("suggests a rain layer for a highly rain-sensitive outdoor place", () => {
    const waterfall = makePlace({ slug: "waterfall", outdoor: true, rainSensitivity: "high" });
    expect(suggestPackingItems([waterfall])).toContain("rainLayer");
  });

  it("does not suggest a rain layer for an indoor place even if rain-sensitive", () => {
    const indoor = makePlace({ slug: "indoor", outdoor: false, rainSensitivity: "high" });
    expect(suggestPackingItems([indoor])).not.toContain("rainLayer");
  });

  it("suggests booking confirmation for a place that requires booking", () => {
    expect(suggestPackingItems([makePlace({ slug: "class", requiresBooking: true })])).toContain(
      "bookingConfirmation"
    );
  });

  it("suggests a headlamp for a sunrise golden-hour place", () => {
    expect(suggestPackingItems([makePlace({ slug: "viewpoint", goldenHourType: "sunrise" })])).toContain(
      "headlamp"
    );
  });

  it("does not suggest a headlamp for a sunset golden-hour place", () => {
    expect(suggestPackingItems([makePlace({ slug: "viewpoint", goldenHourType: "sunset" })])).not.toContain(
      "headlamp"
    );
  });

  it("suggests a dust mask for a highly dust-sensitive outdoor place", () => {
    const viewpoint = makePlace({ slug: "viewpoint", outdoor: true, dustSensitivity: "high" });
    expect(suggestPackingItems([viewpoint])).toContain("dustMask");
  });

  it("suggests a warm layer for a high-elevation place", () => {
    expect(suggestPackingItems([makePlace({ slug: "mountain", elevation: 2565 })])).toContain(
      "warmLayerElevation"
    );
  });

  it("does not suggest a warm layer for a low-elevation place", () => {
    expect(suggestPackingItems([makePlace({ slug: "city", elevation: 310 })])).not.toContain("warmLayerElevation");
  });

  it("deduplicates the same suggestion triggered by multiple places", () => {
    const a = makePlace({ slug: "a", physicalIntensity: 5 });
    const b = makePlace({ slug: "b", physicalIntensity: 4 });
    const result = suggestPackingItems([a, b]);
    expect(result.filter((id) => id === "sturdyShoes")).toHaveLength(1);
  });
});
