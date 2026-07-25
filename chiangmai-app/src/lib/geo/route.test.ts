import { describe, expect, it } from "vitest";
import { haversineKm, type LatLng } from "./distance";
import { optimizeRoute } from "./route";

function permutations<T>(items: T[]): T[][] {
  if (items.length <= 1) return [items];
  const result: T[][] = [];
  items.forEach((item, i) => {
    const rest = [...items.slice(0, i), ...items.slice(i + 1)];
    for (const perm of permutations(rest)) {
      result.push([item, ...perm]);
    }
  });
  return result;
}

function bruteForceOptimalLength(points: LatLng[], startIndex: number): number {
  const start = points[startIndex];
  const others = points.filter((_, i) => i !== startIndex);
  let best = Infinity;
  for (const perm of permutations(others)) {
    const path = [start, ...perm];
    let total = 0;
    for (let i = 0; i < path.length - 1; i++) total += haversineKm(path[i], path[i + 1]);
    if (total < best) best = total;
  }
  return best;
}

describe("optimizeRoute", () => {
  it("returns an empty result for no points", () => {
    expect(optimizeRoute<LatLng>([], (p) => p)).toEqual({ items: [], order: [], totalDistanceKm: 0 });
  });

  it("returns the single point with zero distance", () => {
    const point = { lat: 18.79, lng: 98.99 };
    const result = optimizeRoute([point], (p) => p);
    expect(result).toEqual({ items: [point], order: [0], totalDistanceKm: 0 });
  });

  it("orders two points directly with the straight-line distance", () => {
    const a = { lat: 18.79, lng: 98.99 };
    const b = { lat: 18.85, lng: 98.95 };
    const result = optimizeRoute([a, b], (p) => p);
    expect(result.order).toEqual([0, 1]);
    expect(result.totalDistanceKm).toBeCloseTo(haversineKm(a, b), 10);
  });

  it("finds the true shortest open-path tour for a small rectangle (verified by brute force)", () => {
    // A rectangle of corners; the naive nearest-neighbour-only tour from A can
    // pick a crossing path, which 2-opt should straighten out.
    const points: LatLng[] = [
      { lat: 0, lng: 0 }, // A (start)
      { lat: 0, lng: 2 }, // B
      { lat: 1, lng: 0 }, // C
      { lat: 1, lng: 2 }, // D
    ];

    const result = optimizeRoute(points, (p) => p, 0);
    const optimalLength = bruteForceOptimalLength(points, 0);

    expect(result.order[0]).toBe(0); // start point stays fixed
    expect(result.totalDistanceKm).toBeCloseTo(optimalLength, 6);
  });

  it("never returns a tour longer than the input order for a larger random-ish set", () => {
    const points: LatLng[] = [
      { lat: 18.7877, lng: 98.993 },
      { lat: 18.8047, lng: 98.9217 },
      { lat: 18.5626, lng: 98.9856 },
      { lat: 18.9024, lng: 98.9214 },
      { lat: 18.7953, lng: 99.0033 },
      { lat: 18.7061, lng: 98.9756 },
    ];

    let naiveTotal = 0;
    for (let i = 0; i < points.length - 1; i++) naiveTotal += haversineKm(points[i], points[i + 1]);

    const result = optimizeRoute(points, (p) => p, 0);
    expect(result.totalDistanceKm).toBeLessThanOrEqual(naiveTotal);
  });

  it("preserves the caller's item objects, not just coordinates", () => {
    const items = [
      { name: "A", coords: { lat: 0, lng: 0 } },
      { name: "B", coords: { lat: 0, lng: 1 } },
      { name: "C", coords: { lat: 1, lng: 1 } },
    ];
    const result = optimizeRoute(items, (item) => item.coords, 0);
    expect(result.items[0]).toBe(items[0]);
    expect(result.items).toHaveLength(3);
  });

  it("optimizes against an external matrix instead of Haversine distance when one is supplied", () => {
    const points: LatLng[] = [
      { lat: 0, lng: 0 }, // A (start)
      { lat: 0, lng: 2 }, // B
      { lat: 1, lng: 0 }, // C
    ];
    // A real travel-time matrix could disagree wildly with straight-line
    // distance (e.g. B is Haversine-closer to A, but a real road makes C
    // faster to reach first) — the optimizer should follow the matrix, not
    // recompute Haversine internally.
    const timeMatrix = [
      [0, 100, 5], // from A: B is "far" (100), C is "close" (5)
      [100, 0, 50],
      [5, 50, 0],
    ];
    const result = optimizeRoute(points, (p) => p, 0, timeMatrix);
    expect(result.order).toEqual([0, 2, 1]);
    expect(result.totalDistanceKm).toBe(5 + 50);
  });
});
