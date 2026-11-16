import { describe, expect, it } from "vitest";
import { parentPath } from "./back-target";

describe("parentPath", () => {
  it("sends a place back to Explore", () => {
    expect(parentPath("/th/place/wat-phra-that-doi-suthep", "th")).toBe("/th/explore");
    expect(parentPath("/en/place/wat-phra-that-doi-suthep/", "en")).toBe("/en/explore");
  });

  it("sends a guide back to the guides list", () => {
    expect(parentPath("/th/guides/old-city", "th")).toBe("/th/guides");
  });

  it("sends a top-level page back home", () => {
    for (const page of ["explore", "guides", "planner", "about", "login", "my-trips", "account"]) {
      expect(parentPath(`/en/${page}`, "en")).toBe("/en");
    }
  });

  it("sends a shared trip and unknown paths home", () => {
    expect(parentPath("/th/trip/abc123", "th")).toBe("/th");
    expect(parentPath("/th/place", "th")).toBe("/th");
    expect(parentPath("/th/no/such/page", "th")).toBe("/th");
  });

  it("stays in the given locale", () => {
    expect(parentPath("/th", "th")).toBe("/th");
    expect(parentPath("/thai/place/x", "th")).toBe("/th");
  });
});
