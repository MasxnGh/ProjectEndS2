import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { googleMapsDirectionsUrl, googleMapsPlaceUrl, MAX_WAYPOINTS } from "./google-maps";

function stop(n: number): Place {
  return {
    slug: `stop-${n}`,
    name: { en: `Stop ${n}`, th: `จุด ${n}` },
    coordinates: { lat: 18.78 + n / 1000, lng: 98.99 + n / 1000 },
  } as unknown as Place;
}

const stops = (count: number) => Array.from({ length: count }, (_, i) => stop(i + 1));

describe("googleMapsDirectionsUrl", () => {
  it("routes from the first stop to the last, through the rest in order", () => {
    const { url, included, omitted } = googleMapsDirectionsUrl(stops(4));
    const params = new URL(url).searchParams;
    expect(params.get("origin")).toBe("18.781,98.991");
    expect(params.get("destination")).toBe("18.784,98.994");
    expect(params.get("waypoints")).toBe("18.782,98.992|18.783,98.993");
    expect(included).toBe(4);
    expect(omitted).toBe(0);
  });

  it("has nothing to route with fewer than two stops", () => {
    expect(googleMapsDirectionsUrl([]).url).toBe("");
    expect(googleMapsDirectionsUrl(stops(1)).url).toBe("");
  });

  it("never exceeds the nine waypoints the Maps URL API accepts", () => {
    // 20 stops is 18 in the middle. Joining them all produces a link that
    // opens, looks right, and quietly drops stops — the worst way for a
    // navigation link to fail.
    const { url, included, omitted } = googleMapsDirectionsUrl(stops(20));
    const waypoints = new URL(url).searchParams.get("waypoints")!.split("|");
    expect(waypoints).toHaveLength(MAX_WAYPOINTS);
    expect(included).toBe(MAX_WAYPOINTS + 2);
    expect(omitted).toBe(9);
  });

  it("keeps the ends of a long day, so the route still starts and finishes right", () => {
    const url = googleMapsDirectionsUrl(stops(20)).url;
    const params = new URL(url).searchParams;
    expect(params.get("origin")).toBe("18.781,98.991");
    expect(params.get("destination")).toBe("18.8,99.01");
  });

  it("keeps the surviving waypoints in the day's own order", () => {
    const url = googleMapsDirectionsUrl(stops(20)).url;
    const lats = new URL(url)
      .searchParams.get("waypoints")!
      .split("|")
      .map((pair) => Number(pair.split(",")[0]));
    expect([...lats]).toEqual([...lats].sort((a, b) => a - b));
  });

  it("carries the travel mode through", () => {
    const url = googleMapsDirectionsUrl(stops(3), "walking").url;
    expect(new URL(url).searchParams.get("travelmode")).toBe("walking");
  });
});

describe("googleMapsPlaceUrl", () => {
  it("opens the catalogue's own pin rather than a name search", () => {
    // A name search resolves to whatever Google decides it means; the plan was
    // built on these coordinates, so these are what should open.
    expect(googleMapsPlaceUrl(stop(1))).toBe(
      "https://www.google.com/maps/search/?api=1&query=18.781,98.991"
    );
  });
});
