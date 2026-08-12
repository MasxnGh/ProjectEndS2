import "server-only";

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiTripPlanSchema } from "@/lib/ai/schema";
import { SYSTEM_PROMPT, buildUserMessage, catalogueText, type PlanRequestInput } from "@/lib/ai/prompt";
import { AiPlannerError, type TripPlanProvider } from "@/lib/ai/provider";

const DEFAULT_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

export const anthropicProvider: TripPlanProvider = {
  id: "anthropic",
  model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY);
  },

  async generate(input: PlanRequestInput) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new AiPlannerError("ANTHROPIC_API_KEY is not set", "not_configured");
    client ??= new Anthropic({ apiKey });

    let response;
    try {
      response = await client.beta.messages.create({
        model: this.model,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        // Opus 5's safety classifiers can decline outright; a fallback turns
        // that into an answered request rather than a dead end.
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "high", format: zodOutputFormat(AiTripPlanSchema) },
        system: [
          { type: "text", text: SYSTEM_PROMPT },
          {
            type: "text",
            text: catalogueText(),
            // ~7K stable tokens repeated verbatim every request, so it caches;
            // the volatile request sits after this breakpoint where it cannot
            // invalidate the prefix.
            cache_control: { type: "ephemeral" },
          },
        ],
        messages: [{ role: "user", content: [{ type: "text", text: buildUserMessage(input) }] }],
      });
    } catch (err) {
      throw new AiPlannerError(
        `Anthropic request failed: ${err instanceof Error ? err.message : String(err)}`,
        "upstream"
      );
    }

    // Always before reading content: on a refusal it is empty or partial.
    if (response.stop_reason === "refusal") {
      throw new AiPlannerError("The request was declined by safety classifiers", "refused");
    }

    const text = response.content.find((block) => block.type === "text")?.text;
    if (!text) throw new AiPlannerError("Model returned no text block", "unparseable");

    const parsed = AiTripPlanSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      throw new AiPlannerError(
        `Model output did not match the schema: ${parsed.error.message}`,
        "unparseable"
      );
    }
    return parsed.data;
  },
};
