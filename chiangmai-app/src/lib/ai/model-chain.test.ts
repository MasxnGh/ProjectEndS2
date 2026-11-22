import { describe, expect, it } from "vitest";
import { AiPlannerError } from "./provider";
import { parseRetryAfterSeconds, runModelChain, type ModelChainOptions } from "./model-chain";

// A fake clock: each attempt "takes" the time the script says, so deadlines
// can be tested without waiting for them.
function harness(script: Record<string, Array<{ takesMs?: number; fail?: AiPlannerError; answer?: string }>>) {
  let clock = 0;
  const calls: { model: string; timeoutMs: number }[] = [];
  const failures: string[] = [];
  const options: ModelChainOptions = {
    deadlineMs: 105_000,
    attemptTimeoutMs: 75_000,
    minAttemptMs: 20_000,
    retryPauseMs: 1_500,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    onFailure: (model, error) => failures.push(`${model}:${error.code}`),
  };
  const attempt = async (model: string, timeoutMs: number) => {
    calls.push({ model, timeoutMs });
    const step = script[model]?.shift();
    if (!step) throw new Error(`unexpected call to ${model}`);
    clock += step.takesMs ?? 1_000;
    if (step.fail) throw step.fail;
    return step.answer ?? `plan from ${model}`;
  };
  return { options, attempt, calls, failures };
}

const quota = (retryAfterSeconds?: number) =>
  new AiPlannerError("out of quota", "quota", { status: 429, retryAfterSeconds });
const serverError = () => new AiPlannerError("503 overloaded", "upstream", { status: 503 });

describe("runModelChain", () => {
  it("answers with the first model when it works", async () => {
    const h = harness({ a: [{ answer: "A" }] });
    await expect(runModelChain(["a", "b"], h.attempt, h.options)).resolves.toEqual({ value: "A", model: "a" });
    expect(h.calls.map((c) => c.model)).toEqual(["a"]);
  });

  it("moves to the next model when the first is out of quota, and reports who answered", async () => {
    const h = harness({ a: [{ fail: quota(19_000) }], b: [{ answer: "B" }] });
    await expect(runModelChain(["a", "b"], h.attempt, h.options)).resolves.toEqual({ value: "B", model: "b" });
    expect(h.failures).toEqual(["a:quota"]);
  });

  it("retries a model once after a 5xx before moving on", async () => {
    const h = harness({ a: [{ fail: serverError() }, { fail: serverError() }], b: [{ answer: "B" }] });
    await expect(runModelChain(["a", "b"], h.attempt, h.options)).resolves.toMatchObject({ model: "b" });
    expect(h.calls.map((c) => c.model)).toEqual(["a", "a", "b"]);
  });

  it("does not retry the same model after a timeout or a malformed answer", async () => {
    const h = harness({
      a: [{ takesMs: 30_000, fail: new AiPlannerError("slow", "timeout") }],
      b: [{ fail: new AiPlannerError("bad json", "unparseable") }],
      c: [{ answer: "C" }],
    });
    await expect(runModelChain(["a", "b", "c"], h.attempt, h.options)).resolves.toMatchObject({ model: "c" });
    expect(h.calls.map((c) => c.model)).toEqual(["a", "b", "c"]);
  });

  it.each(["refused", "not_configured", "aborted"] as const)("stops at once on %s", async (code) => {
    const h = harness({ a: [{ fail: new AiPlannerError(code, code) }], b: [{ answer: "B" }] });
    await expect(runModelChain(["a", "b"], h.attempt, h.options)).rejects.toMatchObject({ code });
    expect(h.calls.map((c) => c.model)).toEqual(["a"]);
  });

  it("reports quota with the soonest wait when every model is used up", async () => {
    const h = harness({ a: [{ fail: quota(19_000) }], b: [{ fail: quota(40) }], c: [{ fail: quota() }] });
    await expect(runModelChain(["a", "b", "c"], h.attempt, h.options)).rejects.toMatchObject({
      code: "quota",
      details: { retryAfterSeconds: 40 },
    });
  });

  it("is not a quota error when only some models were out of quota", async () => {
    const h = harness({ a: [{ fail: quota(19_000) }], b: [{ fail: new AiPlannerError("400", "upstream", { status: 400 }) }] });
    await expect(runModelChain(["a", "b"], h.attempt, h.options)).rejects.toMatchObject({ code: "upstream" });
  });

  it("gives later models only the time that is left, and stops when too little is", async () => {
    const h = harness({
      a: [{ takesMs: 75_000, fail: new AiPlannerError("slow", "timeout") }],
      b: [{ takesMs: 15_000, fail: quota() }],
      c: [{ answer: "never asked" }],
    });
    await expect(runModelChain(["a", "b", "c"], h.attempt, h.options)).rejects.toMatchObject({ code: "timeout" });
    // a: full 75 s allowance; b: the 30 s left of 105 s; c: 15 s left, under the 20 s minimum.
    expect(h.calls).toEqual([
      { model: "a", timeoutMs: 75_000 },
      { model: "b", timeoutMs: 30_000 },
    ]);
  });

  it("wraps a stray non-planner error instead of losing it", async () => {
    const h = harness({});
    const attempt = async () => {
      throw new TypeError("fetch failed");
    };
    await expect(runModelChain(["a"], attempt, h.options)).rejects.toMatchObject({
      code: "upstream",
      message: expect.stringContaining("fetch failed"),
    });
  });
});

describe("parseRetryAfterSeconds", () => {
  it("reads Gemini's daily-quota wording", () => {
    const body =
      '{"error":{"message":"Rate limit exceeded for model gemini-3.6-flash (limit: 20 requests per day on Free Tier). Please retry in 5h27m33s or upgrade your tier.","code":"too_many_requests"}}';
    expect(parseRetryAfterSeconds(body)).toBe(5 * 3600 + 27 * 60 + 33);
  });

  it("reads a per-minute wait with a fraction", () => {
    expect(parseRetryAfterSeconds("Please retry in 27.5s.")).toBe(28);
  });

  it("does not take milliseconds for minutes", () => {
    expect(parseRetryAfterSeconds("Please retry in 800ms")).toBe(1);
  });

  it("reads the RetryInfo field", () => {
    expect(parseRetryAfterSeconds('{"@type":"type.googleapis.com/google.rpc.RetryInfo","retryDelay": "41s"}')).toBe(41);
  });

  it("returns null when no wait is given", () => {
    expect(parseRetryAfterSeconds("Resource has been exhausted")).toBeNull();
  });
});
