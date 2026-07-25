import { describe, expect, it } from "vitest";
import { transitionBucket } from "./narrative";

describe("transitionBucket", () => {
  it("treats 5 minutes or less as adjacent", () => {
    expect(transitionBucket(0)).toBe("adjacent");
    expect(transitionBucket(5)).toBe("adjacent");
  });

  it("treats 6 to 15 minutes as short", () => {
    expect(transitionBucket(6)).toBe("short");
    expect(transitionBucket(15)).toBe("short");
  });

  it("treats 16 to 40 minutes as medium", () => {
    expect(transitionBucket(16)).toBe("medium");
    expect(transitionBucket(40)).toBe("medium");
  });

  it("treats anything over 40 minutes as long", () => {
    expect(transitionBucket(41)).toBe("long");
    expect(transitionBucket(180)).toBe("long");
  });
});
