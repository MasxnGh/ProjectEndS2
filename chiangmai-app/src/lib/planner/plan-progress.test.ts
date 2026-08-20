import { describe, expect, it } from "vitest";
import type { Place } from "@/data/types";
import { derivePlanProgress, type PlanProgressInput, type PlanStepId } from "./plan-progress";

function makePlace(overrides: Partial<Place> & Pick<Place, "slug">): Place {
  return {
    name: { en: overrides.slug, th: overrides.slug },
    category: "temple",
    district: "old-city",
    bestTime: ["anytime"],
    durationMinutes: 60,
    priceLevel: 1,
    rating: 4.5,
    shortDescription: { en: "", th: "" },
    description: { en: "", th: "" },
    localTip: { en: "", th: "" },
    openingHoursText: { en: "", th: "" },
    address: { en: "", th: "" },
    coordinates: { lat: 18.7873, lng: 98.9853 },
    elevation: null,
    tags: [],
    paletteSeed: 1,
    outdoor: false,
    openingHours: null,
    closedOnDays: [],
    seasonalClosure: null,
    bestTimeWindows: [],
    goldenHourType: null,
    exposure: "indoor",
    rainSensitivity: "none",
    dustSensitivity: "none",
    physicalIntensity: 1,
    dressCode: null,
    requiresBooking: false,
    dataLastVerified: null,
    ...overrides,
  };
}

function input(overrides: Partial<PlanProgressInput> = {}): PlanProgressInput {
  return {
    travelDate: "",
    days: [],
    unscheduledCount: 0,
    savedOrShared: false,
    ...overrides,
  };
}

function doneIds(result: ReturnType<typeof derivePlanProgress>): PlanStepId[] {
  return result.steps.filter((s) => s.done).map((s) => s.id);
}

describe("derivePlanProgress", () => {
  it("reports nothing done and step one current for an untouched plan", () => {
    const result = derivePlanProgress(input());
    expect(doneIds(result)).toEqual([]);
    expect(result.currentStepId).toBe("details");
    expect(result.completedCount).toBe(0);
  });

  it("ticks the details step once a travel date exists", () => {
    const result = derivePlanProgress(input({ travelDate: "2026-08-24" }));
    expect(doneIds(result)).toContain("details");
    expect(result.currentStepId).toBe("places");
  });

  it("counts a place in the unscheduled tray as having chosen places", () => {
    const result = derivePlanProgress(input({ unscheduledCount: 1 }));
    expect(doneIds(result)).toContain("places");
  });

  // Someone who browses Explore first and picks a date later is not doing it
  // wrong — each step reports its own truth rather than being gated.
  it("ticks a later step even when an earlier one is still open", () => {
    const result = derivePlanProgress(
      input({ days: [{ places: [makePlace({ slug: "a" })] }] })
    );
    expect(doneIds(result)).toContain("places");
    expect(doneIds(result)).not.toContain("details");
    expect(result.currentStepId).toBe("details");
  });

  describe("the arrange step", () => {
    it("stays open while a place is still in the tray", () => {
      const result = derivePlanProgress(
        input({
          travelDate: "2026-08-24",
          days: [{ places: [makePlace({ slug: "a" })] }],
          unscheduledCount: 2,
        })
      );
      const arrange = result.steps.find((s) => s.id === "arrange")!;
      expect(arrange.done).toBe(false);
      expect(arrange.remaining).toBe(2);
    });

    it("stays open while a day has nothing on it", () => {
      const result = derivePlanProgress(
        input({
          travelDate: "2026-08-24",
          days: [{ places: [makePlace({ slug: "a" })] }, { places: [] }],
        })
      );
      const arrange = result.steps.find((s) => s.id === "arrange")!;
      expect(arrange.done).toBe(false);
      expect(arrange.remaining).toBe(1);
    });

    it("stays open while a stop falls on a day it is closed", () => {
      // 2026-08-24 is a Monday.
      const result = derivePlanProgress(
        input({
          travelDate: "2026-08-24",
          days: [{ places: [makePlace({ slug: "shut-mon", closedOnDays: [1] })] }],
        })
      );
      const arrange = result.steps.find((s) => s.id === "arrange")!;
      expect(arrange.done).toBe(false);
      expect(arrange.remaining).toBeGreaterThan(0);
    });

    it("closes once every day has stops and nothing conflicts", () => {
      const result = derivePlanProgress(
        input({
          travelDate: "2026-08-24",
          days: [{ places: [makePlace({ slug: "a" })] }, { places: [makePlace({ slug: "b" })] }],
        })
      );
      const arrange = result.steps.find((s) => s.id === "arrange")!;
      expect(arrange.done).toBe(true);
      expect(arrange.remaining).toBeNull();
    });

    it("is never done for a plan with no places at all", () => {
      const result = derivePlanProgress(input({ travelDate: "2026-08-24" }));
      expect(result.steps.find((s) => s.id === "arrange")!.done).toBe(false);
    });

    // Without a date there is no weekday to check against, so closures simply
    // cannot be judged yet — that is step one's job to unblock.
    it("does not invent closure problems before a date is picked", () => {
      const result = derivePlanProgress(
        input({ days: [{ places: [makePlace({ slug: "shut-mon", closedOnDays: [1] })] }] })
      );
      expect(result.steps.find((s) => s.id === "arrange")!.done).toBe(true);
    });
  });

  it("has no current step once the whole plan is finished", () => {
    const result = derivePlanProgress(
      input({
        travelDate: "2026-08-24",
        days: [{ places: [makePlace({ slug: "a" })] }],
        savedOrShared: true,
      })
    );
    expect(result.currentStepId).toBeNull();
    expect(result.completedCount).toBe(4);
    expect(result.steps.every((s) => !s.current)).toBe(true);
  });

  it("marks exactly one step as current", () => {
    const result = derivePlanProgress(
      input({ travelDate: "2026-08-24", days: [{ places: [makePlace({ slug: "a" })] }] })
    );
    expect(result.steps.filter((s) => s.current)).toHaveLength(1);
    expect(result.currentStepId).toBe("share");
  });
});
