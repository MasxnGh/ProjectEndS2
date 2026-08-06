import { describe, expect, it } from "vitest";
import { sliceLineProgress, type LngLat } from "./polyline";

describe("sliceLineProgress", () => {
  const line: LngLat[] = [
    [98.99, 18.79],
    [99.0, 18.8],
    [99.01, 18.81],
  ];

  it("returns just the start point at t=0", () => {
    expect(sliceLineProgress(line, 0)).toEqual([line[0]]);
  });

  it("returns the full line at t=1 or beyond", () => {
    expect(sliceLineProgress(line, 1)).toEqual(line);
    expect(sliceLineProgress(line, 1.5)).toEqual(line);
  });

  it("returns the full line unchanged for fewer than 2 points", () => {
    expect(sliceLineProgress([line[0]], 0.5)).toEqual([line[0]]);
    expect(sliceLineProgress([], 0.5)).toEqual([]);
  });

  it("includes every fully-covered vertex plus one interpolated point partway through", () => {
    const result = sliceLineProgress(line, 0.5);
    expect(result[0]).toEqual(line[0]);
    expect(result.length).toBeGreaterThanOrEqual(2);
    const last = result[result.length - 1];
    expect(last[0]).toBeGreaterThan(line[0][0]);
    expect(last[0]).toBeLessThan(line[2][0]);
  });

  it("grows monotonically as t increases", () => {
    const a = sliceLineProgress(line, 0.2);
    const b = sliceLineProgress(line, 0.8);
    const lastA = a[a.length - 1];
    const lastB = b[b.length - 1];
    expect(lastB[0]).toBeGreaterThan(lastA[0]);
  });
});
