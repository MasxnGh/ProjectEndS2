import { describe, expect, it } from "vitest";
import { calculateSunTimes } from "@/lib/planner/sun";

const CHIANGMAI = { lat: 18.7883, lng: 98.9853 };

describe("calculateSunTimes", () => {
  it("returns a plausible sunrise/sunset for Chiang Mai in January", () => {
    const result = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-01-15");
    expect(result).not.toBeNull();
    // Chiang Mai sunrise/sunset stays close to 06:00/18:00 year-round (low latitude) — generous bounds.
    expect(result!.sunriseMinutes).toBeGreaterThan(5 * 60);
    expect(result!.sunriseMinutes).toBeLessThan(7.5 * 60);
    expect(result!.sunsetMinutes).toBeGreaterThan(17 * 60);
    expect(result!.sunsetMinutes).toBeLessThan(19 * 60);
  });

  it("returns a plausible sunrise/sunset for Chiang Mai in June", () => {
    const result = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-06-21");
    expect(result).not.toBeNull();
    expect(result!.sunriseMinutes).toBeGreaterThan(5 * 60);
    expect(result!.sunriseMinutes).toBeLessThan(7 * 60);
    expect(result!.sunsetMinutes).toBeGreaterThan(17.5 * 60);
    expect(result!.sunsetMinutes).toBeLessThan(19.5 * 60);
  });

  it("gives a longer day length near the June solstice than near the December solstice (18.8°N is north of the equator)", () => {
    const june = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-06-21")!;
    const december = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-12-21")!;
    const juneDayLength = june.sunsetMinutes - june.sunriseMinutes;
    const decemberDayLength = december.sunsetMinutes - december.sunriseMinutes;
    expect(juneDayLength).toBeGreaterThan(decemberDayLength);
  });

  it("gives near-equal day/night length at the equinox", () => {
    const equinox = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-03-20")!;
    const dayLength = equinox.sunsetMinutes - equinox.sunriseMinutes;
    expect(dayLength).toBeGreaterThan(11.5 * 60);
    expect(dayLength).toBeLessThan(12.5 * 60);
  });

  it("is deterministic for the same inputs", () => {
    const a = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-09-01");
    const b = calculateSunTimes(CHIANGMAI.lat, CHIANGMAI.lng, "2026-09-01");
    expect(a).toEqual(b);
  });
});
