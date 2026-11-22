import type { AiTripPlan } from "@/lib/ai/schema";
import type { PlanRequestInput } from "@/lib/ai/prompt";

export type ProviderId = "gemini" | "anthropic";

/**
 * - `quota`: the model's allowance is used up (Gemini's free tier counts
 *   requests per day and per minute); `retryAfterSeconds` says when it frees up.
 * - `timeout`: the model took longer than the request may wait.
 * - `aborted`: the traveller cancelled, so nobody is waiting for an answer.
 */
export type AiPlannerErrorCode =
  | "not_configured"
  | "refused"
  | "unparseable"
  | "upstream"
  | "quota"
  | "timeout"
  | "aborted";

export interface AiPlannerErrorDetails {
  /** HTTP status from the model's API, when there was one. */
  status?: number;
  /** From Gemini's "Please retry in 5h27m33s"; only set for `quota`. */
  retryAfterSeconds?: number;
}

export class AiPlannerError extends Error {
  constructor(
    message: string,
    readonly code: AiPlannerErrorCode,
    readonly details: AiPlannerErrorDetails = {}
  ) {
    super(message);
    this.name = "AiPlannerError";
  }
}

export interface GenerateOptions {
  /** Aborts the model call, e.g. when the traveller closes the dialog. */
  signal?: AbortSignal;
}

export interface GeneratedPlan {
  plan: AiTripPlan;
  /** The model that answered — with a fallback chain, not always the first one tried. */
  model: string;
}

export interface RepairOptions extends GenerateOptions {
  /** How long the fix may take: whatever is left of the request's time. */
  timeoutMs: number;
}

/**
 * A provider's whole job is to turn a request into an unvalidated `AiTripPlan`.
 * Everything after that — dropping invented slugs, clamping the day count,
 * recomputing the cost — is provider-agnostic and lives in plan-trip.ts, so a
 * new provider inherits every guarantee without re-implementing any of them.
 */
export interface TripPlanProvider {
  readonly id: ProviderId;
  /** The model tried first, for display and for the case-study comparison. */
  readonly model: string;
  isConfigured(): boolean;
  generate(input: PlanRequestInput, options?: GenerateOptions): Promise<GeneratedPlan>;
  /**
   * One corrected plan: the request again, with `message` (the first plan and
   * the planner's findings on it) after it. The provider picks the model —
   * one fast enough to answer while the traveller is still waiting. Optional:
   * a provider without it shows its first plan with the warnings.
   */
  repair?(input: PlanRequestInput, message: string, options: RepairOptions): Promise<GeneratedPlan>;
}
