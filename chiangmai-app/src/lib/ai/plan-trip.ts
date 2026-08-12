import "server-only";

import { getPlaceBySlug } from "@/data/places";
import { categorySpendBreakdown, estimateTripCostThb } from "@/lib/trip-calculations";
import type { AiTripPlan, ValidatedTripPlan } from "@/lib/ai/schema";
import type { PlanRequestInput } from "@/lib/ai/prompt";
import { AiPlannerError, type ProviderId, type TripPlanProvider } from "@/lib/ai/provider";
import { geminiProvider } from "@/lib/ai/providers/gemini";
import { anthropicProvider } from "@/lib/ai/providers/anthropic";

export { AiPlannerError };
export const MAX_DAYS = 14;
export const MAX_PROMPT_CHARS = 1000;

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

/**
 * Everything we do to a model's answer before trusting it: unknown slugs are
 * dropped, repeats collapsed, day count clamped, and the cost recomputed from
 * our own estimator rather than believed. Pure, synchronous, and shared by
 * every provider — a new model inherits all of it for free.
 */
export function validateAiPlan(
  raw: AiTripPlan,
  { budgetThb, travelers }: { budgetThb: number | null; travelers: number }
): Omit<ValidatedTripPlan, "provider" | "model"> {
  const droppedSlugs: string[] = [];
  const seen = new Set<string>();

  const days = raw.days.slice(0, MAX_DAYS).map((day) => {
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

  const breakdown = categorySpendBreakdown(
    keptDays.map((day) => ({ places: day.slugs.map((slug) => getPlaceBySlug(slug)!) }))
  );
  const estimatedCostThb = estimateTripCostThb(breakdown, Math.max(1, travelers), 0);

  return {
    understood: raw.understood,
    days: keptDays,
    unmetConstraints: raw.unmetConstraints,
    estimatedCostThb,
    droppedSlugs,
    overBudgetByThb:
      budgetThb && budgetThb > 0 && estimatedCostThb > budgetThb ? estimatedCostThb - budgetThb : null,
  };
}

export async function planTrip(input: PlanRequestInput): Promise<ValidatedTripPlan> {
  const provider = resolveProvider();
  if (!provider) throw new AiPlannerError("No AI provider is configured", "not_configured");

  const days = Math.min(MAX_DAYS, Math.max(1, Math.round(input.days)));
  const raw = await provider.generate({ ...input, days });

  return {
    ...validateAiPlan(raw, { budgetThb: input.budgetThb, travelers: input.travelers }),
    provider: provider.id,
    model: provider.model,
  };
}
