import { describe, expect, it } from "vitest";
import { safeCallbackPath } from "./safe-callback";

const FALLBACK = "/th/planner";

describe("safeCallbackPath", () => {
  it("keeps a path on this site, with its query and hash", () => {
    expect(safeCallbackPath("/th/my-trips", FALLBACK)).toBe("/th/my-trips");
    expect(safeCallbackPath("/th/planner?trip=abc#day-2", FALLBACK)).toBe("/th/planner?trip=abc#day-2");
  });

  it("falls back when there is no usable value", () => {
    expect(safeCallbackPath(undefined, FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath(["/th/my-trips", "/th/account"], FALLBACK)).toBe(FALLBACK);
  });

  it("refuses full URLs, including look-alikes of this site", () => {
    expect(safeCallbackPath("https://example.com/th", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("javascript:alert(1)", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("th/my-trips", FALLBACK)).toBe(FALLBACK);
  });

  it("refuses the forms browsers read as another site", () => {
    // Each of these starts with "/", which is all the old check asked for.
    expect(safeCallbackPath("//example.com", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("//example.com/th/my-trips", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("/\\example.com", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("/\t/example.com", FALLBACK)).toBe(FALLBACK);
    expect(safeCallbackPath("/\n/example.com", FALLBACK)).toBe(FALLBACK);
  });
});
