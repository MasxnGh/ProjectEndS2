import { describe, expect, it } from "vitest";
import {
  clockToMinutes,
  minutesToClock,
  isOpenOnDay,
  isOutsideHours,
  toJsonLdOpeningHoursSpecification,
} from "./opening-hours";

describe("clockToMinutes / minutesToClock", () => {
  it("round-trips a normal clock time", () => {
    expect(clockToMinutes("09:30")).toBe(570);
    expect(minutesToClock(570)).toBe("09:30");
  });

  it("wraps minutes past midnight", () => {
    expect(minutesToClock(24 * 60 + 15)).toBe("00:15");
  });
});

describe("isOpenOnDay", () => {
  it("is open when the day isn't in closedOnDays", () => {
    expect(isOpenOnDay([], 3)).toBe(true);
    expect(isOpenOnDay([1, 2, 3, 4, 5, 6], 0)).toBe(true);
  });

  it("is closed when the day is listed", () => {
    expect(isOpenOnDay([2], 2)).toBe(false);
  });
});

describe("isOutsideHours", () => {
  it("never flags when hours are unknown", () => {
    expect(isOutsideHours(null, 0, 10000)).toBe(false);
  });

  it("flags a visit before opening or after closing", () => {
    const hours = { opens: "09:00", closes: "17:00" };
    expect(isOutsideHours(hours, clockToMinutes("08:00"), clockToMinutes("08:30"))).toBe(true);
    expect(isOutsideHours(hours, clockToMinutes("16:00"), clockToMinutes("18:00"))).toBe(true);
  });

  it("does not flag a visit fully within hours", () => {
    const hours = { opens: "09:00", closes: "17:00" };
    expect(isOutsideHours(hours, clockToMinutes("10:00"), clockToMinutes("11:00"))).toBe(false);
  });

  it("does not flag a 24-hour place (closes <= opens)", () => {
    const hours = { opens: "00:00", closes: "24:00" };
    expect(isOutsideHours(hours, clockToMinutes("23:00"), clockToMinutes("23:30"))).toBe(false);
  });
});

describe("toJsonLdOpeningHoursSpecification", () => {
  it("returns null when hours are unknown", () => {
    expect(toJsonLdOpeningHoursSpecification(null, [])).toBeNull();
  });

  it("lists only the open days", () => {
    const spec = toJsonLdOpeningHoursSpecification({ opens: "16:00", closes: "24:00" }, [1, 2, 3, 4, 5, 6]);
    expect(spec).toMatchObject({ dayOfWeek: ["Sunday"], opens: "16:00", closes: "23:59" });
  });

  it("lists all seven days when nothing is closed", () => {
    const spec = toJsonLdOpeningHoursSpecification({ opens: "06:00", closes: "18:00" }, []);
    expect(spec?.dayOfWeek).toHaveLength(7);
  });
});
