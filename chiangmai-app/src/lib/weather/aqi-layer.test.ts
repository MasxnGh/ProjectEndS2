import { describe, expect, it } from "vitest";
import { groupPointsForAqiLayer, pm25ToMarkerRadiusPx } from "./aqi-layer";

describe("groupPointsForAqiLayer", () => {
  it("keeps distinct coordinates as separate groups", () => {
    const groups = groupPointsForAqiLayer([
      { key: "a", coordinates: { lat: 18.79, lng: 98.99 } },
      { key: "b", coordinates: { lat: 18.8, lng: 99.0 } },
    ]);
    expect(groups).toHaveLength(2);
  });

  it("merges points that round to the same coordinate", () => {
    const groups = groupPointsForAqiLayer([
      { key: "a", coordinates: { lat: 18.79041, lng: 98.98471 } },
      { key: "b", coordinates: { lat: 18.79043, lng: 98.98473 } },
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0].members).toEqual(["a", "b"]);
  });

  it("caps the number of groups returned", () => {
    const points = Array.from({ length: 100 }, (_, i) => ({
      key: `p${i}`,
      coordinates: { lat: 18 + i, lng: 99 },
    }));
    const groups = groupPointsForAqiLayer(points, { maxGroups: 10 });
    expect(groups).toHaveLength(10);
  });
});

describe("pm25ToMarkerRadiusPx", () => {
  it("returns the minimum radius for zero pollution", () => {
    expect(pm25ToMarkerRadiusPx(0)).toBe(5);
  });

  it("returns the maximum radius at or above the clamp ceiling", () => {
    expect(pm25ToMarkerRadiusPx(150)).toBe(12);
    expect(pm25ToMarkerRadiusPx(500)).toBe(12);
  });

  it("scales monotonically between the bounds", () => {
    expect(pm25ToMarkerRadiusPx(75)).toBeCloseTo(8.5, 5);
  });
});
