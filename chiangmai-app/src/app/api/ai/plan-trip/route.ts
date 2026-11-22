import type { NextRequest } from "next/server";
import type { TravelMode } from "@/data/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { TRAVEL_MODES } from "@/lib/planner/vehicle-comparison";
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

/**
 * A Gemini answer takes 20–70 s, and a fallback model may need another go
 * after the first one fails; the provider gives up at 105 s. Without this the
 * platform's default limit could cut a slow answer off mid-way.
 */
export const maxDuration = 120;

function clientKey(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

export async function POST(request: NextRequest) {
  if (!isAiPlannerConfigured()) {
    return Response.json({ error: "The AI planner is not configured on this server" }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    request: prompt,
    days,
    daysSetByTraveller,
    travelDate,
    travelers,
    budgetThb,
    travelMode,
    accommodationThb,
  } = (body ?? {}) as Record<string, unknown>;

  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    return Response.json({ error: "A trip request is required" }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return Response.json(
      { error: `Requests are limited to ${MAX_PROMPT_CHARS} characters` },
      { status: 400 }
    );
  }

  // Counted only once the request is one we would actually send on: a typo
  // that fails validation should not use up the traveller's allowance.
  const rateLimit = checkRateLimit(`ai:plan-trip:${clientKey(request)}`, RATE_LIMIT);
  if (!rateLimit.allowed) {
    const retryAfterSeconds = Math.ceil(rateLimit.retryAfterMs / 1000);
    return Response.json(
      { code: "rate_limited", retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } }
    );
  }

  try {
    const plan = await planTrip(
      {
        request: prompt.trim(),
        days: Number.isFinite(days) ? Math.min(MAX_DAYS, Math.max(1, Number(days))) : 1,
        // Only an explicit false lets the request's own length win; a client
        // that does not send it keeps the days field in charge, as before.
        daysSetByTraveller: daysSetByTraveller !== false,
        travelDate: isIsoDate(travelDate) ? travelDate : null,
        travelers: Number.isFinite(travelers) ? Math.max(1, Number(travelers)) : 1,
        budgetThb: Number.isFinite(budgetThb) && Number(budgetThb) > 0 ? Number(budgetThb) : null,
        // The trip settings the planner prices with; missing or unknown values
        // fall back to the planner's own defaults (walking, no accommodation).
        travelMode: TRAVEL_MODES.includes(travelMode as TravelMode) ? (travelMode as TravelMode) : "walk",
        accommodationThb:
          Number.isFinite(accommodationThb) && Number(accommodationThb) > 0 ? Number(accommodationThb) : 0,
      },
      // Closing the dialog aborts the fetch; this stops the model chain too,
      // so a cancelled request does not go on to spend a fallback model's quota.
      { signal: request.signal }
    );
    return Response.json(plan);
  } catch (err) {
    if (err instanceof AiPlannerError) {
      // The traveller closed the dialog; nobody reads this response.
      if (err.code === "aborted") return new Response(null, { status: 499 });
      // The message can carry a raw upstream error body, which belongs in the
      // server log, not in a response. The client only needs the code — it
      // renders its own wording from that anyway.
      console.error("AI trip planning failed", err.message);
      const { status, retryAfterSeconds } = errorResponse(err);
      return Response.json(
        retryAfterSeconds === undefined ? { code: err.code } : { code: err.code, retryAfterSeconds },
        { status, headers: retryAfterSeconds === undefined ? undefined : { "Retry-After": String(retryAfterSeconds) } }
      );
    }
    console.error("AI trip planning failed", err);
    return Response.json({ error: "Trip planning is temporarily unavailable" }, { status: 502 });
  }
}

/** A real calendar day as "YYYY-MM-DD" — the trip store's format. Anything else is treated as no date. */
function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function errorResponse(err: AiPlannerError): { status: number; retryAfterSeconds?: number } {
  switch (err.code) {
    // A normal outcome, not a server fault — the traveller asked for something
    // the model declined, and the UI says so plainly.
    case "refused":
      return { status: 422 };
    case "not_configured":
      return { status: 503 };
    // Every model's allowance is used up; the UI says when it frees up.
    case "quota":
      return { status: 503, retryAfterSeconds: err.details.retryAfterSeconds };
    case "timeout":
      return { status: 504 };
    default:
      return { status: 502 };
  }
}
