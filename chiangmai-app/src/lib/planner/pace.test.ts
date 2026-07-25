import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { buildSchedule } from "./schedule";
import { computeDayPace, suggestPaceRelief } from "./pace";

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

describe("computeDayPace", () => {
  it("scores an empty day as easygoing with a zero score", () => {
    const pace = computeDayPace([], buildSchedule([]));
    expect(pace.score).toBe(0);
    expect(pace.band).toBe("easygoing");
    expect(pace.dominantFactor).toBeNull();
  });

  it("scores a single relaxed stop lower than a packed, intense, mountainous day", () => {
    const relaxed = [makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60, physicalIntensity: 1 })];
    const relaxedPace = computeDayPace(relaxed, buildSchedule(relaxed));

    const packed = [
      makePlace({ slug: "p1", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 90, physicalIntensity: 5, elevation: 300 }),
      makePlace({ slug: "p2", coordinates: { lat: 19.1, lng: 98.9 }, durationMinutes: 120, physicalIntensity: 5, elevation: 1300 }),
      makePlace({ slug: "p3", coordinates: { lat: 18.55, lng: 98.49 }, durationMinutes: 120, physicalIntensity: 5, elevation: 2565 }),
      makePlace({ slug: "p4", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60, physicalIntensity: 4, elevation: 310 }),
    ];
    const packedPace = computeDayPace(packed, buildSchedule(packed));

    expect(packedPace.score).toBeGreaterThan(relaxedPace.score);
    expect(packedPace.band).toBe("ambitious");
    expect(relaxedPace.band).toBe("easygoing");
  });

  it("increases the transit sub-score as travel time grows", () => {
    const nearby = [
      makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
      makePlace({ slug: "b", coordinates: { lat: 18.791, lng: 98.991 } }),
    ];
    const far = [
      makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } }),
      makePlace({ slug: "b", coordinates: { lat: 19.3, lng: 98.6 } }),
    ];
    const nearbyPace = computeDayPace(nearby, buildSchedule(nearby));
    const farPace = computeDayPace(far, buildSchedule(far));
    expect(farPace.breakdown.transit).toBeGreaterThan(nearbyPace.breakdown.transit);
  });

  it("increases the elevation sub-score for places at very different altitudes", () => {
    const flat = [
      makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, elevation: 310 }),
      makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 }, elevation: 320 }),
    ];
    const mountainous = [
      makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 }, elevation: 310 }),
      makePlace({ slug: "b", coordinates: { lat: 18.55, lng: 98.49 }, elevation: 2565 }),
    ];
    const flatPace = computeDayPace(flat, buildSchedule(flat));
    const mountainousPace = computeDayPace(mountainous, buildSchedule(mountainous));
    expect(mountainousPace.breakdown.elevation).toBeGreaterThan(flatPace.breakdown.elevation);
  });

  it("gives a day with more slack a lower buffer sub-score", () => {
    const busy = Array.from({ length: 4 }, (_, i) =>
      makePlace({ slug: `busy-${i}`, coordinates: { lat: 18.79 + i * 0.01, lng: 98.99 }, durationMinutes: 150 })
    );
    const relaxed = [makePlace({ slug: "one", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60 })];
    const busyPace = computeDayPace(busy, buildSchedule(busy));
    const relaxedPace = computeDayPace(relaxed, buildSchedule(relaxed));
    expect(busyPace.breakdown.buffer).toBeGreaterThan(relaxedPace.breakdown.buffer);
  });
});

describe("suggestPaceRelief", () => {
  function dayInput(dayId: string, places: Place[]) {
    return { dayId, places, schedule: buildSchedule(places) };
  }

  it("returns null when no day is ambitious", () => {
    const day1 = dayInput("day-1", [makePlace({ slug: "a", coordinates: { lat: 18.79, lng: 98.99 } })]);
    const day2 = dayInput("day-2", [makePlace({ slug: "b", coordinates: { lat: 18.8, lng: 99.0 } })]);
    expect(suggestPaceRelief([day1, day2])).toBeNull();
  });

  it("suggests moving the busiest day's most physically demanding stop to the lightest other day", () => {
    const busyPlaces = [
      makePlace({ slug: "gentle", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 90, physicalIntensity: 2, elevation: 300 }),
      makePlace({ slug: "steep-hike", coordinates: { lat: 18.55, lng: 98.49 }, durationMinutes: 180, physicalIntensity: 5, elevation: 2565 }),
      makePlace({ slug: "market", coordinates: { lat: 18.8, lng: 99.0 }, durationMinutes: 90, physicalIntensity: 3, elevation: 310 }),
      makePlace({ slug: "temple", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 60, physicalIntensity: 2, elevation: 310 }),
    ];
    const lightPlaces = [makePlace({ slug: "cafe", coordinates: { lat: 18.79, lng: 98.99 }, durationMinutes: 45, physicalIntensity: 1 })];

    const busyDay = dayInput("day-busy", busyPlaces);
    const lightDay = dayInput("day-light", lightPlaces);
    expect(computeDayPace(busyPlaces, busyDay.schedule).band).toBe("ambitious");

    const relocation = suggestPaceRelief([busyDay, lightDay]);
    expect(relocation).toEqual({ placeSlug: "steep-hike", fromDayId: "day-busy", toDayId: "day-light" });
  });

  it("does not suggest emptying a day that only has one stop", () => {
    const soloIntense = [
      makePlace({ slug: "solo", coordinates: { lat: 18.55, lng: 98.49 }, durationMinutes: 300, physicalIntensity: 5, elevation: 2565 }),
    ];
    const other = [makePlace({ slug: "other", coordinates: { lat: 18.79, lng: 98.99 } })];
    const soloDay = dayInput("day-solo", soloIntense);
    const otherDay = dayInput("day-other", other);
    expect(suggestPaceRelief([soloDay, otherDay])).toBeNull();
  });
});
