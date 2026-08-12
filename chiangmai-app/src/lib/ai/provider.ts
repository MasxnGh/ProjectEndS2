import type { AiTripPlan } from "@/lib/ai/schema";
import type { PlanRequestInput } from "@/lib/ai/prompt";

export type ProviderId = "gemini" | "anthropic";

export class AiPlannerError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "refused" | "unparseable" | "upstream"
  ) {
    super(message);
    this.name = "AiPlannerError";
  }
}

/**
 * A provider's whole job is to turn a request into an unvalidated `AiTripPlan`.
 * Everything after that — dropping invented slugs, clamping the day count,
 * recomputing the cost — is provider-agnostic and lives in plan-trip.ts, so a
 * new provider inherits every guarantee without re-implementing any of them.
 */
export interface TripPlanProvider {
  readonly id: ProviderId;
  /** The model actually used, for display and for the case-study comparison. */
  readonly model: string;
  isConfigured(): boolean;
  generate(input: PlanRequestInput): Promise<AiTripPlan>;
}
