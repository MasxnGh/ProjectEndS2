import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPlaceBySlug, places } from "@/data/places";
import { categorySpendBreakdown, estimateTripCostThb } from "@/lib/trip-calculations";
import { isAiPlannerConfigured, resolveProvider, validateAiPlan, MAX_DAYS } from "./plan-trip";
import type { AiTripPlan } from "./schema";

// Everything here exercises the guard between the model's answer and the
// planner. The model is not called: these are the checks that have to hold no
// matter what it returns, including nonsense.

/** A request that states no numbers of its own. */
const NOTHING_READ: AiTripPlan["read"] = { days: 0, budgetThb: 0, budgetBasis: "none", travelers: 0 };

function plan(days: { slugs: string[]; note?: string }[], read: Partial<AiTripPlan["read"]> = {}): AiTripPlan {
  return {
    read: { ...NOTHING_READ, ...read },
    understood: "A day of temples.",
    days: days.map((d) => ({ slugs: d.slugs, note: d.note ?? "" })),
    unmetConstraints: [],
  };
}

const OPTS = { budgetThb: null, travelers: 1 };

describe("validateAiPlan", () => {
  it("keeps slugs that exist, in the order given", () => {
    const result = validateAiPlan(plan([{ slugs: ["wat-phra-singh", "wat-chedi-luang"] }]), OPTS);
    expect(result.days).toHaveLength(1);
    expect(result.days[0].slugs).toEqual(["wat-phra-singh", "wat-chedi-luang"]);
    expect(result.droppedSlugs).toEqual([]);
  });

  it("drops invented slugs and reports them", () => {
    const result = validateAiPlan(
      plan([{ slugs: ["wat-phra-singh", "wat-imaginary-temple", "cafe-that-does-not-exist"] }]),
      OPTS
    );
    expect(result.days[0].slugs).toEqual(["wat-phra-singh"]);
    expect(result.droppedSlugs).toEqual(["wat-imaginary-temple", "cafe-that-does-not-exist"]);
  });

  it("collapses a place repeated across the trip", () => {
    const result = validateAiPlan(
      plan([{ slugs: ["wat-phra-singh", "wat-phra-singh"] }, { slugs: ["wat-phra-singh", "wat-umong"] }]),
      OPTS
    );
    expect(result.days[0].slugs).toEqual(["wat-phra-singh"]);
    expect(result.days[1].slugs).toEqual(["wat-umong"]);
  });

  it("drops a day left empty after validation rather than rendering a blank column", () => {
    const result = validateAiPlan(
      plan([{ slugs: ["wat-phra-singh"] }, { slugs: ["not-a-real-place"] }]),
      OPTS
    );
    expect(result.days).toHaveLength(1);
    expect(result.days[0].slugs).toEqual(["wat-phra-singh"]);
  });

  it("clamps a runaway day count", () => {
    // A distinct real slug per day, so nothing is lost to dedupe and the only
    // thing that can shorten the list is the clamp itself.
    const manyDays = places
      .slice(0, MAX_DAYS + 10)
      .map((place) => ({ slugs: [place.slug] }));
    expect(manyDays.length).toBeGreaterThan(MAX_DAYS);

    const result = validateAiPlan(plan(manyDays), OPTS);
    expect(result.days).toHaveLength(MAX_DAYS);
  });

  it("cuts an answer back to the number of days asked for", () => {
    const fourDays = places.slice(0, 4).map((place) => ({ slugs: [place.slug] }));
    const result = validateAiPlan(plan(fourDays), { ...OPTS, days: 2 });
    expect(result.days.map((d) => d.slugs)).toEqual([[places[0].slug], [places[1].slug]]);
  });

  it("survives an empty answer without throwing", () => {
    const result = validateAiPlan(plan([]), OPTS);
    expect(result.days).toEqual([]);
    expect(result.estimatedCostThb).toBe(0);
    expect(result.overBudgetByThb).toBeNull();
  });

  it("flags a plan that exceeds the stated budget", () => {
    // Three splurge-priced stops cannot fit ฿500 at any traveller count.
    const result = validateAiPlan(
      plan([{ slugs: ["ethical-elephant-sanctuary", "khum-khantoke", "blackitch-artisan-kitchen"] }]),
      { budgetThb: 500, travelers: 1 }
    );
    expect(result.overBudgetByThb).not.toBeNull();
    expect(result.overBudgetByThb!).toBeGreaterThan(0);
    expect(result.estimatedCostThb).toBeGreaterThan(500);
  });

  it("does not flag a plan that fits the budget", () => {
    const result = validateAiPlan(plan([{ slugs: ["wat-phra-singh"] }]), {
      budgetThb: 5000,
      travelers: 1,
    });
    expect(result.overBudgetByThb).toBeNull();
  });

  it("scales the estimate by traveller count", () => {
    const one = validateAiPlan(plan([{ slugs: ["wat-phra-singh", "huen-phen"] }]), {
      budgetThb: null,
      travelers: 1,
    });
    const four = validateAiPlan(plan([{ slugs: ["wat-phra-singh", "huen-phen"] }]), {
      budgetThb: null,
      travelers: 4,
    });
    expect(four.estimatedCostThb).toBeGreaterThan(one.estimatedCostThb);
  });

  it("totals the plan exactly as the planner page will, with the trip's mode, party and stay", () => {
    const slugs = ["wat-phra-singh", "huen-phen", "wat-umong"];
    const result = validateAiPlan(plan([{ slugs }]), {
      budgetThb: null,
      travelers: 3,
      travelMode: "grab",
      accommodationThb: 1200,
    });
    const breakdown = categorySpendBreakdown([{ places: slugs.map((slug) => getPlaceBySlug(slug)!) }], "grab");
    expect(breakdown.transport).toBeGreaterThan(0);
    expect(result.estimatedCostThb).toBe(estimateTripCostThb(breakdown, 3, 1200));
    expect(result.cost).toEqual({
      perPersonThb: breakdown.entry + breakdown.food + breakdown.assumedMeals,
      travelers: 3,
      transportThb: breakdown.transport,
      travelMode: "grab",
      accommodationThb: 1200,
    });
    // The parts the dialog lists add up to the total it shows.
    expect(result.cost.perPersonThb * 3 + result.cost.transportThb + 1200).toBe(result.estimatedCostThb);
  });

  it("counts transport and accommodation against the budget", () => {
    const day = plan([{ slugs: ["wat-phra-singh", "wat-chedi-luang"] }]);
    expect(validateAiPlan(day, { budgetThb: 2000, travelers: 1 }).overBudgetByThb).toBeNull();
    const byCarWithStay = validateAiPlan(day, {
      budgetThb: 2000,
      travelers: 1,
      travelMode: "rented-car",
      accommodationThb: 1500,
    });
    expect(byCarWithStay.overBudgetByThb).toBe(byCarWithStay.estimatedCostThb - 2000);
    expect(byCarWithStay.overBudgetByThb!).toBeGreaterThan(0);
  });

  it("plans the length the request states when the days field was left as it was", () => {
    const threeDays = plan([{ slugs: ["wat-phra-singh"] }, { slugs: ["wat-chedi-luang"] }, { slugs: ["wat-umong"] }], {
      days: 3,
    });
    expect(validateAiPlan(threeDays, { ...OPTS, days: 1, daysSetByTraveller: false }).days).toHaveLength(3);
    // Typed in by the traveller, the field wins.
    expect(validateAiPlan(threeDays, { ...OPTS, days: 1, daysSetByTraveller: true }).days).toHaveLength(1);
    // Left as it was, with no length in the request, the field still decides.
    const unstated = plan([{ slugs: ["wat-phra-singh"] }, { slugs: ["wat-chedi-luang"] }]);
    expect(validateAiPlan(unstated, { ...OPTS, days: 1, daysSetByTraveller: false }).days).toHaveLength(1);
  });

  it("holds the plan to a budget the request states, over the trip's", () => {
    const day = plan([{ slugs: ["wat-phra-singh", "huen-phen"] }], { budgetThb: 1000, budgetBasis: "per_person" });
    const result = validateAiPlan(day, { budgetThb: 5000, travelers: 2 });
    // ฿1,000 each, for the two travellers the planner prices for.
    expect(result.budget).toEqual({ thb: 2000, source: "request" });
    expect(result.read).toEqual({ days: null, budgetThb: 1000, budgetBasis: "per_person", travelers: null });
    expect(result.overBudgetByThb).toBe(result.estimatedCostThb > 2000 ? result.estimatedCostThb - 2000 : null);

    const forTheGroup = validateAiPlan(plan([{ slugs: ["wat-phra-singh"] }], { budgetThb: 1000, budgetBasis: "group" }), {
      budgetThb: 5000,
      travelers: 2,
    });
    expect(forTheGroup.budget).toEqual({ thb: 1000, source: "request" });
  });

  it("falls back to the trip's budget when the request states none", () => {
    expect(validateAiPlan(plan([{ slugs: ["wat-phra-singh"] }]), { budgetThb: 5000, travelers: 2 }).budget).toEqual({
      thb: 5000,
      source: "trip",
    });
    expect(validateAiPlan(plan([{ slugs: ["wat-phra-singh"] }]), { budgetThb: null, travelers: 2 }).budget).toBeNull();
  });

  it("reads 0 and none as not stated, and drops numbers that cannot be right", () => {
    const result = validateAiPlan(
      plan([{ slugs: ["wat-phra-singh"] }], { days: 30, budgetThb: -50, budgetBasis: "per_person", travelers: 400 }),
      OPTS
    );
    expect(result.read).toEqual({ days: MAX_DAYS, budgetThb: null, budgetBasis: null, travelers: null });
    // A budget with no basis given is for the group.
    const noBasis = validateAiPlan(plan([{ slugs: ["wat-phra-singh"] }], { budgetThb: 800, budgetBasis: "none" }), OPTS);
    expect(noBasis.read.budgetBasis).toBe("group");
  });

  it("passes the model's own prose through untouched", () => {
    const raw: AiTripPlan = {
      read: { ...NOTHING_READ, budgetThb: 1000, budgetBasis: "group" },
      understood: "อยากเที่ยววัดและกินร้านมิชลิน งบ 1,000 บาท",
      days: [{ slugs: ["wat-phra-singh"], note: "เช้าไปวัด" }],
      unmetConstraints: ["ร้านมิชลินที่เปิดเที่ยงมีจำกัด"],
    };
    const result = validateAiPlan(raw, OPTS);
    expect(result.understood).toBe(raw.understood);
    expect(result.days[0].note).toBe("เช้าไปวัด");
    expect(result.unmetConstraints).toEqual(["ร้านมิชลินที่เปิดเที่ยงมีจำกัด"]);
  });
});

describe("resolveProvider", () => {
  const KEYS = ["AI_PROVIDER", "GEMINI_API_KEY", "ANTHROPIC_API_KEY"] as const;
  let saved: Record<string, string | undefined>;

  beforeEach(() => {
    saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]));
    for (const key of KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  });

  it("reports unconfigured when neither key is present", () => {
    expect(resolveProvider()).toBeNull();
    expect(isAiPlannerConfigured()).toBe(false);
  });

  it("prefers Gemini when both keys are present, because it is the free one", () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.ANTHROPIC_API_KEY = "test";
    expect(resolveProvider()?.id).toBe("gemini");
  });

  it("falls back to whichever provider has a key", () => {
    process.env.ANTHROPIC_API_KEY = "test";
    expect(resolveProvider()?.id).toBe("anthropic");
  });

  it("honours an explicit AI_PROVIDER pin", () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.ANTHROPIC_API_KEY = "test";
    process.env.AI_PROVIDER = "anthropic";
    expect(resolveProvider()?.id).toBe("anthropic");
  });

  it("reports unconfigured rather than silently using the other provider when the pinned one has no key", () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.AI_PROVIDER = "anthropic";
    expect(resolveProvider()).toBeNull();
  });

  it("ignores casing and stray whitespace in AI_PROVIDER", () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.AI_PROVIDER = "  Gemini ";
    expect(resolveProvider()?.id).toBe("gemini");
  });

  it("reports unconfigured for an unknown provider name", () => {
    process.env.GEMINI_API_KEY = "test";
    process.env.AI_PROVIDER = "openai";
    expect(resolveProvider()).toBeNull();
  });
});
