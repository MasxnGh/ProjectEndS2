import { describe, expect, it } from "vitest";
import { addDaysIso, isoDateDayOfWeek, daysBetweenIso } from "./date-utils";

describe("addDaysIso", () => {
  it("adds days within the same month", () => {
    expect(addDaysIso("2026-03-10", 3)).toBe("2026-03-13");
  });

  it("rolls over a month boundary", () => {
    expect(addDaysIso("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("rolls over a year boundary", () => {
    expect(addDaysIso("2026-12-30", 3)).toBe("2027-01-02");
  });

  it("handles a leap-year February correctly", () => {
    // 2028 is a leap year
    expect(addDaysIso("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDaysIso("2028-02-29", 1)).toBe("2028-03-01");
  });

  it("supports zero and negative offsets", () => {
    expect(addDaysIso("2026-03-10", 0)).toBe("2026-03-10");
    expect(addDaysIso("2026-03-10", -5)).toBe("2026-03-05");
  });
});

describe("isoDateDayOfWeek", () => {
  it("matches the known day of week for a fixed date", () => {
    // 2026-07-25 is a Saturday.
    expect(isoDateDayOfWeek("2026-07-25")).toBe(6);
    // 2026-07-26 is a Sunday.
    expect(isoDateDayOfWeek("2026-07-26")).toBe(0);
  });
});

describe("daysBetweenIso", () => {
  it("counts forward and backward spans", () => {
    expect(daysBetweenIso("2026-03-10", "2026-03-15")).toBe(5);
    expect(daysBetweenIso("2026-03-15", "2026-03-10")).toBe(-5);
    expect(daysBetweenIso("2026-03-10", "2026-03-10")).toBe(0);
  });
});
