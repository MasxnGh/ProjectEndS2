import { describe, expect, it } from "vitest";
import { getPlaceBySlug } from "@/data/places";
import { buildDayTimeline, type SunTimes } from "./golden-hour";
import { suggestAnchorFirst } from "./anchor-first";

// The day reported on 2026-11-19: today's sun with no trip date chosen.
const SUN: SunTimes = { sunriseMinutes: 6 * 60 + 33, sunsetMinutes: 17 * 60 + 46, isEstimate: true };
const placesOf = (...slugs: string[]) => slugs.map((s) => getPlaceBySlug(s)!);

function suggest(slugs: string[], lockedArrivals: Record<string, string> = {}) {
  const order = placesOf(...slugs);
  const timeline = buildDayTimeline({ order, sun: SUN, baseLocation: null, lockedArrivals });
  return { timeline, suggestion: suggestAnchorFirst({ order, timeline, sun: SUN, baseLocation: null, lockedArrivals }) };
}

describe("suggestAnchorFirst", () => {
  it("moves the sunrise-window stop first when the stops before it would be reached while shut", () => {
    const { timeline, suggestion } = suggest(["wat-umong", "wat-phra-that-doi-suthep", "wat-pha-lat"]);
    // The case as reported: counted back from Wat Pha Lat's window to 03:17.
    expect(timeline.stops[0].arrivalMinutes).toBe(3 * 60 + 17);
    expect(suggestion).toEqual({
      placeSlug: "wat-pha-lat",
      order: ["wat-pha-lat", "wat-umong", "wat-phra-that-doi-suthep"],
      currentStartMinutes: 3 * 60 + 17,
      closedAfter: 0,
    });
  });

  it("offers nothing when the window stop is already first", () => {
    expect(suggest(["wat-pha-lat", "wat-phra-that-doi-suthep", "wat-umong"]).suggestion).toBeNull();
  });

  it("offers nothing when every stop is open on arrival", () => {
    expect(suggest(["wat-phra-that-doi-suthep", "wat-umong"]).suggestion).toBeNull();
  });

  it("leaves a time the user locked alone", () => {
    const { suggestion } = suggest(["wat-umong", "wat-phra-that-doi-suthep", "wat-pha-lat"], { "wat-pha-lat": "07:03" });
    expect(suggestion).toBeNull();
  });
});
