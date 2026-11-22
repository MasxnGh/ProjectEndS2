import * as z from "zod";
import type { TravelMode } from "@/data/types";

// Type-only, so it is erased at build and brings none of provider.ts's
// server-only import chain into the client components that use this type.
import type { ProviderId } from "@/lib/ai/provider";
import type { PlanIssue } from "@/lib/ai/plan-check";

/**
 * What the model is allowed to return. Constrained to place slugs and prose —
 * it never returns times, distances, or totals, because the planner's own
 * scheduler and budget code produce those (see plan-trip.ts). That split is
 * also the safety property: the worst a manipulated prompt can produce is an
 * odd list of real Chiang Mai places.
 */
export const AiTripPlanSchema = z.object({
  // First, so the model reads the request's own numbers before it plans
  // around them. 0 and "none" stand for "not stated": a schema without
  // nullable fields is one every provider's structured output accepts.
  read: z
    .object({
      days: z.number().describe("The trip length in days that the request itself states, or 0 if it states none."),
      budgetThb: z
        .number()
        .describe("The budget amount the request itself states, in THB as written, or 0 if it states none."),
      budgetBasis: z
        .enum(["per_person", "group", "none"])
        .describe(
          "Whether that budget is per person or for the whole group. A budget that does not say is for the group. none when the request states no budget."
        ),
      travelers: z.number().describe("The number of travellers the request itself states, or 0 if it states none."),
    })
    .describe("The numbers the traveller's request states, from their own words only — never copied from the trip settings."),
  understood: z
    .string()
    .describe(
      "One or two sentences restating the request, in the same language the traveller wrote in."
    ),
  days: z
    .array(
      z.object({
        slugs: z
          .array(z.string())
          .describe("Place slugs for this day, in visiting order, copied exactly from the catalogue."),
        note: z
          .string()
          .describe("One sentence on why this day is shaped this way, in the traveller's language."),
      })
    )
    .describe("One entry per day of the trip, in order."),
  unmetConstraints: z
    .array(z.string())
    .describe(
      "Anything asked for that could not be delivered, and why — in the traveller's language. Empty array when everything was satisfied. Never silently drop a constraint."
    ),
});

export type AiTripPlan = z.infer<typeof AiTripPlanSchema>;

/** The numbers a request states, as the model read them; null where it states none. */
export interface RequestReading {
  days: number | null;
  budgetThb: number | null;
  budgetBasis: "per_person" | "group" | null;
  travelers: number | null;
}

/**
 * What the one fix pass did (planWithProvider):
 * - `not_needed`: the planner found nothing to warn about.
 * - `skipped`: it did, but too little time was left or the provider cannot follow up.
 * - `used`: the model fixed it, and the fixed plan is the one shown.
 * - `kept`: the fix was no better, so the first plan is shown.
 * - `failed`: the fix call failed, so the first plan is shown.
 */
export type RepairOutcome = "not_needed" | "skipped" | "used" | "kept" | "failed";

/** A validated plan: every slug is known to exist, and the totals are ours, not the model's. */
export interface ValidatedTripPlan {
  /** Shown back to the traveller, so a misread ("฿1,000 for the group") is caught before the plan is used. */
  read: RequestReading;
  /**
   * The budget this plan is checked against, for the whole party: the
   * request's own figure when it states one (a per-person figure times the
   * trip's travellers), otherwise the trip's. Null when neither has one.
   */
  budget: { thb: number; source: "request" | "trip" } | null;
  understood: string;
  days: { slugs: string[]; note: string }[];
  unmetConstraints: string[];
  /**
   * The trip total the planner page shows once this plan is used: the same
   * `categorySpendBreakdown` + `estimateTripCostThb`, with the trip's travel
   * mode, party size and accommodation — never the model's own arithmetic.
   */
  estimatedCostThb: number;
  /** What `estimatedCostThb` is made of, so the dialog can say which part is per person. */
  cost: {
    /** Stops, named food and unplanned meals for one traveller. */
    perPersonThb: number;
    travelers: number;
    /** For the whole party, at `travelMode`'s rate. */
    transportThb: number;
    travelMode: TravelMode;
    accommodationThb: number;
  };
  /** Slugs the model returned that do not exist. Non-empty means the model drifted. */
  droppedSlugs: string[];
  /**
   * How far `estimatedCostThb` exceeds `budget`, or null when within it.
   * Returned as a number rather than a sentence so the UI renders it in the
   * traveller's language instead of the server guessing.
   */
  overBudgetByThb: number | null;
  /**
   * What the planner page will warn about once the plan is used (closed days,
   * stops timed outside their hours, a day over ten hours), from its own
   * checks. Empty when it will warn about nothing.
   */
  issues: PlanIssue[];
  repair: RepairOutcome;
  /** When the fix is used: the model that wrote the first draft. `model` is then the one that fixed it. */
  draftModel?: string;
  /** Which provider answered, and with which model — reported so plans from
   * different providers can be told apart when comparing them. */
  provider: ProviderId;
  model: string;
}
