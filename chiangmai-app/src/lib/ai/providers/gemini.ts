import "server-only";

import { GoogleGenAI } from "@google/genai";
import * as z from "zod";
import { AiTripPlanSchema } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserMessage, catalogueText, type PlanRequestInput } from "@/lib/ai/prompt";
import { AiPlannerError, type TripPlanProvider } from "@/lib/ai/provider";

/**
 * Free on Google's free tier — input, output (thinking tokens included) and
 * context caching all cost nothing there, which is the reason this is the
 * default provider. Override with GEMINI_MODEL if a different model suits.
 */
const DEFAULT_MODEL = "gemini-3.6-flash";

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

let client: GoogleGenAI | null = null;

export const geminiProvider: TripPlanProvider = {
  id: "gemini",
  model: process.env.GEMINI_MODEL || DEFAULT_MODEL,

  isConfigured() {
    return Boolean(process.env.GEMINI_API_KEY);
  },

  async generate(input: PlanRequestInput) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new AiPlannerError("GEMINI_API_KEY is not set", "not_configured");
    client ??= new GoogleGenAI({ apiKey });

    let interaction;
    try {
      interaction = await client.interactions.create({
        model: this.model,
        system_instruction: SYSTEM_PROMPT,
        // Catalogue first, request second: the stable half leads so Gemini's
        // implicit prefix caching has something to hit on repeat requests.
        input: `${catalogueText()}\n\n---\n\n${buildUserMessage(input)}`,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: RESPONSE_SCHEMA,
        },
        generation_config: { thinking_level: "high" },
      });
    } catch (err) {
      throw new AiPlannerError(`Gemini request failed: ${describeError(err)}`, "upstream");
    }

    const text = interaction.output_text;
    if (!text) {
      // Gemini returns an empty output rather than an error when a safety
      // filter blocks the response, so this doubles as the refusal path.
      throw new AiPlannerError("Gemini returned no output", "refused");
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(text);
    } catch {
      throw new AiPlannerError("Gemini output was not valid JSON", "unparseable");
    }

    const parsed = AiTripPlanSchema.safeParse(parsedJson);
    if (!parsed.success) {
      throw new AiPlannerError(
        `Gemini output did not match the schema: ${parsed.error.message}`,
        "unparseable"
      );
    }
    return parsed.data;
  },
};
