import { describe, expect, it } from "vitest";
import { parseTripWritablePayload } from "./types";

const validPayload = {
  title: "Chiang Mai weekend",
  startDate: "2026-08-10",
  baseLocation: { lat: 18.79, lng: 98.99, label: "Hotel" },
  days: [
    {
      date: "2026-08-10",
      stops: [{ placeSlug: "wat-phra-singh", plannedArrival: "09:00", userLocked: false }],
    },
  ],
  travelMode: "walk",
  travelers: 2,
  budgetThb: 5000,
  accommodationThb: 1200,
  packingItems: [{ id: "cash", checked: false }],
};

describe("parseTripWritablePayload", () => {
  it("accepts a well-formed payload and passes every field through unchanged", () => {
    const result = parseTripWritablePayload(validPayload);
    expect(result).toEqual(validPayload);
  });

  it("accepts null startDate and null baseLocation", () => {
    const result = parseTripWritablePayload({ ...validPayload, startDate: null, baseLocation: null });
    expect(result?.startDate).toBeNull();
    expect(result?.baseLocation).toBeNull();
  });

  it("rejects a non-object body", () => {
    expect(parseTripWritablePayload(null)).toBeNull();
    expect(parseTripWritablePayload("nope")).toBeNull();
    expect(parseTripWritablePayload(42)).toBeNull();
  });

  it("rejects an unknown travelMode instead of silently accepting it", () => {
    expect(parseTripWritablePayload({ ...validPayload, travelMode: "teleport" })).toBeNull();
  });

  it("rejects a malformed stop missing required fields", () => {
    const malformed = {
      ...validPayload,
      days: [{ date: null, stops: [{ placeSlug: "wat-phra-singh" }] }],
    };
    expect(parseTripWritablePayload(malformed)).toBeNull();
  });

  it("rejects negative travelers/budget instead of clamping silently server-side", () => {
    expect(parseTripWritablePayload({ ...validPayload, travelers: 0 })).toBeNull();
    expect(parseTripWritablePayload({ ...validPayload, budgetThb: -1 })).toBeNull();
  });

  it("rejects a packing item missing the checked flag", () => {
    expect(
      parseTripWritablePayload({ ...validPayload, packingItems: [{ id: "cash" }] })
    ).toBeNull();
  });
});
