import { describe, expect, it } from "vitest";
import { places } from "@/data/places";
import { buildPlaceCatalogue } from "./catalogue";

describe("buildPlaceCatalogue", () => {
  // The catalogue sits behind a prompt-cache breakpoint, and caching is a
  // prefix match on exact bytes. If this output ever varies between calls,
  // every request silently pays a full-price cache write instead of a read —
  // with no error and nothing visible in the UI to notice it by.
  it("renders byte-identical output on repeated calls", () => {
    expect(buildPlaceCatalogue()).toBe(buildPlaceCatalogue());
  });

  it("lists places sorted by slug, so data-file order can't reshuffle it", () => {
    const catalogue = buildPlaceCatalogue();
    const positions = places
      .map((p) => p.slug)
      .sort((a, b) => a.localeCompare(b))
      .map((slug) => catalogue.indexOf(`\n${slug} |`));

    expect(positions.every((pos) => pos > -1)).toBe(true);
    expect([...positions]).toEqual([...positions].sort((a, b) => a - b));
  });

  it("includes every place exactly once", () => {
    const catalogue = buildPlaceCatalogue();
    for (const place of places) {
      expect(catalogue.split(`\n${place.slug} |`)).toHaveLength(2);
    }
  });

  it("omits the long prose fields that don't help the model choose", () => {
    const catalogue = buildPlaceCatalogue();
    const sample = places.find((p) => p.slug === "wat-phra-that-doi-suthep")!;
    expect(catalogue).not.toContain(sample.description.en);
    expect(catalogue).not.toContain(sample.localTip.en);
  });

  it("carries the constraints the model plans against", () => {
    const catalogue = buildPlaceCatalogue();
    // Michelin tags — the case that motivated this feature.
    expect(catalogue).toContain("michelin bib gourmand");
    // Closed days, or the model will schedule a visit on a shut day.
    expect(catalogue).toContain("closed Wed");
    // Per-person spend, or it cannot respect a budget.
    expect(catalogue).toContain("Per-person spend estimate");
  });
});
