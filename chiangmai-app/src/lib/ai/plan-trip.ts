import "server-only";

import { getPlaceBySlug } from "@/data/places";
import type { TravelMode } from "@/data/types";
import { categorySpendBreakdown, estimateTripCostThb } from "@/lib/trip-calculations";
import type { AiTripPlan, RepairOutcome, RequestReading, ValidatedTripPlan } from "@/lib/ai/schema";
import { MAX_DAYS, buildRepairMessage, type PlanRequestInput } from "@/lib/ai/prompt";
import { checkPlanDays, countMealGaps, planDays } from "@/lib/ai/plan-check";
import {
  AiPlannerError,
  type GeneratedPlan,
  type GenerateOptions,
  type ProviderId,
  type TripPlanProvider,
} from "@/lib/ai/provider";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";

export { AiPlannerError, MAX_DAYS };
export const MAX_PROMPT_CHARS = 1000;
/** A party size past this is a misread number, not a trip. */
const MAX_READ_TRAVELERS = 50;

/**
 * The first answer and the fix together. The dialog stops waiting at 115 s
 * and the route at 120 s; Gemini's own chain of models stops at 105 s, so a
 * first answer that slow leaves no time for a fix and is shown as it is.
 */
const PLAN_DEADLINE_MS = 108_000;
/** With less time left than this, a fix would only time out. */
const MIN_REPAIR_MS = 10_000;
/**
 * The most a fix may add to the wait. The traveller has already waited for
 * the first plan, and a fix that does not come back in time was waited for
 * for nothing. gemini-3.1-flash-lite returned its fixes in 5–16 s in the eval.
 */
const MAX_REPAIR_MS = 25_000;

// Gemini first: it is the only one of the two with a free tier, so an
// unconfigured deployment that later adds one key gets the free provider by
// default rather than the metered one.
const PROVIDERS: TripPlanProvider[] = [geminiProvider, anthropicProvider];

/**
 * `AI_PROVIDER` pins a provider explicitly — the switch that makes a
 * side-by-side comparison possible. With it unset, whichever provider has a key
 * wins, Gemini first.
 */
export function resolveProvider(): TripPlanProvider | null {
  const pinned = process.env.AI_PROVIDER?.trim().toLowerCase() as ProviderId | undefined;
  if (pinned) {
    const match = PROVIDERS.find((p) => p.id === pinned);
    // A pinned-but-unconfigured provider is a deployment mistake worth
    // surfacing, not something to silently paper over by using the other one.
    return match?.isConfigured() ? match : null;
  }
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

export function isAiPlannerConfigured(): boolean {
  return resolveProvider() !== null;
}

/** The model's reading with its "not stated" markers (0, "none") turned into null, and nonsense dropped. */
function cleanReading(read: AiTripPlan["read"] | undefined): RequestReading {
  const whole = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n >= 1 ? Math.round(n) : null);
  const days = whole(read?.days);
  const travelers = whole(read?.travelers);
  const budgetThb =
    typeof read?.budgetThb === "number" && Number.isFinite(read.budgetThb) && read.budgetThb > 0
      ? Math.round(read.budgetThb)
      : null;
  return {
    // "Three weeks" still means as long as the planner goes.
    days: days === null ? null : Math.min(MAX_DAYS, days),
    budgetThb,
    // A stated budget that does not say is for the group, as the prompt tells the model.
    budgetBasis: budgetThb === null ? null : read?.budgetBasis === "per_person" ? "per_person" : "group",
    travelers: travelers !== null && travelers <= MAX_READ_TRAVELERS ? travelers : null,
  };
}

/**
 * The budget a plan is held to. A figure in the request is the traveller's
 * latest word, so it wins over the trip settings for this plan; the dialog
 * offers to make it the trip's budget. A per-person figure is multiplied by
 * the party the planner prices for, so it is compared per person either way.
 */
function planBudget(read: RequestReading, party: number, tripBudgetThb: number | null): ValidatedTripPlan["budget"] {
  if (read.budgetThb !== null) {
    return { thb: read.budgetBasis === "per_person" ? read.budgetThb * party : read.budgetThb, source: "request" };
  }
  return tripBudgetThb && tripBudgetThb > 0 ? { thb: tripBudgetThb, source: "trip" } : null;
}

/**
 * Everything we do to a model's answer before trusting it: unknown slugs are
 * dropped, repeats collapsed, day count clamped, and the cost recomputed from
 * our own estimator rather than believed. Pure, synchronous, and shared by
 * every provider — a new model inherits all of it for free.
 *
 * `days` is the dialog's days field. When the traveller set it, it is the trip
 * length; left as it was, the length the request states wins (`read.days`).
 * Either way a longer answer is cut back to it, never past MAX_DAYS.
 * `travelMode` and `accommodationThb` are the trip settings the planner prices
 * with, so the estimate here is the total the planner shows once the plan is
 * used.
 */
export function validateAiPlan(
  raw: AiTripPlan,
  {
    budgetThb,
    travelers,
    days: requestedDays,
    daysSetByTraveller = true,
    travelDate = null,
    travelMode = "walk",
    accommodationThb = 0,
  }: {
    budgetThb: number | null;
    travelers: number;
    days?: number;
    daysSetByTraveller?: boolean;
    /** The trip's first day: closed days are checked against it, and the day's timing reads its sun times. */
    travelDate?: string | null;
    travelMode?: TravelMode;
    accommodationThb?: number;
  }
): CheckedPlan {
  const droppedSlugs: string[] = [];
  const seen = new Set<string>();
  const read = cleanReading(raw.read);
  const tripDays = !daysSetByTraveller && read.days !== null ? read.days : requestedDays;
  const maxDays = Math.min(MAX_DAYS, tripDays ?? MAX_DAYS);

  const days = raw.days.slice(0, maxDays).map((day) => {
    const slugs: string[] = [];
    for (const slug of day.slugs) {
      if (!getPlaceBySlug(slug)) {
        droppedSlugs.push(slug);
        continue;
      }
      // A repeat across the trip is a model slip, not a request — nobody asks
      // to be routed through the same temple twice.
      if (seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
    return { slugs, note: day.note };
  });

  // A day the model emptied (or filled entirely with invented slugs) would
  // render as a blank column, so drop it rather than show it.
  const keptDays = days.filter((day) => day.slugs.length > 0);

  const party = Math.max(1, travelers);
  const breakdown = categorySpendBreakdown(
    keptDays.map((day) => ({ places: day.slugs.map((slug) => getPlaceBySlug(slug)!) })),
    travelMode
  );
  const estimatedCostThb = estimateTripCostThb(breakdown, party, accommodationThb);
  const budget = planBudget(read, party, budgetThb);

  return {
    read,
    budget,
    understood: raw.understood,
    days: keptDays,
    unmetConstraints: raw.unmetConstraints,
    estimatedCostThb,
    cost: {
      perPersonThb: breakdown.entry + breakdown.food + breakdown.assumedMeals,
      travelers: party,
      transportThb: breakdown.transport,
      travelMode,
      accommodationThb,
    },
    droppedSlugs,
    overBudgetByThb: budget && estimatedCostThb > budget.thb ? estimatedCostThb - budget.thb : null,
    issues: checkPlanDays(planDays(keptDays.map((day) => day.slugs), travelDate)),
  };
}

/** A validated plan before it is known which answer it came from. */
export type CheckedPlan = Omit<ValidatedTripPlan, "provider" | "model" | "repair">;

/** Over budget while unmetConstraints says nothing: the one overrun the prompt forbids. */
function unsaidOverrun(plan: CheckedPlan): { costThb: number; budgetThb: number } | null {
  return plan.budget && plan.overBudgetByThb !== null && plan.unmetConstraints.length === 0
    ? { costThb: plan.estimatedCostThb, budgetThb: plan.budget.thb }
    : null;
}

/** What a fix could put right: the planner's warnings, invented places, an unsaid overrun. */
function problemCount(plan: CheckedPlan): number {
  return plan.issues.length + plan.droppedSlugs.length + (unsaidOverrun(plan) ? 1 : 0);
}

/** Meals the plan's days run through with no food stop, as the planner page finds them. */
function mealGaps(plan: CheckedPlan, travelDate: string | null): number {
  return countMealGaps(planDays(plan.days.map((day) => day.slugs), travelDate));
}

function kindsOf(slugs: string[]): Map<string, number> {
  const kinds = new Map<string, number>();
  for (const slug of slugs) {
    const kind = getPlaceBySlug(slug)!.category;
    kinds.set(kind, (kinds.get(kind) ?? 0) + 1);
  }
  return kinds;
}

/**
 * Whether the fix kept what the first plan was built around. It may drop a
 * stop the planner flagged (closed that day, or reached while shut), and swap
 * any stop for another of the same kind; beyond that it may drop one stop for
 * each day that ran over ten hours. Losing anything else — the café the
 * traveller asked for, the dinner — is how a model clears a warning by
 * cutting the plan, and the first plan is better than that.
 */
function keepsWhatWasAsked(fixed: CheckedPlan, first: CheckedPlan): boolean {
  const flagged = first.issues.flatMap((issue) =>
    issue.type === "closedOnDay" || issue.type === "seasonalClosure" || issue.type === "outsideHours" ? [issue.slug] : []
  );
  const mayDrop = kindsOf([...new Set(flagged)]);
  const before = kindsOf(first.days.flatMap((day) => day.slugs));
  const after = kindsOf(fixed.days.flatMap((day) => day.slugs));
  let lost = 0;
  for (const [kind, count] of before) {
    lost += Math.max(0, count - (after.get(kind) ?? 0) - (mayDrop.get(kind) ?? 0));
  }
  return lost <= first.issues.filter((issue) => issue.type === "longDay").length;
}

/**
 * Whether the fix is the plan to show. It must be strictly better by the
 * planner's own count, meals it leaves uncovered included, and lose nothing
 * on the way: no day, nothing the first plan was built around, and not newly
 * over a budget the first plan fitted.
 */
export function isBetterFix(fixed: CheckedPlan, first: CheckedPlan, travelDate: string | null): boolean {
  if (fixed.days.length < first.days.length) return false;
  if (first.overBudgetByThb === null && fixed.overBudgetByThb !== null) return false;
  if (!keepsWhatWasAsked(fixed, first)) return false;
  return problemCount(fixed) + mealGaps(fixed, travelDate) < problemCount(first) + mealGaps(first, travelDate);
}

export interface PlanOutcome {
  /** What the traveller is shown. */
  plan: ValidatedTripPlan;
  /** The model's answer behind `plan`. */
  raw: AiTripPlan;
  /** The first answer before any fix; the same as `plan` and `raw` unless the fix was used. For the eval. */
  first: { plan: ValidatedTripPlan; raw: AiTripPlan };
  /** The fix the model returned, used or not; null when there was none. For the eval. */
  fix: { plan: ValidatedTripPlan; raw: AiTripPlan } | null;
  /** How long the fix call took, or null when there was none. */
  repairMs: number | null;
  /** Why the fix call failed, when `plan.repair` is "failed". */
  repairError?: unknown;
}

/**
 * Asks the provider for a plan and checks it as the planner page will. When
 * the page would warn about it, the plan and the warnings go to the
 * provider's fixing model once, and the fixed plan is kept only if it is
 * better. Whatever is left is in `plan.issues` for the dialog to show. One
 * fix, never a loop: each adds to the wait, and the free tier counts every
 * call.
 */
export async function planWithProvider(
  provider: TripPlanProvider,
  input: PlanRequestInput,
  {
    signal,
    deadlineMs = PLAN_DEADLINE_MS,
    maxRepairMs = MAX_REPAIR_MS,
    now = Date.now,
  }: GenerateOptions & { deadlineMs?: number; maxRepairMs?: number; now?: () => number } = {}
): Promise<PlanOutcome> {
  const startedAt = now();
  const check = (raw: AiTripPlan) => validateAiPlan(raw, input);
  const shown = (checked: CheckedPlan, answer: GeneratedPlan, repair: RepairOutcome): ValidatedTripPlan => ({
    ...checked,
    repair,
    provider: provider.id,
    model: answer.model,
  });

  const firstAnswer = await provider.generate(input, { signal });
  const firstChecked = check(firstAnswer.plan);
  const firstOnly = (repair: RepairOutcome, repairMs: number | null = null, fix: PlanOutcome["fix"] = null): PlanOutcome => {
    const plan = shown(firstChecked, firstAnswer, repair);
    return { plan, raw: firstAnswer.plan, first: { plan, raw: firstAnswer.plan }, fix, repairMs };
  };

  if (problemCount(firstChecked) === 0) return firstOnly("not_needed");
  const left = deadlineMs - (now() - startedAt);
  if (!provider.repair || left < MIN_REPAIR_MS) return firstOnly("skipped");

  const message = buildRepairMessage({
    plan: firstAnswer.plan,
    issues: firstChecked.issues,
    droppedSlugs: firstChecked.droppedSlugs,
    unsaidOverrun: unsaidOverrun(firstChecked),
  });
  const repairStartedAt = now();
  let fixedAnswer: GeneratedPlan;
  try {
    fixedAnswer = await provider.repair(input, message, { signal, timeoutMs: Math.min(maxRepairMs, left) });
  } catch (err) {
    // A cancel means nobody is waiting; any other failure costs only the fix.
    if (signal?.aborted || (err instanceof AiPlannerError && err.code === "aborted")) throw err;
    console.warn("AI trip planning: the fix pass failed, showing the first plan.", err instanceof Error ? err.message : err);
    return { ...firstOnly("failed", now() - repairStartedAt), repairError: err };
  }
  const repairMs = now() - repairStartedAt;

  const fixedChecked = check(fixedAnswer.plan);
  if (!isBetterFix(fixedChecked, firstChecked, input.travelDate)) {
    return firstOnly("kept", repairMs, { plan: shown(fixedChecked, fixedAnswer, "kept"), raw: fixedAnswer.plan });
  }
  const fix = {
    // Whose places these are: the fixing model returned the whole plan, from the first model's draft.
    plan: { ...shown(fixedChecked, fixedAnswer, "used"), draftModel: firstAnswer.model },
    raw: fixedAnswer.plan,
  };
  return {
    ...fix,
    first: { plan: shown(firstChecked, firstAnswer, "used"), raw: firstAnswer.plan },
    fix,
    repairMs,
  };
}

export async function planTrip(input: PlanRequestInput, options: GenerateOptions = {}): Promise<ValidatedTripPlan> {
  const provider = resolveProvider();
  if (!provider) throw new AiPlannerError("No AI provider is configured", "not_configured");

  const days = Math.min(MAX_DAYS, Math.max(1, Math.round(input.days)));
  const { plan } = await planWithProvider(provider, { ...input, days }, options);
  return plan;
}
