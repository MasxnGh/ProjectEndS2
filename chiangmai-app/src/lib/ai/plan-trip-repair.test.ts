import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { planWithProvider } from "./plan-trip";
import type { PlanRequestInput } from "./prompt";
import { AiPlannerError, type GeneratedPlan, type TripPlanProvider } from "./provider";
import type { AiTripPlan } from "./schema";

// The fix pass, with a stand-in provider: which answer is shown, when a fix
// is asked for at all, and how long it may take. The planner's checks are the
// real ones.

const INPUT: PlanRequestInput = {
  request: "dinner at Huen Phen and a museum",
  days: 1,
  daysSetByTraveller: true,
  travelDate: null,
  travelers: 2,
  budgetThb: null,
  travelMode: "walk",
  accommodationThb: 0,
};

const answer = (days: string[][], unmet: string[] = []): AiTripPlan => ({
  read: { days: 0, budgetThb: 0, budgetBasis: "none", travelers: 0 },
  understood: "Dinner and a museum.",
  days: days.map((slugs) => ({ slugs, note: "" })),
  unmetConstraints: unmet,
});

// After a 17:00 dinner the museum (09:00–16:00) is shut; before it, it is open.
const MUSEUM_AFTER_DINNER = answer([["huen-phen", "chiang-mai-national-museum"]]);
const MUSEUM_BEFORE_DINNER = answer([["chiang-mai-national-museum", "wat-chedi-luang", "huen-phen"]]);

interface Fake {
  provider: TripPlanProvider;
  repairs: { message: string; timeoutMs: number }[];
  clock: { now: number };
}

function fake({
  first,
  fixed,
  firstTakesMs = 20_000,
  canRepair = true,
}: {
  first: AiTripPlan;
  fixed?: AiTripPlan | Error;
  firstTakesMs?: number;
  canRepair?: boolean;
}): Fake {
  const repairs: Fake["repairs"] = [];
  const clock = { now: 0 };
  const provider: TripPlanProvider = {
    id: "gemini",
    model: "fake-model",
    isConfigured: () => true,
    async generate() {
      clock.now += firstTakesMs;
      return { plan: first, model: "fake-model" };
    },
    ...(canRepair
      ? {
          async repair(
            input: PlanRequestInput,
            message: string,
            { timeoutMs }: { timeoutMs: number }
          ): Promise<GeneratedPlan> {
            repairs.push({ message, timeoutMs });
            // A fresh call: the same request, with the first plan in the message.
            expect(input.request).toBe(INPUT.request);
            expect(message).toContain(JSON.stringify(first));
            clock.now += 15_000;
            if (fixed instanceof Error) throw fixed;
            return { plan: fixed ?? first, model: "fake-fixer" };
          },
        }
      : {}),
  };
  return { provider, repairs, clock };
}

const run = (f: Fake, input: PlanRequestInput = INPUT, options: Parameters<typeof planWithProvider>[2] = {}) =>
  planWithProvider(f.provider, input, { now: () => f.clock.now, ...options });

beforeAll(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterAll(() => {
  vi.restoreAllMocks();
});

describe("planWithProvider", () => {
  it("shows a plan the planner has nothing to say about as it came, with no second call", async () => {
    const f = fake({ first: MUSEUM_BEFORE_DINNER });
    const outcome = await run(f);
    expect(outcome.plan.repair).toBe("not_needed");
    expect(outcome.plan.issues).toEqual([]);
    expect(f.repairs).toHaveLength(0);
    expect(outcome.repairMs).toBeNull();
  });

  it("sends the planner's warnings back once and shows the fixed plan when it is better", async () => {
    const f = fake({ first: MUSEUM_AFTER_DINNER, fixed: MUSEUM_BEFORE_DINNER });
    const outcome = await run(f);

    expect(f.repairs).toHaveLength(1);
    expect(f.repairs[0].message).toContain("chiang-mai-national-museum is timed 18:41–20:11, outside its opening hours (09:00–16:00)");
    expect(outcome.plan.repair).toBe("used");
    expect(outcome.plan.days[0].slugs).toEqual(["chiang-mai-national-museum", "wat-chedi-luang", "huen-phen"]);
    expect(outcome.plan.issues).toEqual([]);
    expect(outcome.raw).toBe(MUSEUM_BEFORE_DINNER);
    // The first answer is kept beside it, with what was wrong with it.
    expect(outcome.first.raw).toBe(MUSEUM_AFTER_DINNER);
    expect(outcome.first.plan.issues).toHaveLength(1);
    expect(outcome.repairMs).toBe(15_000);
    // Both models are named: the one that chose the places, and the one that fixed them.
    expect(outcome.plan.model).toBe("fake-fixer");
    expect(outcome.plan.draftModel).toBe("fake-model");
    expect(outcome.first.plan.model).toBe("fake-model");
  });

  it("keeps the first plan, warnings and all, when the fix is no better", async () => {
    const f = fake({ first: MUSEUM_AFTER_DINNER, fixed: MUSEUM_AFTER_DINNER });
    const outcome = await run(f);
    expect(outcome.plan.repair).toBe("kept");
    expect(outcome.plan.issues).toEqual([
      { type: "outsideHours", day: 1, slug: "chiang-mai-national-museum", arrival: "18:41", departure: "20:11" },
    ]);
    expect(outcome.plan.model).toBe("fake-model");
    expect(outcome.plan.draftModel).toBeUndefined();
  });

  it("lets the fix drop the stop the planner flagged", async () => {
    const f = fake({ first: MUSEUM_AFTER_DINNER, fixed: answer([["huen-phen"]], ["The museum is shut by evening."]) });
    expect((await run(f)).plan.repair).toBe("used");
  });

  it("keeps the first plan when the fix clears a warning by cutting a stop nobody flagged", async () => {
    // The temple is open when it is reached; only the museum is a problem.
    const first = answer([["wat-chedi-luang", "huen-phen", "chiang-mai-national-museum"]]);
    const f = fake({ first, fixed: answer([["huen-phen"]]) });
    const outcome = await run(f);
    expect(outcome.first.plan.issues.map((issue) => issue.type)).toEqual(["outsideHours"]);
    expect(outcome.plan.repair).toBe("kept");
    expect(outcome.plan.days[0].slugs).toEqual(first.days[0].slugs);
    expect(outcome.fix?.raw.days[0].slugs).toEqual(["huen-phen"]);
  });

  it("keeps the first plan when the fix loses a day", async () => {
    const twoDays = answer([["huen-phen", "chiang-mai-national-museum"], ["wat-umong"]]);
    const f = fake({ first: twoDays, fixed: answer([["wat-umong"]]) });
    const outcome = await run(f, { ...INPUT, days: 2 });
    expect(outcome.plan.repair).toBe("kept");
    expect(outcome.plan.days).toHaveLength(2);
  });

  it("keeps the first plan when the fix goes over a budget the first one fitted", async () => {
    const f = fake({
      first: MUSEUM_AFTER_DINNER,
      fixed: answer([["chiang-mai-national-museum", "blackitch-artisan-kitchen"]], ["Over budget."]),
    });
    const outcome = await run(f, { ...INPUT, budgetThb: 2_000 });
    expect(outcome.first.plan.overBudgetByThb).toBeNull();
    expect(outcome.plan.repair).toBe("kept");
  });

  it("asks for a fix when the plan is over budget and does not say so", async () => {
    const pricey = answer([["blackitch-artisan-kitchen"]]);
    const f = fake({ first: pricey, fixed: answer([["blackitch-artisan-kitchen"]], ["About 3,000 THB over: the Michelin dinner."]) });
    const outcome = await run(f, { ...INPUT, budgetThb: 500 });
    expect(f.repairs[0].message).toContain("against a budget of 500 THB, and unmetConstraints does not say so");
    expect(outcome.plan.repair).toBe("used");
    expect(outcome.plan.unmetConstraints).toHaveLength(1);
  });

  it("shows the first plan when the fix call fails", async () => {
    const f = fake({ first: MUSEUM_AFTER_DINNER, fixed: new AiPlannerError("Gemini fake: 503", "upstream", { status: 503 }) });
    const outcome = await run(f);
    expect(outcome.plan.repair).toBe("failed");
    expect(outcome.raw).toBe(MUSEUM_AFTER_DINNER);
    expect(outcome.plan.issues).toHaveLength(1);
  });

  it("stops when the traveller cancels during the fix", async () => {
    const f = fake({ first: MUSEUM_AFTER_DINNER, fixed: new AiPlannerError("cancelled", "aborted") });
    await expect(run(f)).rejects.toMatchObject({ code: "aborted" });
  });

  it("gives the fix what is left of the time, at most 25 seconds", async () => {
    const quick = fake({ first: MUSEUM_AFTER_DINNER, fixed: MUSEUM_BEFORE_DINNER, firstTakesMs: 20_000 });
    await run(quick);
    expect(quick.repairs[0].timeoutMs).toBe(25_000);

    const slow = fake({ first: MUSEUM_AFTER_DINNER, fixed: MUSEUM_BEFORE_DINNER, firstTakesMs: 90_000 });
    await run(slow);
    expect(slow.repairs[0].timeoutMs).toBe(108_000 - 90_000);
  });

  it("skips the fix when too little time is left, or the provider cannot fix", async () => {
    const late = fake({ first: MUSEUM_AFTER_DINNER, fixed: MUSEUM_BEFORE_DINNER, firstTakesMs: 100_000 });
    expect((await run(late)).plan.repair).toBe("skipped");
    expect(late.repairs).toHaveLength(0);

    const noRepair = fake({ first: MUSEUM_AFTER_DINNER, canRepair: false });
    const outcome = await run(noRepair);
    expect(outcome.plan.repair).toBe("skipped");
    expect(outcome.plan.issues).toHaveLength(1);
  });
});
