import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  AiPlannerError,
  MAX_DAYS,
  MAX_PROMPT_CHARS,
  isAiPlannerConfigured,
  planTrip,
} from "@/lib/ai/plan-trip";

/**
 * Each call spends a real upstream quota — money on Anthropic, free-tier
 * requests-per-minute on Gemini — so this is limited far more tightly than the
 * read-only routes. The goal is that a runaway client loop costs a few cents or
 * a short cool-down, not a bill or a burnt daily quota.
 */
const RATE_LIMIT = { max: 5, windowMs: 5 * 60_000 };

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  if (!isAiPlannerConfigured()) {
    return Response.json({ error: "The AI planner is not configured on this server" }, { status: 503 });
  }

  const rateLimit = checkRateLimit(`ai:plan-trip:${clientKey(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Too many requests, please slow down" },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { request: prompt, days, travelers, budgetThb } = (body ?? {}) as Record<string, unknown>;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "A trip request is required" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return Response.json(
      { error: `Requests are limited to ${MAX_PROMPT_CHARS} characters` },
      { status: 400 }
    );
  }

  try {
    const plan = await planTrip({
      request: prompt.trim(),
      days: Number.isFinite(days) ? Math.min(MAX_DAYS, Math.max(1, Number(days))) : 1,
      travelers: Number.isFinite(travelers) ? Math.max(1, Number(travelers)) : 1,
      budgetThb: Number.isFinite(budgetThb) && Number(budgetThb) > 0 ? Number(budgetThb) : null,
    });
    return Response.json(plan);
  } catch (err) {
    if (err instanceof AiPlannerError) {
      // "refused" is a normal outcome, not a server fault — the traveller asked
      // for something the model declined, and the UI says so plainly.
      const status = err.code === "refused" ? 422 : err.code === "not_configured" ? 503 : 502;
      // The message can carry a raw upstream error body, which belongs in the
      // server log, not in a response. The client only needs the code — it
      // renders its own wording from that anyway.
      console.error("AI trip planning failed", err.message);
      return Response.json({ code: err.code }, { status });
    }
    console.error("AI trip planning failed", err);
    return Response.json({ error: "Trip planning is temporarily unavailable" }, { status: 502 });
  }
}
