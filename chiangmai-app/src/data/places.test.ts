import { describe, expect, it } from "vitest";
import { places } from "./places";
import { guides } from "./guides";
import type { LocalizedText, Place } from "./types";

// The place catalogue is hand-written prose, ~100 records deep, and a typo in a
// coordinate or a missing Thai string fails silently at runtime — a swapped
// lat/lng just drops a pin in the wrong province and a blank `th` renders an
// empty label. These are the invariants that catch that at build time.

/** Chiang Mai province, generously bounded. */
const PROVINCE_BOUNDS = { minLat: 17.4, maxLat: 20.3, minLng: 97.8, maxLng: 99.7 };
const HHMM = /^([01]\d|2[0-4]):[0-5]\d$/;
const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function minutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function localizedTexts(place: Place): [string, LocalizedText][] {
  const entries: [string, LocalizedText][] = [
    ["name", place.name],
    ["shortDescription", place.shortDescription],
    ["description", place.description],
    ["localTip", place.localTip],
    ["openingHoursText", place.openingHoursText],
    ["address", place.address],
  ];
  for (const [i, window] of place.bestTimeWindows.entries()) {
    entries.push([`bestTimeWindows[${i}].label`, window.label]);
  }
  if (place.dressCode?.note) entries.push(["dressCode.note", place.dressCode.note]);
  // The depth fields are optional, but a half-translated one is the same silent
  // failure as anywhere else — an empty `th` renders a blank heading.
  if (place.story) entries.push(["story", place.story]);
  for (const [i, dish] of (place.signatureDishes ?? []).entries()) {
    entries.push([`signatureDishes[${i}].name`, dish.name]);
    entries.push([`signatureDishes[${i}].note`, dish.note]);
  }
  for (const [i, award] of (place.awards ?? []).entries()) {
    entries.push([`awards[${i}].name`, award.name]);
  }
  for (const [i, note] of (place.insiderNotes ?? []).entries()) {
    entries.push([`insiderNotes[${i}]`, note]);
  }
  return entries;
}

describe("awards and signature dishes", () => {
  const withAwards = places.filter((p) => p.awards?.length);
  const withDishes = places.filter((p) => p.signatureDishes?.length);

  it("has at least one place carrying each, or these fields are dead weight", () => {
    expect(withAwards.length).toBeGreaterThan(0);
    expect(withDishes.length).toBeGreaterThan(0);
  });

  it.each(withAwards.map((p) => [p.slug, p] as const))("%s has coherent award years", (_slug, place) => {
    for (const award of place.awards!) {
      // An ongoing run cannot have ended, and a finished one must say when.
      if (award.current) {
        expect(award.lastYear, "a current award has no last year").toBeNull();
      } else {
        expect(award.lastYear, "a lapsed award must say when it ended").not.toBeNull();
      }

      if (award.firstYear !== null && award.lastYear !== null) {
        expect(award.lastYear).toBeGreaterThanOrEqual(award.firstYear);
      }
      for (const year of [award.firstYear, award.lastYear]) {
        if (year !== null) {
          expect(year).toBeGreaterThan(1900);
          expect(year).toBeLessThanOrEqual(new Date().getFullYear() + 1);
        }
      }

      // Every award claim is a factual assertion about a real business, so it
      // carries where it came from — see docs/places-sources.md.
      expect(award.source.trim().length, "an award must record its source").toBeGreaterThan(0);

      // The reference has to be something a reader can actually open. A link
      // that is not absolute, or points at our own site, is not a source —
      // it is a citation of ourselves.
      if (award.sourceUrl !== undefined) {
        expect(award.sourceUrl, "a source URL must be absolute https").toMatch(/^https:\/\//);
        expect(award.sourceUrl).not.toContain("chiangmai");
        expect(() => new URL(award.sourceUrl!), "a source URL must parse").not.toThrow();

        // A citation with no publisher named is not a citation.
        expect(award.sourceName?.trim(), "a source URL needs a visible credit").toBeTruthy();

        // guide.michelin.com is unreachable to us — it answers automated
        // requests with an empty 202 or a 403, so a link to it cannot be
        // checked before shipping. One was shipped on an inferred URL pattern
        // and 404'd for the first person who clicked it. Cite a page we can
        // actually open instead.
        expect(
          new URL(award.sourceUrl!).hostname,
          "link a source we can verify, not guide.michelin.com"
        ).not.toContain("michelin.com");
      }
    }
  });

  it.each(withDishes.map((p) => [p.slug, p] as const))("%s has sane dish prices", (_slug, place) => {
    for (const dish of place.signatureDishes!) {
      // null means "not confirmed" and is allowed; a number must be plausible.
      if (dish.priceThb !== null) {
        expect(dish.priceThb).toBeGreaterThan(0);
        expect(dish.priceThb).toBeLessThan(100_000);
      }
    }
  });
});

describe("places catalogue", () => {
  it("has no duplicate slugs", () => {
    const seen = new Map<string, number>();
    for (const place of places) seen.set(place.slug, (seen.get(place.slug) ?? 0) + 1);
    expect([...seen].filter(([, count]) => count > 1).map(([slug]) => slug)).toEqual([]);
  });

  it.each(places.map((p) => [p.slug, p] as const))("%s is well-formed", (_slug, place) => {
    expect(place.slug, "slug must be kebab-case").toMatch(KEBAB_CASE);

    // A swapped lat/lng, or a decimal typo, lands the pin outside the province.
    expect(place.coordinates.lat).toBeGreaterThanOrEqual(PROVINCE_BOUNDS.minLat);
    expect(place.coordinates.lat).toBeLessThanOrEqual(PROVINCE_BOUNDS.maxLat);
    expect(place.coordinates.lng).toBeGreaterThanOrEqual(PROVINCE_BOUNDS.minLng);
    expect(place.coordinates.lng).toBeLessThanOrEqual(PROVINCE_BOUNDS.maxLng);

    expect(place.rating).toBeGreaterThanOrEqual(1);
    expect(place.rating).toBeLessThanOrEqual(5);
    expect(place.durationMinutes).toBeGreaterThan(0);
    expect(place.paletteSeed).toBeGreaterThanOrEqual(1);
    expect(place.paletteSeed).toBeLessThanOrEqual(6);
    expect(place.bestTime.length, "needs at least one bestTime").toBeGreaterThan(0);
    expect(place.tags.length, "needs at least one tag — tags feed explore search").toBeGreaterThan(0);

    if (place.openingHours) {
      expect(place.openingHours.opens).toMatch(HHMM);
      expect(place.openingHours.closes).toMatch(HHMM);
      expect(
        minutes(place.openingHours.closes),
        "closes must be after opens ('24:00' means through midnight)"
      ).toBeGreaterThan(minutes(place.openingHours.opens));
    }

    for (const day of place.closedOnDays) {
      expect(day, "closedOnDays uses 0=Sunday..6=Saturday").toBeGreaterThanOrEqual(0);
      expect(day).toBeLessThanOrEqual(6);
    }
    expect(new Set(place.closedOnDays).size, "closedOnDays must not repeat a day").toBe(
      place.closedOnDays.length
    );
    expect(place.closedOnDays.length, "a place closed all seven days is a data error").toBeLessThan(7);

    // Both locales must be present — an empty `th` renders as a blank label.
    for (const [field, text] of localizedTexts(place)) {
      expect(text.en.trim(), `${field}.en must not be empty`).not.toBe("");
      expect(text.th.trim(), `${field}.th must not be empty`).not.toBe("");
    }

    if (place.dataLastVerified !== null) {
      expect(place.dataLastVerified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("only assigns clock-anchored time windows real HH:mm values", () => {
    for (const place of places) {
      for (const window of place.bestTimeWindows) {
        if (window.anchor === "clock") {
          expect(String(window.start), `${place.slug} window start`).toMatch(HHMM);
          expect(String(window.end), `${place.slug} window end`).toMatch(HHMM);
        } else {
          // Sunrise/sunset windows are offsets in minutes, not clock strings.
          expect(typeof window.start, `${place.slug} window start`).toBe("number");
          expect(typeof window.end, `${place.slug} window end`).toBe("number");
        }
      }
    }
  });
});

describe("guides", () => {
  it("only reference place slugs that exist", () => {
    const slugs = new Set(places.map((p) => p.slug));
    const dangling = guides.flatMap((guide) =>
      guide.relatedPlaceSlugs.filter((slug) => !slugs.has(slug)).map((slug) => `${guide.slug} → ${slug}`)
    );
    expect(dangling).toEqual([]);
  });
});
