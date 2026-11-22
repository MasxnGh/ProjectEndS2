import http from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AiTripPlan } from "@/lib/ai/schema";

// The real provider and SDK against a local stand-in for Gemini's API, so the
// timeout, quota and cancel paths run end to end without a network or a key.
// The model name in each request decides how the stand-in answers.

const PLAN: AiTripPlan = {
  read: { days: 0, budgetThb: 0, budgetBasis: "none", travelers: 0 },
  understood: "Half a day of temples.",
  days: [{ slugs: ["wat-phra-singh"], note: "" }],
  unmetConstraints: [],
};

let server: http.Server;
const saved = { base: process.env.GOOGLE_GEMINI_BASE_URL, key: process.env.GEMINI_API_KEY };
const calls: string[] = [];
interface SentBody {
  model: string;
  input: string;
  previous_interaction_id?: string;
  system_instruction?: string;
  response_format?: unknown;
}
const bodies: SentBody[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const sent = JSON.parse(body) as SentBody;
      const model = sent.model;
      calls.push(model);
      bodies.push(sent);
      if (model.startsWith("hang")) return; // never answers
      if (model.startsWith("quota")) {
        res.writeHead(429, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message: `Rate limit exceeded for model ${model} (limit: 20 requests per day on Free Tier). Please retry in 4h27m9s.`,
              code: "too_many_requests",
            },
          })
        );
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "i-1",
          status: "completed",
          steps: [{ type: "model_output", content: [{ type: "text", text: JSON.stringify(PLAN) }] }],
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  process.env.GOOGLE_GEMINI_BASE_URL = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  process.env.GEMINI_API_KEY = "test-key";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterAll(() => {
  server.closeAllConnections();
  server.close();
  for (const [name, value] of [["GOOGLE_GEMINI_BASE_URL", saved.base], ["GEMINI_API_KEY", saved.key]] as const) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
  vi.restoreAllMocks();
});

const INPUT = {
  request: "temples",
  days: 1,
  daysSetByTraveller: true,
  travelDate: null,
  travelers: 1,
  budgetThb: null,
  travelMode: "walk" as const,
  accommodationThb: 0,
};

async function provider(model: string, fallbackModels: string[], repairModel = "ok-fixer") {
  const { createGeminiProvider } = await import("./gemini");
  return createGeminiProvider({ model, fallbackModels, repairModel, attemptTimeoutMs: 1_000 });
}

describe("gemini provider", () => {
  it("moves past a model that is out of quota and says which model answered", async () => {
    calls.length = 0;
    const result = await (await provider("quota-a", ["ok-b"])).generate(INPUT);
    expect(result.model).toBe("ok-b");
    expect(result.plan.days[0].slugs).toEqual(["wat-phra-singh"]);
    expect(calls).toEqual(["quota-a", "ok-b"]);
  });

  it("reports quota, with Gemini's wait, when every model is out of it", async () => {
    await expect((await provider("quota-a", ["quota-b"])).generate(INPUT)).rejects.toMatchObject({
      code: "quota",
      details: { retryAfterSeconds: 4 * 3600 + 27 * 60 + 9 },
    });
  });

  it("gives up on a model that never answers at its own deadline, then tries the next", async () => {
    calls.length = 0;
    const started = Date.now();
    const result = await (await provider("hang-a", ["ok-b"])).generate(INPUT);
    expect(result.model).toBe("ok-b");
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("stops at once when the caller cancels", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);
    const started = Date.now();
    await expect(
      (await provider("hang-a", ["ok-b"])).generate(INPUT, { signal: controller.signal })
    ).rejects.toMatchObject({ code: "aborted" });
    expect(Date.now() - started).toBeLessThan(900);
  });

  it("sends the fix to the fixing model as a fresh call: the first call's text, then the message", async () => {
    const gemini = await provider("quota-a", ["ok-b"]);
    bodies.length = 0;
    await gemini.generate(INPUT);
    const firstText = bodies.at(-1)!.input;
    bodies.length = 0;
    const fixed = await gemini.repair!(INPUT, "Day 1: fix this.", { timeoutMs: 1_000 });

    expect(bodies).toHaveLength(1);
    expect(bodies[0].model).toBe("ok-fixer");
    expect(bodies[0].previous_interaction_id).toBeUndefined();
    // The catalogue and the request as the first model had them, so the fixing model has the same facts.
    expect(bodies[0].input).toBe(`${firstText}\n\n---\n\nDay 1: fix this.`);
    // Same rules and the same answer shape as the first call.
    expect(bodies[0].system_instruction).toContain("You plan one-to-many-day trips");
    expect(bodies[0].response_format).toBeDefined();
    expect(fixed).toEqual({ plan: PLAN, model: "ok-fixer" });
  });

  it("has no fix when the fixing model is set to none", async () => {
    expect((await provider("ok-a", [], "none")).repair).toBeUndefined();
  });

  it("gives up on a fix that never answers at its time limit", async () => {
    const gemini = await provider("ok-a", [], "hang-fixer");
    const started = Date.now();
    await expect(gemini.repair!(INPUT, "fix", { timeoutMs: 300 })).rejects.toMatchObject({ code: "timeout" });
    expect(Date.now() - started).toBeLessThan(900);
  });
});
