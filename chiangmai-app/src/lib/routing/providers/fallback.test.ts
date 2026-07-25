import { describe, expect, it } from "vitest";
import { fallbackRoutingProvider } from "./fallback";
import { haversineKm } from "@/lib/geo/distance";

const OLD_CITY = { lat: 18.7904, lng: 98.9847 };
const DOI_SUTHEP = { lat: 18.8047, lng: 98.9217, elevation: 1073 };

describe("fallbackRoutingProvider.getDirections", () => {
  it("always marks results as an estimate with no real geometry", async () => {
    const result = await fallbackRoutingProvider.getDirections(OLD_CITY, DOI_SUTHEP, "driving");
    expect(result.isEstimate).toBe(true);
    expect(result.geometry).toBeNull();
    expect(result.distanceKm).toBeGreaterThan(0);
    expect(result.durationMinutes).toBeGreaterThan(0);
  });

  it("applies a larger detour factor when either endpoint has elevation", async () => {
    const flat = await fallbackRoutingProvider.getDirections(OLD_CITY, { lat: 18.81, lng: 98.99 }, "driving");
    const uphill = await fallbackRoutingProvider.getDirections(OLD_CITY, DOI_SUTHEP, "driving");
    const flatStraightKm = haversineKm(OLD_CITY, { lat: 18.81, lng: 98.99 });
    const uphillStraightKm = haversineKm(OLD_CITY, DOI_SUTHEP);
    // Comparing detour-factor-to-straight-line ratios (rather than raw
    // distances) isolates the detour factor itself from the two pairs'
    // differing straight-line spans.
    expect(uphill.distanceKm / uphillStraightKm).toBeGreaterThan(flat.distanceKm / flatStraightKm);
  });
});

describe("fallbackRoutingProvider.getMatrix", () => {
  it("returns a symmetric zero-diagonal matrix for N points", async () => {
    const points = [OLD_CITY, DOI_SUTHEP, { lat: 18.79, lng: 99.0 }];
    const result = await fallbackRoutingProvider.getMatrix(points, "driving");
    expect(result.isEstimate).toBe(true);
    for (let i = 0; i < points.length; i++) {
      expect(result.durations[i][i]).toBe(0);
      expect(result.distances[i][i]).toBe(0);
    }
    expect(result.durations[0][1]).toBe(result.durations[1][0]);
    expect(result.distances[0][1]).toBe(result.distances[1][0]);
    expect(result.durations[0][1]).toBeGreaterThan(0);
  });
});

describe("fallbackRoutingProvider.getIsochrone", () => {
  it("returns one polygon feature per requested minute budget", async () => {
    const result = await fallbackRoutingProvider.getIsochrone(OLD_CITY, [10, 20, 30], "walking");
    expect(result.isEstimate).toBe(true);
    expect(result.geojson.features).toHaveLength(3);
    expect(result.geojson.features.map((f) => f.properties.minutes)).toEqual([10, 20, 30]);
  });

  it("produces a larger polygon for a longer time budget", async () => {
    const result = await fallbackRoutingProvider.getIsochrone(OLD_CITY, [5, 30], "driving");
    const [small, big] = result.geojson.features;
    const ring = (f: (typeof result.geojson.features)[number]) =>
      (f.geometry.coordinates as number[][][])[0];
    // A bigger radius circle has a wider spread of longitude across its ring.
    const spread = (r: number[][]) => Math.max(...r.map((c) => c[0])) - Math.min(...r.map((c) => c[0]));
    expect(spread(ring(big))).toBeGreaterThan(spread(ring(small)));
  });
});
