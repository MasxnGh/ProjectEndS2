import type { Place } from "@/data/types";

export type PackingSuggestionId =
  | "modestClothing"
  | "slipOnShoes"
  | "sturdyShoes"
  | "rainLayer"
  | "bookingConfirmation"
  | "headlamp"
  | "dustMask"
  | "warmLayerElevation";

const STRENUOUS_INTENSITY_THRESHOLD = 4;
const HIGH_ELEVATION_METRES = 1000;

/**
 * Derives packing suggestions from the trip's actual scheduled places
 * (dress code, physical intensity, rain/dust sensitivity, booking
 * requirements, sunrise-golden-hour timing, elevation) rather than a fixed
 * generic checklist — each id maps to real fields already on Place, never a
 * guess about a specific place's needs.
 */
export function suggestPackingItems(places: Place[]): PackingSuggestionId[] {
  const ids = new Set<PackingSuggestionId>();

  for (const place of places) {
    if (place.dressCode?.coverShoulders || place.dressCode?.coverKnees) {
      ids.add("modestClothing");
    }
    if (place.dressCode?.removeShoes) {
      ids.add("slipOnShoes");
    }
    if (place.physicalIntensity >= STRENUOUS_INTENSITY_THRESHOLD) {
      ids.add("sturdyShoes");
    }
    if (place.outdoor && place.rainSensitivity === "high") {
      ids.add("rainLayer");
    }
    if (place.requiresBooking) {
      ids.add("bookingConfirmation");
    }
    if (place.goldenHourType === "sunrise") {
      ids.add("headlamp");
    }
    if (place.outdoor && place.dustSensitivity === "high") {
      ids.add("dustMask");
    }
    if (place.elevation !== null && place.elevation >= HIGH_ELEVATION_METRES) {
      ids.add("warmLayerElevation");
    }
  }

  return Array.from(ids);
}
