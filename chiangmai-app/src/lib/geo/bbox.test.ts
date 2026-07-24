import { describe, expect, it } from "vitest";
import { boundingBoxCenter, boundingBoxToLngLatBounds, computeBoundingBox } from "./bbox";

describe("computeBoundingBox", () => {
  it("returns null for an empty list", () => {
    expect(computeBoundingBox([])).toBeNull();
  });

  it("collapses to a single point for one input", () => {
    const box = computeBoundingBox([{ lat: 18.79, lng: 98.99 }]);
    expect(box).toEqual({ minLat: 18.79, maxLat: 18.79, minLng: 98.99, maxLng: 98.99 });
  });

  it("covers every point in a multi-point set", () => {
    const points = [
      { lat: 18.79, lng: 98.99 },
      { lat: 18.8, lng: 98.92 },
      { lat: 18.56, lng: 98.99 },
      { lat: 18.79, lng: 99.1 },
    ];
    expect(computeBoundingBox(points)).toEqual({
      minLat: 18.56,
      maxLat: 18.8,
      minLng: 98.92,
      maxLng: 99.1,
    });
  });
});

describe("boundingBoxToLngLatBounds", () => {
  it("converts to [[west, south], [east, north]]", () => {
    const box = { minLat: 18.5, maxLat: 18.9, minLng: 98.9, maxLng: 99.1 };
    expect(boundingBoxToLngLatBounds(box)).toEqual([
      [98.9, 18.5],
      [99.1, 18.9],
    ]);
  });
});

describe("boundingBoxCenter", () => {
  it("is the midpoint of min/max", () => {
    const box = { minLat: 18.0, maxLat: 19.0, minLng: 98.0, maxLng: 99.0 };
    expect(boundingBoxCenter(box)).toEqual({ lat: 18.5, lng: 98.5 });
  });
});
