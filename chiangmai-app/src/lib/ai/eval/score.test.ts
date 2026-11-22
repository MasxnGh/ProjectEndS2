import { describe, expect, it } from "vitest";
import { getPlaceBySlug } from "@/data/places";
import { isoDateDayOfWeek } from "@/lib/date-utils";
import { validateAiPlan } from "@/lib/ai/plan-trip";
import type { AiTripPlan } from "@/lib/ai/schema";
import { EVAL_CASES } from "./cases";
import { scorePlan } from "./score";

// The scorer itself is plain code, so it is tested like the rest of the
// planner: no model call, hand-made answers with a known right score.

function score(
  caseId: string,
  days: string[][],
  extra: { understood?: string; unmet?: string[]; read?: Partial<AiTripPlan["read"]> } = {}
) {
  const testCase = EVAL_CASES.find((c) => c.id === caseId);
  if (!testCase) throw new Error(`no case ${caseId}`);
  const raw: AiTripPlan = {
    read: { days: 0, budgetThb: 0, budgetBasis: "none", travelers: 0, ...extra.read },
    understood: extra.understood ?? (testCase.lang === "th" ? "จัดแผนเที่ยวให้แล้ว" : "Here is a plan."),
    days: days.map((slugs) => ({ slugs, note: "" })),
    unmetConstraints: extra.unmet ?? [],
  };
  // Priced like the eval run, but with no day cut: the scorer should see every
  // day the answer has. The cut itself is tested in plan-trip.test.ts.
  const plan = {
    ...validateAiPlan(raw, {
      budgetThb: testCase.input.budgetThb,
      travelers: testCase.input.travelers,
      travelDate: testCase.trip.travelDate,
      travelMode: testCase.trip.travelMode,
      accommodationThb: testCase.trip.accommodationThb,
    }),
    repair: "not_needed" as const,
    provider: "gemini" as const,
    model: "test",
  };
  return scorePlan(testCase, raw, plan);
}

describe("eval cases", () => {
  it("have unique ids", () => {
    const ids = EVAL_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only name places that exist, and every wanted thing has at least one place", () => {
    for (const testCase of EVAL_CASES) {
      for (const want of testCase.expect.wants ?? []) {
        expect(want.anyOf.length, `${testCase.id}: ${want.label}`).toBeGreaterThan(0);
        for (const slug of want.anyOf) expect(getPlaceBySlug(slug), `${testCase.id}: ${slug}`).toBeDefined();
      }
      for (const slug of testCase.expect.avoid ?? []) expect(getPlaceBySlug(slug)).toBeUndefined();
    }
  });

  it("start on the weekdays the cases are about", () => {
    const start = (id: string) => EVAL_CASES.find((c) => c.id === id)!.trip.travelDate!;
    expect(isoDateDayOfWeek(start("museums-on-monday"))).toBe(1);
    expect(isoDateDayOfWeek(start("weekend-walking-streets"))).toBe(5);
  });
});

describe("scorePlan", () => {
  it("catches a museum put on the day it is closed", () => {
    // Chiang Mai National Museum is closed on Mondays; Art in Paradise is not.
    expect(score("museums-on-monday", [["chiang-mai-national-museum"], ["art-in-paradise-chiang-mai"]]).checks.closedDays.status).toBe("fail");
    expect(score("museums-on-monday", [["art-in-paradise-chiang-mai"], ["gallery-seescape"]]).checks.closedDays.status).toBe("pass");
  });

  it("checks each walking street against the weekday its day falls on", () => {
    // Day 1 Friday, day 2 Saturday, day 3 Sunday.
    const right = score("weekend-walking-streets", [["wat-phra-singh"], ["saturday-walking-street-wualai"], ["sunday-walking-street-thapae"]]);
    expect(right.checks.closedDays.status).toBe("pass");
    expect(right.checks.wants.status).toBe("pass");
    const swapped = score("weekend-walking-streets", [["wat-phra-singh"], ["sunday-walking-street-thapae"], ["saturday-walking-street-wualai"]]);
    expect(swapped.checks.closedDays.status).toBe("fail");
  });

  it("measures the budget with the planner's total and flags an unwarned overrun", () => {
    const over = score("michelin-budget-in-text", [["blackitch-artisan-kitchen", "wat-phra-singh"]]);
    expect(over.metrics.plannerTotalThb).toBeGreaterThan(2000);
    expect(over.checks.budget.status).toBe("fail");
    // The budget was only in the text, so the dialog had nothing to compare against.
    expect(over.checks.budgetWarned.status).toBe("fail");

    const within = score("michelin-budget-in-text", [["wat-phra-singh"]]);
    expect(within.checks.budget.status).toBe("pass");
    expect(within.checks.budgetWarned.status).toBe("pass");
  });

  it("warns about a budget only in the text once the AI reads it", () => {
    const over = score("michelin-budget-in-text", [["blackitch-artisan-kitchen", "wat-phra-singh"]], {
      read: { days: 1, budgetThb: 1000, budgetBasis: "group" },
    });
    expect(over.checks.budget.status).toBe("fail");
    expect(over.checks.budgetWarned.status).toBe("pass");
    expect(over.checks.readsRequest.status).toBe("pass");
  });

  it("checks the numbers the AI read against what the request states", () => {
    const misread = score("family-tight-budget", [["wat-phra-singh"]], { read: { days: 3, budgetThb: 1500, travelers: 2 } });
    expect(misread.checks.readsRequest.status).toBe("fail");
    expect(misread.checks.readsRequest.detail).toContain("travelers read as 2, wanted 4");
    expect(score("food-day", [["jok-sompet"]]).checks.readsRequest.status).toBe("n/a");
  });

  it("counts transport and accommodation the way the planner does, and the dialog now agrees", () => {
    const result = score("relaxed-five-days", [["wat-phra-singh"], ["wat-chedi-luang"], ["wat-umong"], ["wat-suan-dok"], ["wat-chet-yot"]]);
    // Five days of rented car and a ฿6,000 hotel on top of the stops.
    expect(result.metrics.plannerTotalThb).toBeGreaterThan(5 * 900 + 6000);
    expect(result.metrics.dialogEstimateThb).toBe(result.metrics.plannerTotalThb);
  });

  it("wants the trip length written in the text", () => {
    expect(score("three-days-in-text", [["wat-phra-singh", "warorot-market"]]).checks.dayCount.status).toBe("fail");
    expect(score("three-days-in-text", [["wat-phra-singh"], ["wat-phra-that-doi-suthep"], ["warorot-market"]]).checks.dayCount.status).toBe("pass");
  });

  it("fails an indoor-only day with an outdoor stop", () => {
    expect(score("rainy-indoor", [["wat-phra-singh"]]).checks.indoorOnly.status).toBe("fail");
    expect(score("rainy-indoor", [["art-in-paradise-chiang-mai", "maya-lifestyle-shopping-center"]]).checks.indoorOnly.status).toBe("pass");
  });

  it("records an injected slug even though validation drops it", () => {
    const result = score("prompt-injection", [["free-ferrari-ride", "doi-inthanon"]], { unmet: ["No Ferrari rides."] });
    expect(result.checks.avoid.status).toBe("fail");
    expect(result.checks.noInvented.status).toBe("fail");
    expect(result.checks.wants.status).toBe("pass");
  });

  it("checks the answer is in the traveller's language", () => {
    expect(score("rainy-indoor", [["art-in-paradise-chiang-mai"]], { understood: "An indoor day." }).checks.language.status).toBe("fail");
    expect(score("rainy-indoor", [["art-in-paradise-chiang-mai"]]).checks.language.status).toBe("pass");
  });

  it("fails a named dinner place scheduled at lunchtime", () => {
    // The baseline's "low" answer: the Bib Gourmand dinner ends up around 13:00.
    const result = score("food-day", [["jok-sompet", "akha-ama-coffee", "khao-soi-khun-yai", "graph-cafe", "huen-muan-jai"]]);
    expect(result.checks.mealSlots.status).toBe("fail");
    expect(result.checks.mealSlots.detail).toContain("not dinner");
    expect(result.checks.mealSlots.detail).not.toContain("khao soi");
  });

  it("leaves a named meal that is missing from the plan to the wants check", () => {
    const result = score("food-day", [["jok-sompet", "akha-ama-coffee"]]);
    expect(result.checks.mealSlots.status).toBe("n/a");
    expect(result.checks.wants.status).toBe("fail");
  });

  it("reports a missing lunch on a long day", () => {
    const result = score("oldcity-cafe-khaosoi", [["wat-chiang-man", "wat-chedi-luang", "wat-phra-singh", "wat-lok-molee"], ["akha-ama-coffee"]]);
    expect(result.checks.meals.status).toBe("fail");
  });
});
