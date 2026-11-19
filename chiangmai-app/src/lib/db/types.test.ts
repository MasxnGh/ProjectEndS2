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

describe("parseTripWritablePayload: cover", () => {
  it("leaves the cover out when the client sent none, so an older client cannot wipe it", () => {
    const result = parseTripWritablePayload(validPayload);
    expect(result).not.toHaveProperty("cover");
  });

  it("passes a place cover and a cleared cover (null) through", () => {
    const cover = { kind: "place", slug: "doi-inthanon" };
    expect(parseTripWritablePayload({ ...validPayload, cover })?.cover).toEqual(cover);
    const cleared = parseTripWritablePayload({ ...validPayload, cover: null });
    expect(cleared).toHaveProperty("cover", null);
  });

  it("stores only the fields a cover has", () => {
    const result = parseTripWritablePayload({
      ...validPayload,
      cover: { kind: "place", slug: "doi-inthanon", note: "<script>" },
    });
    expect(result?.cover).toEqual({ kind: "place", slug: "doi-inthanon" });
  });

  it("rejects a malformed cover", () => {
    expect(parseTripWritablePayload({ ...validPayload, cover: "doi-inthanon" })).toBeNull();
    expect(parseTripWritablePayload({ ...validPayload, cover: { kind: "upload", slug: "x" } })).toBeNull();
    expect(parseTripWritablePayload({ ...validPayload, cover: { kind: "place", slug: "../etc" } })).toBeNull();
    expect(
      parseTripWritablePayload({ ...validPayload, cover: { kind: "upload", id: "AbCdEfGhIjKlMnOpQrSt_-", focusY: -1 } }),
    ).toBeNull();
  });

  it("passes an uploaded cover through, its position rounded", () => {
    const result = parseTripWritablePayload({
      ...validPayload,
      cover: { kind: "upload", id: "AbCdEfGhIjKlMnOpQrSt_-", focusY: 62.4, ownerId: "someone-else" },
    });
    expect(result?.cover).toEqual({ kind: "upload", id: "AbCdEfGhIjKlMnOpQrSt_-", focusY: 62 });
  });
});
