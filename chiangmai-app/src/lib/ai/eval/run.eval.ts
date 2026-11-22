import fs from "node:fs";
import path from "node:path";
import { describe, it } from "vitest";
import { AiPlannerError, MAX_DAYS, isBetterFix, planWithProvider, validateAiPlan, type PlanOutcome } from "@/lib/ai/plan-trip";
import type { PlanRequestInput } from "@/lib/ai/prompt";
import type { TripPlanProvider } from "@/lib/ai/provider";
import { createGeminiProvider, type GeminiThinkingLevel, type GeminiUsage } from "@/lib/ai/providers/gemini";
import type { AiTripPlan, ValidatedTripPlan } from "@/lib/ai/schema";
import { EVAL_CASES, type EvalCase } from "./cases";
import { buildReport, type EvalResult, type EvalRun } from "./report";
import { scorePlan } from "./score";

/**
 * Calls Gemini for real, so it never runs with the normal test suite:
 *
 *   npm run eval:ai
 *
 * Optional settings (environment variables):
 *   AI_EVAL_LEVELS       thinking levels to compare, default "minimal,low,medium,high"
 *   AI_EVAL_CASES        comma-separated case ids, default every case
 *   AI_EVAL_REPEAT       runs per case and level, default 1
 *   AI_EVAL_MODEL        Gemini model, default the site's (GEMINI_MODEL or the provider default)
 *   AI_EVAL_GAP_MS       pause between calls, default 4000 (keeps under per-minute limits)
 *   AI_EVAL_LABEL        name for the output folder, default "run"
 *   AI_EVAL_OUT          output root, default ../.redesign/ai-eval (not tracked by git)
 *   AI_EVAL_RESUME       an earlier run's folder (name or path): keep its answers, redo
 *                        only what is missing or failed, with that run's settings
 *                        (AI_EVAL_LEVELS then limits which levels get new calls)
 *   AI_EVAL_REPORT_ONLY  "1" with AI_EVAL_RESUME: rebuild summary.md, call nothing
 *   AI_EVAL_RESCORE      "1" with AI_EVAL_RESUME: validate and score that run's saved
 *                        answers again with the current code, call nothing, and write
 *                        the result to a new "<run>-rescored" folder beside it
 *   AI_EVAL_REFIX        "1" with AI_EVAL_RESUME: put that run's saved first answers
 *                        through today's fix pass, under the site's time limits, and
 *                        write the result to a new "<run>-refix" folder beside it.
 *                        Only the fix calls a model.
 *   AI_EVAL_REPAIR_MODEL the model that fixes, default the site's (GEMINI_REPAIR_MODEL
 *                        or the provider default)
 *
 * Each call is the site's whole request: the first answer, then — when the
 * planner would warn about it — the one fix pass, as planWithProvider does it,
 * with the site's limit on how long the fix may take. Both answers are kept
 * when the fix is used, so the report shows before and after.
 *
 * The free tier allows only a few calls per model per day, so the run stops
 * as soon as Gemini says the daily quota is used up; resume it the next day.
 * results.json is written after every call, so nothing done is lost.
 */

const list = (value: string | undefined) => value?.split(",").map((s) => s.trim()).filter(Boolean);
const OUT_ROOT = process.env.AI_EVAL_OUT || path.resolve(process.cwd(), "../.redesign/ai-eval");
const GAP_MS = Number(process.env.AI_EVAL_GAP_MS ?? 4000);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Gemini's own words for "this model's daily allowance is used up" — retrying today is pointless. */
function isDailyQuota(err: unknown): boolean {
  return err instanceof AiPlannerError && /per day|per_day|PerDay/i.test(err.message);
}

/** How long to wait before retrying, or null when the failure is not worth a retry. */
function retryDelayMs(err: unknown): number | null {
  if (!(err instanceof AiPlannerError) || isDailyQuota(err)) return null;
  // A per-minute limit: wait it out (Gemini says how long; a minute otherwise).
  if (err.code === "quota") return Math.max(5, err.details.retryAfterSeconds ?? 60) * 1000 + 5_000;
  if (err.code === "timeout") return 20_000;
  if (err.code === "upstream" && (err.details.status ?? 0) >= 500) return 20_000;
  return null;
}

/**
 * The request the dialog sends for a case: the trip's date, travel mode and
 * accommodation with it. A days field of 1 stands for one left at its
 * default, the only value a traveller does not have to type.
 */
function requestFor(testCase: EvalCase): PlanRequestInput {
  return {
    ...testCase.input,
    days: Math.min(MAX_DAYS, Math.max(1, Math.round(testCase.input.days))),
    daysSetByTraveller: testCase.input.days !== 1,
    travelDate: testCase.trip.travelDate,
    travelMode: testCase.trip.travelMode,
    accommodationThb: testCase.trip.accommodationThb,
  };
}

/** A saved answer validated again by the current code, keeping what is not the validator's. */
function revalidate(raw: AiTripPlan, saved: ValidatedTripPlan, testCase: EvalCase): ValidatedTripPlan {
  return {
    ...validateAiPlan(raw, requestFor(testCase)),
    repair: saved.repair ?? "not_needed",
    provider: saved.provider,
    model: saved.model,
  };
}

/**
 * Every saved answer scored again, and every saved fix judged again with the
 * current rule for using one; the run's own folder is left as it was.
 */
function rescore(run: EvalRun): EvalRun {
  const results = run.results.map((result): EvalResult => {
    const testCase = EVAL_CASES.find((c) => c.id === result.caseId);
    if (!result.ok || !testCase || !result.raw || !result.plan) return result;

    // The first answer and the fix, whichever of them was shown.
    const firstRaw = result.repair === "used" ? result.firstRaw : result.raw;
    const fixRaw = result.repair === "used" ? result.raw : result.repair === "kept" ? result.fixRaw : undefined;
    const first = revalidate(firstRaw ?? result.raw, result.plan, testCase);
    if (!firstRaw || !fixRaw) return { ...result, plan: first, score: scorePlan(testCase, result.raw, first) };

    const fixed = revalidate(fixRaw, result.plan, testCase);
    const use = isBetterFix(fixed, first, testCase.trip.travelDate);
    const next: EvalResult = { ...result, repair: use ? "used" : "kept" };
    delete next.firstRaw;
    delete next.firstPlan;
    delete next.firstScore;
    delete next.fixRaw;
    if (use) {
      const firstPlan = { ...first, repair: "used" as const };
      Object.assign(next, {
        raw: fixRaw,
        plan: { ...fixed, repair: "used" as const },
        score: scorePlan(testCase, fixRaw, fixed),
        firstRaw,
        firstPlan,
        firstScore: scorePlan(testCase, firstRaw, firstPlan),
      });
    } else {
      Object.assign(next, {
        raw: firstRaw,
        plan: { ...first, repair: "kept" as const },
        score: scorePlan(testCase, firstRaw, first),
        fixRaw,
      });
    }
    return next;
  });
  return { ...run, results, label: `${run.label} (rescored)`, rescoredAt: new Date().toISOString() };
}

/** What planWithProvider returned, written into an eval result. */
function record(result: EvalResult, testCase: EvalCase, outcome: PlanOutcome, fixUsage: GeminiUsage | null): void {
  const { plan, raw } = outcome;
  Object.assign(result, {
    ok: true,
    raw,
    plan,
    score: scorePlan(testCase, raw, plan),
    repair: plan.repair,
    repairMs: outcome.repairMs,
    repairUsage: fixUsage,
  });
  if (plan.repair === "used") {
    Object.assign(result, {
      firstRaw: outcome.first.raw,
      firstPlan: outcome.first.plan,
      firstScore: scorePlan(testCase, outcome.first.raw, outcome.first.plan),
    });
  }
  if (plan.repair === "kept" && outcome.fix) result.fixRaw = outcome.fix.raw;
  if (plan.repair === "failed") {
    const err = outcome.repairError;
    result.repairError =
      err instanceof AiPlannerError ? `${err.code}: ${err.message.slice(0, 500)}` : String(err).slice(0, 500);
  }
}

/**
 * A copy of the run in which every saved first answer goes through today's
 * fix pass, under the site's own time limits: the time the first answer took
 * counts against them, as it would have on the site. Only the fix calls a
 * model; the run's own folder is left as it was.
 */
async function refix(run: EvalRun, outDir: string): Promise<void> {
  const refixDir = `${outDir.replace(/[\\/]+$/, "")}-refix`;
  fs.mkdirSync(refixDir, { recursive: true });
  const next: EvalRun = { ...run, label: `${run.label} (refixed)`, refixedAt: new Date().toISOString(), results: [] };
  delete next.repairModel;
  delete next.rescoredAt;
  delete next.stoppedReason;
  const save = () => {
    fs.writeFileSync(path.join(refixDir, "results.json"), JSON.stringify(next, null, 2));
    fs.writeFileSync(path.join(refixDir, "summary.md"), buildReport(next, EVAL_CASES));
  };

  for (const saved of run.results) {
    const testCase = EVAL_CASES.find((c) => c.id === saved.caseId);
    if (!saved.ok || !testCase || !saved.raw || !saved.plan) {
      next.results.push(saved);
      continue;
    }
    const firstRaw = saved.repair === "used" ? (saved.firstRaw ?? saved.raw) : saved.raw;
    const firstModel = saved.firstPlan?.model ?? saved.plan.model;
    const firstMs = Math.max(0, (saved.latencyMs ?? 0) - (saved.repairMs ?? 0));

    const usages: GeminiUsage[] = [];
    const gemini = createGeminiProvider({
      model: run.model,
      fallbackModels: [],
      repairModel: process.env.AI_EVAL_REPAIR_MODEL,
      onUsage: (u) => usages.push(u),
    });
    // The clock runs on from where the first answer finished, so the fix
    // gets what the site would have left it.
    let offset = 0;
    const replay: TripPlanProvider = {
      ...gemini,
      async generate() {
        offset = firstMs;
        return { plan: firstRaw, model: firstModel };
      },
    };

    const result: EvalResult = { ...saved, attempts: 0 };
    for (const key of ["firstRaw", "firstPlan", "firstScore", "fixRaw", "repairError", "repairUsage"] as const) delete result[key];
    let outcome: PlanOutcome;
    for (;;) {
      result.attempts++;
      usages.length = 0;
      offset = 0;
      outcome = await planWithProvider(replay, requestFor(testCase), { now: () => performance.now() + offset });
      const err = outcome.repairError;
      // A per-minute limit or an overloaded model is the eval's own burst,
      // not the fix: wait and ask again. A time-out is a real result.
      const busy = err instanceof AiPlannerError && !isDailyQuota(err) && (err.code === "quota" || err.code === "upstream");
      const wait = busy ? retryDelayMs(err) : null;
      if (outcome.plan.repair === "failed" && wait !== null && result.attempts < 4) {
        await sleep(wait);
        continue;
      }
      break;
    }
    if (outcome.plan.repair === "failed" && isDailyQuota(outcome.repairError)) {
      next.stoppedReason = `daily quota for the fixing model used up at ${testCase.id} · ${saved.level}`;
      break;
    }
    record(result, testCase, outcome, usages[0] ?? null);
    result.usage = saved.usage;
    result.latencyMs = firstMs + (outcome.repairMs ?? 0);
    if (outcome.fix) next.repairModel ??= outcome.fix.plan.model;
    next.results.push(result);
    save();
    console.log(`${testCase.id} · ${saved.level}: ${outcome.plan.repair}` + (outcome.repairMs !== null ? ` in ${outcome.repairMs} ms` : ""));
    if (outcome.repairMs !== null) await sleep(GAP_MS);
  }

  if (!next.stoppedReason) next.finishedAt = new Date().toISOString();
  save();
  console.log(`\nWrote ${path.join(refixDir, "summary.md")}`);
}

function openRun(): { run: EvalRun; outDir: string } {
  const resume = process.env.AI_EVAL_RESUME;
  if (resume) {
    const outDir = path.isAbsolute(resume) ? resume : path.join(OUT_ROOT, resume);
    const run = JSON.parse(fs.readFileSync(path.join(outDir, "results.json"), "utf8")) as EvalRun;
    // Failed calls are tried again; answered ones are kept as they are.
    run.results = run.results.filter((r) => r.ok);
    delete run.finishedAt;
    delete run.stoppedReason;
    return { run, outDir };
  }

  const label = process.env.AI_EVAL_LABEL || "run";
  const caseFilter = list(process.env.AI_EVAL_CASES);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(OUT_ROOT, `${stamp}-${label}`);
  fs.mkdirSync(outDir, { recursive: true });
  return {
    outDir,
    run: {
      label,
      startedAt: new Date().toISOString(),
      model: createGeminiProvider({ model: process.env.AI_EVAL_MODEL }).model,
      levels: list(process.env.AI_EVAL_LEVELS) ?? ["minimal", "low", "medium", "high"],
      caseIds: EVAL_CASES.filter((c) => !caseFilter || caseFilter.includes(c.id)).map((c) => c.id),
      repeat: Math.max(1, Number(process.env.AI_EVAL_REPEAT) || 1),
      results: [],
    },
  };
}

describe.skipIf(!process.env.GEMINI_API_KEY)("AI planner eval (calls Gemini)", () => {
  it("scores every case at every thinking level", { timeout: 6 * 60 * 60_000 }, async () => {
    const { run, outDir } = openRun();
    const save = () => fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(run, null, 2));
    const writeSummary = () => {
      fs.writeFileSync(path.join(outDir, "summary.md"), buildReport(run, EVAL_CASES));
      console.log(`\nWrote ${path.join(outDir, "summary.md")}`);
    };

    if (process.env.AI_EVAL_RESCORE === "1") {
      const rescoredDir = `${outDir.replace(/[\\/]+$/, "")}-rescored`;
      const rescored = rescore(run);
      fs.mkdirSync(rescoredDir, { recursive: true });
      fs.writeFileSync(path.join(rescoredDir, "results.json"), JSON.stringify(rescored, null, 2));
      fs.writeFileSync(path.join(rescoredDir, "summary.md"), buildReport(rescored, EVAL_CASES));
      console.log(`\nWrote ${path.join(rescoredDir, "summary.md")}`);
      return;
    }

    if (process.env.AI_EVAL_REFIX === "1") {
      await refix(run, outDir);
      return;
    }

    if (process.env.AI_EVAL_REPORT_ONLY === "1") {
      writeSummary();
      return;
    }

    const cases = EVAL_CASES.filter((c) => run.caseIds.includes(c.id));
    // On a resume, AI_EVAL_LEVELS narrows which levels get new calls; the
    // report still lists every level the run started with.
    const callLevels = (process.env.AI_EVAL_RESUME && list(process.env.AI_EVAL_LEVELS)) || run.levels;
    const done = (caseId: string, level: string, repeat: number) =>
      run.results.some((r) => r.ok && r.caseId === caseId && r.level === level && r.repeat === repeat);

    // Levels are interleaved within each case so that a slow patch on
    // Google's side lands on every level alike instead of on one.
    calls: for (let repeat = 1; repeat <= run.repeat; repeat++) {
      for (const testCase of cases) {
        for (const level of callLevels as GeminiThinkingLevel[]) {
          if (done(testCase.id, level, repeat)) continue;

          // First answer, then the fix call when there is one.
          let usages: GeminiUsage[] = [];
          // One model, no fallbacks: the eval measures the model it names.
          const provider = createGeminiProvider({
            model: run.model,
            fallbackModels: [],
            thinkingLevel: level,
            // "high" took up to 78 s in the baseline; the site's 75 s cut-off would cut it short.
            attemptTimeoutMs: 180_000,
            repairModel: process.env.AI_EVAL_REPAIR_MODEL,
            onUsage: (u) => usages.push(u),
          });
          const input = requestFor(testCase);

          const result: EvalResult = { caseId: testCase.id, level, repeat, ok: false, latencyMs: null, attempts: 0, usage: null };
          let quotaGone = false;
          for (;;) {
            result.attempts++;
            usages = [];
            const startedAt = performance.now();
            try {
              // The site's overall limit would cut "high" short, so it is lifted
              // here; the fix keeps the site's own limit.
              const outcome = await planWithProvider(provider, input, { deadlineMs: 10 * 60_000 });
              result.latencyMs = Math.round(performance.now() - startedAt);
              const { plan } = outcome;
              record(result, testCase, outcome, usages[1] ?? null);
              result.usage = usages[0] ?? null;
              if (outcome.fix) run.repairModel ??= outcome.fix.plan.model;
              // A fix lost to the day's quota says nothing about the fix: the
              // case is left unanswered so a resume does it again, whole.
              if (plan.repair === "failed" && isDailyQuota(outcome.repairError)) {
                quotaGone = true;
                Object.assign(result, { ok: false, error: `fix call: ${(outcome.repairError as Error).message.slice(0, 2000)}` });
              }
              break;
            } catch (err) {
              quotaGone = isDailyQuota(err);
              const wait = retryDelayMs(err);
              // A per-minute limit is worth waiting out several times. An
              // overloaded model already got a second try inside the provider,
              // and on the free tier even failed calls can count against the
              // day, so it gets one more round at most.
              const maxAttempts = err instanceof AiPlannerError && err.code === "quota" ? 4 : 2;
              if (wait !== null && result.attempts < maxAttempts) {
                await sleep(wait);
                continue;
              }
              result.error =
                err instanceof AiPlannerError ? `${err.code}: ${err.message.slice(0, 2000)}` : String(err).slice(0, 2000);
              break;
            }
          }

          run.results.push(result);
          save();
          if (quotaGone) {
            run.stoppedReason = `daily quota for ${run.model} used up at ${testCase.id} · ${level}`;
            break calls;
          }
          await sleep(GAP_MS);
        }
      }
    }

    if (!run.stoppedReason) run.finishedAt = new Date().toISOString();
    save();
    writeSummary();
  });
});
