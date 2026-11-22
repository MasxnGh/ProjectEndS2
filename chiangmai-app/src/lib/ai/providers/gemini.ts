import "server-only";

import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { AiTripPlanSchema, type AiTripPlan } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserMessage, catalogueText, type PlanRequestInput } from "@/lib/ai/prompt";
import {
  AiPlannerError,
  type GeneratedPlan,
  type GenerateOptions,
  type RepairOptions,
  type TripPlanProvider,
} from "@/lib/ai/provider";
import { parseRetryAfterSeconds, runModelChain } from "@/lib/ai/model-chain";

/**
 * Free on Google's free tier — input, output (thinking tokens included) and
 * context caching all cost nothing there, which is the reason this is the
 * default provider. Override with GEMINI_MODEL if a different model suits.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";

/**
 * Tried in order when the model before them fails — mostly when its free-tier
 * allowance for the day is used up. Override with GEMINI_FALLBACK_MODELS
 * (comma-separated; "none" for no fallback).
 *
 * Chosen from the eval of 2026-11-21 (.redesign/ai-eval, fallback-* runs, all
 * at "low"): both answered 12/12 cases in 5–17 s, with fewer checks passed
 * than gemini-3.6-flash (75 and 73 of 98 against 82) — a weaker plan, but a
 * plan, where the alternative is an error. 3.1-flash-lite first because it
 * invented no places; 3.5-flash-lite named three that don't exist (the
 * validator drops them). Not used: gemini-3.5-flash draws on gemini-3.6-flash's
 * own daily allowance (its 429 names 3.6), so it fails at the same moment;
 * 3.7-flash and 3.8-flash answered "high demand" to almost every call that day;
 * gemini-2.5-flash is closed to new users.
 */
const DEFAULT_FALLBACK_MODELS: string[] = ["gemini-3.1-flash-lite", "gemini-3.5-flash-lite"];

/**
 * The model that fixes a plan the planner found problems in. Not the one that
 * wrote it: in the eval of 2026-11-21 night, gemini-3.6-flash took 61–180 s
 * to return a fix (a real request through the site waited 97 s and the fix
 * still timed out), while gemini-3.1-flash-lite took 5–16 s. The fix is only
 * used when the planner finds it better, so a weaker model can only help.
 * Override with GEMINI_REPAIR_MODEL ("none" turns the fix off).
 */
const DEFAULT_REPAIR_MODEL = "gemini-3.1-flash-lite";

/**
 * "low" answered as well as "medium" and in three quarters of the time in the
 * eval of 2026-11-21 (.redesign/ai-eval, baseline run); "high" took over a
 * minute a request. Override with GEMINI_THINKING_LEVEL.
 */
const DEFAULT_THINKING_LEVEL: GeminiThinkingLevel = "low";

/** One model may take this long; the slowest "low" answer in the eval took 68 s. */
const ATTEMPT_TIMEOUT_MS = 75_000;
/** Every model together. The route's maxDuration (120 s) leaves room above this. */
const CHAIN_DEADLINE_MS = 105_000;
/** Less time than this left is not enough for another model to answer. */
const MIN_ATTEMPT_MS = 20_000;
const RETRY_PAUSE_MS = 1_500;

/**
 * Gemini accepts a JSON Schema but not the full draft-2020-12 vocabulary that
 * `z.toJSONSchema` emits. Strip the keywords it has no use for rather than
 * hand-maintaining a second copy of the schema that could drift from the zod
 * one we validate against.
 */
function toGeminiSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toGeminiSchema);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([key]) => key !== "$schema" && key !== "additionalProperties")
        .map(([key, val]) => [key, toGeminiSchema(val)])
    );
  }
  return value;
}

const RESPONSE_SCHEMA = toGeminiSchema(z.toJSONSchema(AiTripPlanSchema)) as Record<string, unknown>;

/**
 * The SDK's `message` for an HTTP failure is a placeholder — the actual reason
 * ("API key not valid", a quota name, a schema complaint) is only in `body`.
 * Without this, a misconfigured deployment logs a 400 with nothing to act on.
 */
function describeError(err: unknown): string {
  const body = (err as { body?: unknown })?.body;
  if (typeof body === "string" && body.trim()) return body.trim();
  return err instanceof Error ? err.message : String(err);
}

function toPlannerError(
  err: unknown,
  model: string,
  { timedOut, cancelled }: { timedOut: boolean; cancelled: boolean }
): AiPlannerError {
  if (cancelled) return new AiPlannerError(`Gemini ${model}: cancelled by the client`, "aborted");
  if (timedOut) return new AiPlannerError(`Gemini ${model}: no answer within the time limit`, "timeout");

  const status = (err as { status?: unknown })?.status;
  const reason = describeError(err);
  if (status === 429 || /RESOURCE_EXHAUSTED|too_many_requests/i.test(reason)) {
    return new AiPlannerError(`Gemini ${model} is out of quota: ${reason}`, "quota", {
      status: 429,
      retryAfterSeconds: parseRetryAfterSeconds(reason) ?? undefined,
    });
  }
  return new AiPlannerError(`Gemini request to ${model} failed: ${reason}`, "upstream", {
    status: typeof status === "number" ? status : undefined,
  });
}

let client: GoogleGenAI | null = null;

export type GeminiThinkingLevel = "minimal" | "low" | "medium" | "high";
const THINKING_LEVELS: readonly GeminiThinkingLevel[] = ["minimal", "low", "medium", "high"];

/** Token counts Gemini reports for one call — read by the eval to compare thinking levels. */
export interface GeminiUsage {
  inputTokens: number | null;
  cachedTokens: number | null;
  outputTokens: number | null;
  thoughtTokens: number | null;
}

export interface GeminiProviderOptions {
  /** The model tried first. Default GEMINI_MODEL, else gemini-3.6-flash. */
  model?: string;
  /** Tried in order after the first fails. Default GEMINI_FALLBACK_MODELS; [] for none. */
  fallbackModels?: string[];
  /** How long the model may think before answering. Default GEMINI_THINKING_LEVEL, else "low". */
  thinkingLevel?: GeminiThinkingLevel;
  /** Called after every successful call with the usage Gemini reported. */
  onUsage?: (usage: GeminiUsage, model: string) => void;
  /** Longest one model may take; default 75 s. The eval raises it for "high", which takes longer. */
  attemptTimeoutMs?: number;
  /** The model that fixes a plan. Default GEMINI_REPAIR_MODEL, else gemini-3.1-flash-lite; "none" for no fix. */
  repairModel?: string;
}

const modelList = (value: string | undefined) =>
  value?.trim().toLowerCase() === "none"
    ? []
    : value?.split(",").map((s) => s.trim()).filter(Boolean);

function envThinkingLevel(): GeminiThinkingLevel | undefined {
  const value = process.env.GEMINI_THINKING_LEVEL?.trim().toLowerCase();
  return THINKING_LEVELS.find((level) => level === value);
}

/**
 * The site uses `geminiProvider` below. The factory exists so the eval
 * (src/lib/ai/eval) can run the exact same request on one model at a chosen
 * thinking level, without a second copy of the prompt or schema.
 */
export function createGeminiProvider(options: GeminiProviderOptions = {}): TripPlanProvider {
  const model = options.model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const fallbacks = options.fallbackModels ?? modelList(process.env.GEMINI_FALLBACK_MODELS) ?? DEFAULT_FALLBACK_MODELS;
  const models = [...new Set([model, ...fallbacks])];
  const thinkingLevel = options.thinkingLevel ?? envThinkingLevel() ?? DEFAULT_THINKING_LEVEL;
  const attemptTimeout = options.attemptTimeoutMs ?? ATTEMPT_TIMEOUT_MS;
  const repairModel = options.repairModel || process.env.GEMINI_REPAIR_MODEL?.trim() || DEFAULT_REPAIR_MODEL;

  async function callModel(
    modelId: string,
    input: string,
    timeoutMs: number,
    signal: AbortSignal | undefined
  ): Promise<AiTripPlan> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AiPlannerError("GEMINI_API_KEY is not set", "not_configured");
    client ??= new GoogleGenAI({ apiKey });

    // The SDK honours an abort signal in every test we could set up, yet one
    // live call on 2026-11-21 ran 154 s past a 75 s signal. Racing our own
    // timer makes the cut-off ours: at the deadline (or the traveller's
    // cancel) the chain moves on whether or not the SDK has let go, and the
    // signal still cancels the HTTP request wherever the SDK passes it on.
    const timeout = new AbortController();
    let timedOut = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cutOff = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        timeout.abort();
        reject(new Error("timed out"));
      }, timeoutMs);
      signal?.addEventListener("abort", () => reject(new Error("cancelled")), { once: true });
    });

    let interaction;
    try {
      const call = client.interactions.create(
        {
          model: modelId,
          system_instruction: SYSTEM_PROMPT,
          input,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: RESPONSE_SCHEMA,
          },
          generation_config: { thinking_level: thinkingLevel },
        },
        {
          // The chain decides what to retry and where. The SDK's own retries
          // (four, on a 429 too) would spend the whole time budget waiting on
          // a model whose daily allowance is already gone.
          retries: { strategy: "none" },
          signal: signal ? AbortSignal.any([signal, timeout.signal]) : timeout.signal,
        }
      );
      interaction = await Promise.race([call, cutOff]);
    } catch (err) {
      throw toPlannerError(err, modelId, { timedOut, cancelled: signal?.aborted ?? false });
    } finally {
      clearTimeout(timer);
    }

    options.onUsage?.(
      {
        inputTokens: interaction.usage?.total_input_tokens ?? null,
        cachedTokens: interaction.usage?.total_cached_tokens ?? null,
        outputTokens: interaction.usage?.total_output_tokens ?? null,
        thoughtTokens: interaction.usage?.total_thought_tokens ?? null,
      },
      modelId
    );

    return parseGeminiOutput(interaction.output_text, modelId);
  }

  // Catalogue first, request second: the stable half leads so Gemini's
  // implicit prefix caching has something to hit on repeat requests.
  const requestText = (input: PlanRequestInput) => `${catalogueText()}\n\n---\n\n${buildUserMessage(input)}`;

  // One try: a failed fix costs nothing, the first plan stands. A fresh
  // call rather than a follow-up of the first, so it works whichever model
  // of the chain wrote that plan.
  async function repair(
    input: PlanRequestInput,
    message: string,
    { signal, timeoutMs }: RepairOptions
  ): Promise<GeneratedPlan> {
    const plan = await callModel(repairModel, `${requestText(input)}\n\n---\n\n${message}`, timeoutMs, signal);
    return { plan, model: repairModel };
  }

  return {
    id: "gemini",
    model,

    isConfigured() {
      return Boolean(process.env.GEMINI_API_KEY);
    },

    async generate(input: PlanRequestInput, { signal }: GenerateOptions = {}) {
      const text = requestText(input);
      const { value, model: answeredBy } = await runModelChain(
        models,
        (modelId, timeoutMs) => callModel(modelId, text, timeoutMs, signal),
        {
          deadlineMs: Math.max(CHAIN_DEADLINE_MS, attemptTimeout),
          attemptTimeoutMs: attemptTimeout,
          minAttemptMs: MIN_ATTEMPT_MS,
          retryPauseMs: RETRY_PAUSE_MS,
          onFailure: (modelId, error) => console.warn(`AI trip planning: ${modelId} failed (${error.code})`, error.message),
        }
      );
      return { plan: value, model: answeredBy };
    },

    ...(repairModel.toLowerCase() === "none" ? {} : { repair }),
  };
}

export const geminiProvider: TripPlanProvider = createGeminiProvider();

function parseGeminiOutput(text: string | undefined, model: string): AiTripPlan {
  if (!text) {
    // Gemini returns an empty output rather than an error when a safety
    // filter blocks the response, so this doubles as the refusal path.
    throw new AiPlannerError(`Gemini ${model} returned no output`, "refused");
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(text);
  } catch {
    throw new AiPlannerError(`Gemini ${model} output was not valid JSON`, "unparseable");
  }

  const parsed = AiTripPlanSchema.safeParse(parsedJson);
  if (!parsed.success) {
    throw new AiPlannerError(
      `Gemini ${model} output did not match the schema: ${parsed.error.message}`,
      "unparseable"
    );
  }
  return parsed.data;
}
