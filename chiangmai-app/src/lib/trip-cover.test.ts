import { describe, expect, it } from "vitest";
import { cleanCover, coverSlug, isTripCover, shownCover } from "./trip-cover";
import { getPlacePhoto } from "@/data/photo-manifest";
import { places } from "@/data/places";

const withPhoto = places.filter((place) => getPlacePhoto(place.slug)).map((place) => place.slug);
const withoutPhoto = places.filter((place) => !getPlacePhoto(place.slug)).map((place) => place.slug);

describe("coverSlug", () => {
  it("uses the chosen place while it has a photo", () => {
    expect(coverSlug({ kind: "place", slug: withPhoto[1] }, [withPhoto[0]])).toBe(withPhoto[1]);
  });

  it("falls back to the first place in the plan that has a photo", () => {
    expect(coverSlug(null, [withoutPhoto[0], withPhoto[2], withPhoto[0]])).toBe(withPhoto[2]);
    expect(coverSlug({ kind: "place", slug: "no-such-place" }, [withPhoto[3]])).toBe(withPhoto[3]);
  });

  it("is null when nothing in the plan has a photo", () => {
    expect(coverSlug(null, [])).toBeNull();
    expect(coverSlug(undefined, [withoutPhoto[0]])).toBeNull();
  });
});

const UPLOAD_ID = "AbCdEfGhIjKlMnOpQrSt_-";

describe("isTripCover", () => {
  it("accepts a place cover with a slug", () => {
    expect(isTripCover({ kind: "place", slug: "doi-inthanon" })).toBe(true);
    expect(isTripCover({ kind: "place" })).toBe(false);
    expect(isTripCover({ kind: "place", slug: "Doi Inthanon" })).toBe(false);
    expect(isTripCover(null)).toBe(false);
  });

  it("accepts an upload with a well-formed id and a position from 0 to 100", () => {
    expect(isTripCover({ kind: "upload", id: UPLOAD_ID, focusY: 0 })).toBe(true);
    expect(isTripCover({ kind: "upload", id: UPLOAD_ID, focusY: 100 })).toBe(true);
    expect(isTripCover({ kind: "upload", id: UPLOAD_ID, focusY: 101 })).toBe(false);
    expect(isTripCover({ kind: "upload", id: UPLOAD_ID, focusY: Number.NaN })).toBe(false);
    expect(isTripCover({ kind: "upload", id: UPLOAD_ID })).toBe(false);
  });

  it("refuses an upload id that is not one of ours, so it cannot point anywhere else", () => {
    expect(isTripCover({ kind: "upload", id: "../../etc/passwd", focusY: 50 })).toBe(false);
    expect(isTripCover({ kind: "upload", id: "507f1f77bcf86cd799439011", focusY: 50 })).toBe(false);
    expect(isTripCover({ kind: "upload", id: "https://example.com/a.jpg", focusY: 50 })).toBe(false);
  });

  it("knows no other kind", () => {
    expect(isTripCover({ kind: "url", url: "https://example.com/a.jpg" })).toBe(false);
  });
});

describe("cleanCover", () => {
  it("keeps only a cover's own fields and rounds the position", () => {
    const messy = { kind: "upload", id: UPLOAD_ID, focusY: 37.6, owner: "someone" } as never;
    expect(cleanCover(messy)).toEqual({ kind: "upload", id: UPLOAD_ID, focusY: 38 });
  });
});

describe("shownCover", () => {
  it("shows an upload as it is", () => {
    const upload = { kind: "upload" as const, id: UPLOAD_ID, focusY: 40 };
    expect(shownCover(upload, withoutPhoto.slice(0, 2))).toBe(upload);
  });

  it("shows the chosen or automatic place, or nothing", () => {
    expect(shownCover({ kind: "place", slug: withPhoto[1] }, [withPhoto[0]])).toEqual({
      kind: "place",
      slug: withPhoto[1],
    });
    expect(shownCover(null, [withoutPhoto[0], withPhoto[2]])).toEqual({ kind: "place", slug: withPhoto[2] });
    expect(shownCover(null, withoutPhoto.slice(0, 2))).toBeNull();
  });
});
