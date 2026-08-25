import { describe, expect, it } from "vitest";
import photoManifest from "./photo-manifest";
import { allPhotoCredits, getPhotoCredit } from "./photo-credits";

const placeSlugs = Object.entries(photoManifest)
  .filter(([, path]) => path.startsWith("/images/places/"))
  .map(([slug]) => slug);

/**
 * The site's promise about photography is that every published photo can be
 * traced to a source that shows it really is the place it is captioned with,
 * and for the CC BY-SA ones that promise is also a licence condition. Both
 * halves drift silently: a photo added by hand renders with no credit, and a
 * photo deleted leaves a credit claiming something we no longer publish.
 */
describe("photo credits", () => {
  it("credits every published place photo", () => {
    const uncredited = placeSlugs.filter((slug) => !getPhotoCredit(slug));
    expect(uncredited).toEqual([]);
  });

  it("does not credit a photo that is no longer published", () => {
    const orphaned = allPhotoCredits()
      .map((c) => c.slug)
      .filter((slug) => !placeSlugs.includes(slug));
    expect(orphaned).toEqual([]);
  });

  it("names a photographer and a licence for each one", () => {
    for (const credit of allPhotoCredits()) {
      expect(credit.artist, credit.slug).not.toBe("");
      // "unknown" was what Commons returned for a file with no Artist field.
      // The fetcher now falls back to the uploader, so this should not recur.
      expect(credit.artist, credit.slug).not.toBe("unknown");
      expect(credit.licence, credit.slug).not.toBe("");
      expect(credit.sourceUrl, credit.slug).toMatch(/^https:\/\//);
    }
  });
});
