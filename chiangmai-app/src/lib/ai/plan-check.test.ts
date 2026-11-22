import { describe, expect, it } from "vitest";
import { minutesToClock } from "@/lib/opening-hours";
import { checkPlanDays, planDays } from "./plan-check";

// A fixed "today" so sun times, and so sunrise- and sunset-anchored days, do not move with the calendar.
const TODAY = "2026-12-04";
const times = (days: string[][], date: string | null = null) =>
  planDays(days, date, TODAY).map((day) =>
    day.timeline.stops.map((s) => `${s.place.slug} ${minutesToClock(s.arrivalMinutes)}–${minutesToClock(s.departureMinutes)}`)
  );

describe("planDays", () => {
  it("times a day around a stop's best window, as the planner page does", () => {
    // Huen Phen's dining room opens at 17:00, its best window; the temple before it is counted back from there.
    expect(times([["wat-phra-singh", "huen-phen"]])).toEqual([["wat-phra-singh 15:55–16:55", "huen-phen 17:00–18:30"]]);
  });

  it("starts a day with no best-time stop at 09:00", () => {
    const [day] = planDays([["wat-chedi-luang", "wat-phra-singh"]], null, TODAY);
    expect(day.timeline.hasAnchor).toBe(false);
    expect(minutesToClock(day.timeline.stops[0].arrivalMinutes)).toBe("09:00");
  });

  it("gives each day its date from the trip's first day", () => {
    expect(planDays([["wat-umong"], ["wat-suan-dok"]], "2026-12-06", TODAY).map((d) => d.isoDate)).toEqual(["2026-12-06", "2026-12-07"]);
    expect(planDays([["wat-umong"]], null, TODAY)[0].isoDate).toBeNull();
  });
});

describe("checkPlanDays", () => {
  it("finds a place on a weekday it is closed, only when the trip has dates", () => {
    // The National Museum is closed on Mondays; 2026-12-07 is a Monday.
    expect(checkPlanDays(planDays([["chiang-mai-national-museum"]], "2026-12-07", TODAY))).toEqual([
      { type: "closedOnDay", day: 1, slug: "chiang-mai-national-museum", isoDate: "2026-12-07" },
    ]);
    expect(checkPlanDays(planDays([["chiang-mai-national-museum"]], null, TODAY))).toEqual([]);
  });

  it("finds a stop the page times outside its hours, with the page's times", () => {
    // After a 17:00 dinner the museum (09:00–16:00) is long shut.
    expect(checkPlanDays(planDays([["wat-umong"], ["huen-phen", "chiang-mai-national-museum"]], null, TODAY))).toEqual([
      { type: "outsideHours", day: 2, slug: "chiang-mai-national-museum", arrival: "18:41", departure: "20:11" },
    ]);
  });

  it("passes a stop open late enough to be counted back from dinner", () => {
    expect(checkPlanDays(planDays([["wat-chedi-luang", "huen-phen"]], null, TODAY))).toEqual([]);
  });

  it("offers the page's move-to-the-start when a dawn stop sits mid-day", () => {
    // Wat Chiang Man is best at dawn, so the museum before it is counted back to 04:33.
    const issues = checkPlanDays(planDays([["chiang-mai-national-museum", "wat-chiang-man"]], null, TODAY));
    expect(issues.find((issue) => issue.type === "anchorFirst")).toEqual({ type: "anchorFirst", day: 1, slug: "wat-chiang-man", startsAt: "04:33" });
  });

  it("flags a day over the planner's ten hours", () => {
    const far = ["doi-inthanon", "wat-phra-that-doi-suthep", "mae-kampong", "bo-sang-umbrella-village", "wat-chedi-luang", "huen-phen"];
    const issues = checkPlanDays(planDays([far], null, TODAY));
    expect(issues.some((issue) => issue.type === "longDay")).toBe(true);
  });
});
