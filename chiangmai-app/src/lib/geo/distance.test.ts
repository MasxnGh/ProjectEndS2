import { describe, expect, it } from "vitest";
import { DETOUR_FACTORS, estimateRoadDistanceKm, haversineKm } from "./distance";

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 18.79, lng: 98.99 }, { lat: 18.79, lng: 98.99 })).toBe(0);
  });

  it("is symmetric", () => {
    const a = { lat: 18.7877, lng: 98.993 };
    const b = { lat: 18.8047, lng: 98.9217 };
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 10);
  });

  it("matches the analytic distance for one degree of latitude (~111.19km)", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 1, lng: 0 };
    // Pure north-south movement: distance = R * dLat(radians), independent of position.
    expect(haversineKm(a, b)).toBeCloseTo(111.195, 2);
  });

  it("matches one degree of latitude at the equator, since a sphere is locally symmetric there", () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 0, lng: 1 };
    const degreeOfLatitude = haversineKm({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(haversineKm(a, b)).toBeCloseTo(degreeOfLatitude, 6);
  });

  it("shrinks a degree of longitude away from the equator by cos(lat)", () => {
    const atEquator = haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 1 });
    const at60Lat = haversineKm({ lat: 60, lng: 0 }, { lat: 60, lng: 1 });
    expect(at60Lat).toBeCloseTo(atEquator * Math.cos((60 * Math.PI) / 180), 1);
  });
});

describe("estimateRoadDistanceKm", () => {
  const a = { lat: 18.7877, lng: 98.993 };
  const b = { lat: 18.8047, lng: 98.9217 };
  const straight = haversineKm(a, b);

  it("applies the urban detour factor by default", () => {
    expect(estimateRoadDistanceKm(a, b)).toBeCloseTo(straight * DETOUR_FACTORS.urban, 8);
  });

  it("applies a larger detour factor for mountain terrain than urban", () => {
    const urban = estimateRoadDistanceKm(a, b, "urban");
    const mountain = estimateRoadDistanceKm(a, b, "mountain");
    expect(mountain).toBeGreaterThan(urban);
    expect(mountain).toBeCloseTo(straight * DETOUR_FACTORS.mountain, 8);
  });

  it("never returns less than the straight-line distance", () => {
    for (const terrain of ["urban", "suburban", "mountain"] as const) {
      expect(estimateRoadDistanceKm(a, b, terrain)).toBeGreaterThanOrEqual(straight);
    }
  });
});
