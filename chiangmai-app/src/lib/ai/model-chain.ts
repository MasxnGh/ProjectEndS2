import { AiPlannerError } from "@/lib/ai/provider";

/**
 * Tries models in order until one answers. Gemini's free tier counts requests
 * per model, so when the first model's daily allowance is gone the next one
 * usually still has its own. Kept free of any SDK so the rules below can be
 * tested without calling a model.
 *
 * - Quota used up, a timeout, a malformed answer, any other API error: next model.
 * - A 5xx (Google's side overloaded): one more try on the same model first.
 * - Refused, not configured, cancelled: stop — another model will not change that.
 * - The whole chain shares one deadline, so a slow first model leaves the next
 *   one less time instead of the request running past the route's limit.
 */
export interface ModelChainOptions {
  /** Total time for every attempt together. */
  deadlineMs: number;
  /** Longest a single attempt may take. */
  attemptTimeoutMs: number;
  /** Below this much time left, starting another attempt is pointless. */
  minAttemptMs: number;
  /** Pause before retrying a model that returned a 5xx. */
  retryPauseMs: number;
  /** Called for every failed attempt that the chain moves past, for the server log. */
  onFailure?: (model: string, error: AiPlannerError) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const STOP_CODES = new Set<AiPlannerError["code"]>(["refused", "not_configured", "aborted"]);

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isServerError = (error: AiPlannerError) =>
  error.code === "upstream" && error.details.status !== undefined && error.details.status >= 500;

export async function runModelChain<T>(
  models: string[],
  attempt: (model: string, timeoutMs: number) => Promise<T>,
  options: ModelChainOptions
): Promise<{ value: T; model: string }> {
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const deadline = now() + options.deadlineMs;
  const failures: AiPlannerError[] = [];
  let ranOutOfTime = false;

  chain: for (const model of models) {
    for (let tryNumber = 1; tryNumber <= 2; tryNumber++) {
      const left = deadline - now();
      if (left < options.minAttemptMs) {
        ranOutOfTime = true;
        break chain;
      }
      try {
        return { value: await attempt(model, Math.min(options.attemptTimeoutMs, left)), model };
      } catch (err) {
        const failure = err instanceof AiPlannerError ? err : new AiPlannerError(String(err), "upstream");
        if (STOP_CODES.has(failure.code)) throw failure;
        failures.push(failure);
        options.onFailure?.(model, failure);
        if (tryNumber === 1 && isServerError(failure)) {
          await sleep(options.retryPauseMs);
          continue;
        }
        break;
      }
    }
  }

  throw summariseFailures(failures, ranOutOfTime);
}

/** One error for the route to answer with, carrying every attempt's reason for the log. */
function summariseFailures(failures: AiPlannerError[], ranOutOfTime: boolean): AiPlannerError {
  const log = failures.map((f) => f.message).join(" | ") || "no attempt was made";

  if (failures.length > 0 && failures.every((f) => f.code === "quota")) {
    // The soonest any model frees up is when the traveller can try again.
    const waits = failures.map((f) => f.details.retryAfterSeconds).filter((s): s is number => s !== undefined);
    return new AiPlannerError(`Every model is out of quota: ${log}`, "quota", {
      status: 429,
      retryAfterSeconds: waits.length ? Math.min(...waits) : undefined,
    });
  }
  const last = failures.at(-1);
  if (ranOutOfTime || last?.code === "timeout") {
    return new AiPlannerError(`No model answered in time: ${log}`, "timeout");
  }
  return new AiPlannerError(`Every model failed: ${log}`, last?.code ?? "upstream", { status: last?.details.status });
}

/**
 * Seconds until a Gemini quota frees up, read from its error text: either the
 * prose "Please retry in 5h27m33s" / "retry in 27.5s" or the RetryInfo field
 * `"retryDelay": "27s"`. Null when the text gives no wait.
 */
export function parseRetryAfterSeconds(text: string): number | null {
  const prose = /retry in ((?:\d+(?:\.\d+)?\s*(?:ms|[hms])\s*)+)/i.exec(text);
  if (prose) {
    let seconds = 0;
    const perUnit: Record<string, number> = { h: 3600, m: 60, s: 1, ms: 0.001 };
    for (const [, amount, unit] of prose[1].matchAll(/(\d+(?:\.\d+)?)\s*(ms|[hms])/gi)) {
      seconds += Number(amount) * perUnit[unit.toLowerCase()];
    }
    return Math.ceil(seconds);
  }
  const field = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(text);
  return field ? Math.ceil(Number(field[1])) : null;
}
