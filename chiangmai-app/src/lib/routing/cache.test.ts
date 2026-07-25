import { describe, expect, it } from "vitest";
import { TtlCache, directionsCacheKey, matrixCacheKey, isochroneCacheKey } from "./cache";

describe("TtlCache", () => {
  it("returns a stored value before it expires", () => {
    let now = 1000;
    const cache = new TtlCache<string>(500, () => now);
    cache.set("a", "hello");
    now += 100;
    expect(cache.get("a")).toBe("hello");
  });

  it("expires a value after its TTL passes", () => {
    let now = 1000;
    const cache = new TtlCache<string>(500, () => now);
    cache.set("a", "hello");
    now += 600;
    expect(cache.get("a")).toBeUndefined();
  });

  it("returns undefined for a missing key", () => {
    const cache = new TtlCache<string>(500);
    expect(cache.get("missing")).toBeUndefined();
  });
});

describe("directionsCacheKey", () => {
  it("is stable for the same inputs", () => {
    const from = { lat: 18.7904, lng: 98.9847 };
    const to = { lat: 18.8047, lng: 98.9217 };
    expect(directionsCacheKey(from, to, "driving")).toBe(directionsCacheKey(from, to, "driving"));
  });

  it("differs by mode and by direction", () => {
    const from = { lat: 18.7904, lng: 98.9847 };
    const to = { lat: 18.8047, lng: 98.9217 };
    expect(directionsCacheKey(from, to, "driving")).not.toBe(directionsCacheKey(from, to, "walking"));
    expect(directionsCacheKey(from, to, "driving")).not.toBe(directionsCacheKey(to, from, "driving"));
  });

  it("groups near-identical coordinates onto the same key", () => {
    const a = { lat: 18.79041234, lng: 98.98471234 };
    const b = { lat: 18.79041111, lng: 98.98471111 };
    const dest = { lat: 18.8047, lng: 98.9217 };
    expect(directionsCacheKey(a, dest, "driving")).toBe(directionsCacheKey(b, dest, "driving"));
  });
});

describe("matrixCacheKey", () => {
  it("is stable regardless of insertion order in memory (same array order in, same key out)", () => {
    const points = [
      { lat: 18.79, lng: 98.98 },
      { lat: 18.80, lng: 98.92 },
    ];
    expect(matrixCacheKey(points, "driving")).toBe(matrixCacheKey(points, "driving"));
  });

  it("differs when the point order differs", () => {
    const a = { lat: 18.79, lng: 98.98 };
    const b = { lat: 18.80, lng: 98.92 };
    expect(matrixCacheKey([a, b], "driving")).not.toBe(matrixCacheKey([b, a], "driving"));
  });
});

describe("isochroneCacheKey", () => {
  it("is stable regardless of minutesList order", () => {
    const point = { lat: 18.79, lng: 98.98 };
    expect(isochroneCacheKey(point, [10, 20, 30], "walking")).toBe(
      isochroneCacheKey(point, [30, 10, 20], "walking")
    );
  });
});
