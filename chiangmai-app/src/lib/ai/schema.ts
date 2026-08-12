import * as z from "zod";

// Type-only, so it is erased at build and brings none of provider.ts's
// server-only import chain into the client components that use this type.
import type { ProviderId } from "@/lib/ai/provider";

/**
 * What the model is allowed to return. Constrained to place slugs and prose —
 * it never returns times, distances, or totals, because the planner's own
 * scheduler and budget code produce those (see plan-trip.ts). That split is
 * also the safety property: the worst a manipulated prompt can produce is an
 * odd list of real Chiang Mai places.
 */
export const AiTripPlanSchema = z.object({
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

/** A validated plan: every slug is known to exist, and the totals are ours, not the model's. */
export interface ValidatedTripPlan {
  understood: string;
  days: { slugs: string[]; note: string }[];
  unmetConstraints: string[];
  /** Per-traveller estimate from `categorySpendBreakdown` — the planner's own numbers. */
  estimatedCostThb: number;
  /** Slugs the model returned that do not exist. Non-empty means the model drifted. */
  droppedSlugs: string[];
  /**
   * How far our own estimate exceeds the stated budget, or null when within it.
   * Returned as a number rather than a sentence so the UI renders it in the
   * traveller's language instead of the server guessing.
   */
  overBudgetByThb: number | null;
  /** Which provider answered, and with which model — reported so plans from
   * different providers can be told apart when comparing them. */
  provider: ProviderId;
  model: string;
}
