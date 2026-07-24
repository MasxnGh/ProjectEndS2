import { describe, expect, it } from "vitest";
import { findNearby, findNearbyExcluding } from "./nearby";

interface TestPoint {
  id: string;
  lat: number;
  lng: number;
}

const center = { lat: 18.7877, lng: 98.993 }; // Tha Phae Gate

const points: TestPoint[] = [
  { id: "gate", lat: 18.7877, lng: 98.993 }, // ~0km
  { id: "close", lat: 18.795, lng: 98.995 }, // small offset, within a few km
  { id: "mid", lat: 18.85, lng: 98.95 }, // roughly ~9km
  { id: "far", lat: 19.5, lng: 99.5 }, // very far, >50km
];

describe("findNearby", () => {
  it("includes only items within the radius, nearest first", () => {
    const results = findNearby(center, points, 10, (p) => p);
    expect(results.map((r) => r.item.id)).toEqual(["gate", "close", "mid"]);
    expect(results.every((r) => r.distanceKm <= 10)).toBe(true);
  });

  it("sorts strictly by ascending distance", () => {
    const results = findNearby(center, points, 1000, (p) => p);
    for (let i = 1; i < results.length; i++) {
      expect(results[i].distanceKm).toBeGreaterThanOrEqual(results[i - 1].distanceKm);
    }
  });

  it("returns an empty array when nothing is within radius", () => {
    const farAway = points.filter((p) => p.id !== "gate");
    expect(findNearby(center, farAway, 0.001, (p) => p)).toHaveLength(0);
  });

  it("includes the center point itself with distance 0 if present", () => {
    const results = findNearby(center, points, 1, (p) => p);
    expect(results[0]).toMatchObject({ item: { id: "gate" }, distanceKm: 0 });
  });
});

describe("findNearbyExcluding", () => {
  it("drops items matched by the exclusion predicate", () => {
    const results = findNearbyExcluding(center, points, 10, (p) => p, (p) => p.id === "gate");
    expect(results.map((r) => r.item.id)).toEqual(["close", "mid"]);
  });
});
