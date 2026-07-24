import { describe, expect, it } from "vitest";
import { estimateTravelMinutes } from "./travelTime";

describe("estimateTravelMinutes", () => {
  const a = { lat: 18.7877, lng: 98.993 };
  const b = { lat: 18.8047, lng: 98.9217 };

  it("floors very short hops at the minimum travel time", () => {
    expect(estimateTravelMinutes(a, a)).toBe(5);
  });

  it("returns a positive whole number of minutes", () => {
    const minutes = estimateTravelMinutes(a, b);
    expect(minutes).toBeGreaterThan(0);
    expect(Number.isInteger(minutes)).toBe(true);
  });

  it("estimates more travel time for mountain terrain than urban over the same hop", () => {
    const urban = estimateTravelMinutes(a, b, "urban");
    const mountain = estimateTravelMinutes(a, b, "mountain");
    expect(mountain).toBeGreaterThan(urban);
  });

  it("scales up with distance", () => {
    const near = estimateTravelMinutes(a, b);
    const far = estimateTravelMinutes(a, { lat: 19.5, lng: 99.5 });
    expect(far).toBeGreaterThan(near);
  });
});
