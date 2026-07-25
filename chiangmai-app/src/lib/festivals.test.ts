import { describe, expect, it } from "vitest";
import { getFestivalsOverlapping } from "./festivals";

describe("getFestivalsOverlapping", () => {
  it("finds Songkran for a trip spanning mid-April", () => {
    const matches = getFestivalsOverlapping("2026-04-12", "2026-04-16");
    expect(matches.some((m) => m.festival.id === "songkran" && m.occurrence.year === 2026)).toBe(true);
  });

  it("finds nothing for an ordinary week with no festival", () => {
    const matches = getFestivalsOverlapping("2026-08-10", "2026-08-14");
    expect(matches).toEqual([]);
  });

  it("finds a festival that starts before and ends after the trip window", () => {
    // Inthakin 2026 runs 2026-06-05..2026-06-11; a one-day trip in the middle should still match.
    const matches = getFestivalsOverlapping("2026-06-07", "2026-06-07");
    expect(matches.some((m) => m.festival.id === "inthakin")).toBe(true);
  });

  it("returns matches marked unverified for lunar festivals", () => {
    const matches = getFestivalsOverlapping("2026-11-20", "2026-11-28");
    const loyKrathong = matches.find((m) => m.festival.id === "loy-krathong");
    expect(loyKrathong?.occurrence.verified).toBe(false);
  });

  it("returns matches marked verified for the fixed Songkran dates", () => {
    const matches = getFestivalsOverlapping("2026-04-13", "2026-04-15");
    const songkran = matches.find((m) => m.festival.id === "songkran");
    expect(songkran?.occurrence.verified).toBe(true);
  });

  it("does not match a trip window entirely outside a festival's range", () => {
    const matches = getFestivalsOverlapping("2026-01-01", "2026-01-05");
    expect(matches).toEqual([]);
  });
});
