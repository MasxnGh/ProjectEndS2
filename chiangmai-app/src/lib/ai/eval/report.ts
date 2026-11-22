import type { AiTripPlan, RepairOutcome, ValidatedTripPlan } from "@/lib/ai/schema";
import type { GeminiUsage } from "@/lib/ai/providers/gemini";
import type { EvalCase } from "./cases";
import { CHECK_IDS, type CheckId, type PlanScore } from "./score";

const REPAIR_OUTCOMES: RepairOutcome[] = ["not_needed", "skipped", "used", "kept", "failed"];

export interface EvalResult {
  caseId: string;
  level: string;
  repeat: number;
  ok: boolean;
  /** AiPlannerError code and message when the call failed. */
  error?: string;
  latencyMs: number | null;
  /** 1 unless the call was retried after a rate limit or an overloaded model. */
  attempts: number;
  usage: GeminiUsage | null;
  raw?: AiTripPlan;
  plan?: ValidatedTripPlan;
  score?: PlanScore;
  /** What the fix pass did. Absent on runs from before there was one. */
  repair?: RepairOutcome;
  /** How long the fix call took, within `latencyMs`; null when there was none. */
  repairMs?: number | null;
  repairUsage?: GeminiUsage | null;
  /** Why the fix call failed, when `repair` is "failed". */
  repairError?: string;
  /** The first answer, its plan and its score, kept only when the fix replaced it. */
  firstRaw?: AiTripPlan;
  firstPlan?: ValidatedTripPlan;
  firstScore?: PlanScore;
  /** The fix the model returned when it was not used, so a later rule can judge it again. */
  fixRaw?: AiTripPlan;
}

export interface EvalRun {
  label: string;
  startedAt: string;
  finishedAt?: string;
  /** Set when the run ended early, e.g. the model's daily free-tier quota ran out. */
  stoppedReason?: string;
  /** Set on a copy whose saved answers were scored again with newer checks (AI_EVAL_RESCORE). */
  rescoredAt?: string;
  /** Set on a copy whose saved first answers went through a newer fix pass (AI_EVAL_REFIX). */
  refixedAt?: string;
  /** The model that answered the fix calls; absent on runs from when the first model fixed its own plan. */
  repairModel?: string;
  model: string;
  levels: string[];
  caseIds: string[];
  repeat: number;
  results: EvalResult[];
}

const CHECK_LABELS: Record<CheckId, string> = {
  noInvented: "No invented places",
  readsRequest: "Reads the request's own numbers",
  dayCount: "Right number of days",
  budget: "Fits the budget (planner total)",
  budgetWarned: "Overrun is warned about",
  closedDays: "Nothing on a closed day",
  openingHours: "Within opening hours",
  meals: "Lunch and dinner covered",
  pace: "No day over ten hours",
  wants: "Has what was asked for",
  avoid: "Ignores injected places",
  reportsUnmet: "Says what it couldn't do",
  indoorOnly: "Indoor only when asked",
  mealSlots: "Named meals at their meal time",
  language: "Answers in the traveller's language",
};

function quantile(values: number[], q: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

const seconds = (ms: number | null) => (ms === null ? "—" : `${(ms / 1000).toFixed(1)} s`);
const mean = (values: number[]) => (values.length ? Math.round(values.reduce((a, b) => a + b, 0) / values.length) : null);
const cell = (text: string) => text.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** The score of the plan the traveller is shown, or of the first answer before any fix. */
type Which = "shown" | "first";
const scoreOf = (result: EvalResult, which: Which = "shown") =>
  which === "first" ? (result.firstScore ?? result.score) : result.score;

function checkTally(results: EvalResult[], id: CheckId, which: Which = "shown") {
  let passed = 0;
  let applicable = 0;
  for (const result of results) {
    const status = scoreOf(result, which)?.checks[id]?.status;
    if (status === "pass" || status === "fail") applicable++;
    if (status === "pass") passed++;
  }
  return { passed, applicable };
}

function failedChecks(result: EvalResult, which: Which = "shown"): CheckId[] {
  const score = scoreOf(result, which);
  if (!score) return [];
  return CHECK_IDS.filter((id) => score.checks[id]?.status === "fail");
}

function totals(results: EvalResult[], which: Which) {
  let passed = 0;
  let applicable = 0;
  for (const id of CHECK_IDS) {
    const tally = checkTally(results, id, which);
    passed += tally.passed;
    applicable += tally.applicable;
  }
  const clean = results.filter((r) => failedChecks(r, which).length === 0).length;
  const warnings = results.reduce((sum, r) => sum + (scoreOf(r, which)?.metrics.plannerWarnings ?? 0), 0);
  return { passed, applicable, clean, warnings };
}

export function buildReport(run: EvalRun, cases: EvalCase[]): string {
  const byLevel = new Map(run.levels.map((level) => [level, run.results.filter((r) => r.level === level)]));
  const lines: string[] = [];

  lines.push(`# AI planner eval — ${run.label}`, "");
  lines.push(
    `Model \`${run.model}\` · ${run.caseIds.length} cases × ${run.levels.length} thinking levels × ${run.repeat} run(s) · started ${run.startedAt}` +
      (run.finishedAt ? ` · finished ${run.finishedAt}` : " · unfinished"),
    ""
  );
  const planned = run.caseIds.length * run.levels.length * run.repeat;
  const answered = run.results.filter((r) => r.ok).length;
  if (answered < planned || run.stoppedReason) {
    lines.push(
      `> **Partial run:** ${answered} of ${planned} calls answered.` + (run.stoppedReason ? ` Stopped: ${run.stoppedReason}.` : "") +
        " Levels are only comparable on the cases they all answered.",
      ""
    );
  }
  lines.push(
    "Every number below comes from the planner's own code (timeline, schedule, opening hours, meals, closed days, cost). " +
      "Stop times are the planner page's, timed around a stop's best window when the day has one. " +
      "The budget check uses the total the planner page shows once the plan is used — the trip's travel mode, accommodation and party size included.",
    ""
  );
  if (run.rescoredAt) {
    lines.push(`> Rescored ${run.rescoredAt} with the current checks: each saved answer was validated and scored again; no model was called.`, "");
  }
  if (run.refixedAt) {
    lines.push(
      `> Refixed ${run.refixedAt}: each saved first answer went through the current fix pass under the site's time limits, ` +
        "the first answer's own time counted against them. Only the fix called a model; times are the first answer's saved time plus the new fix.",
      ""
    );
  }

  lines.push("## By thinking level", "");
  lines.push("| Level | Answered | Cases with every check passing | Checks passed | Median time | Slowest | Mean thought tokens |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const [level, results] of byLevel) {
    const answered = results.filter((r) => r.ok);
    const clean = answered.filter((r) => failedChecks(r).length === 0).length;
    let passed = 0;
    let applicable = 0;
    for (const id of CHECK_IDS) {
      const tally = checkTally(answered, id);
      passed += tally.passed;
      applicable += tally.applicable;
    }
    const latencies = answered.map((r) => r.latencyMs!).filter((ms) => ms !== null);
    const thought = answered.map((r) => r.usage?.thoughtTokens).filter((n): n is number => typeof n === "number");
    lines.push(
      `| ${level} | ${answered.length}/${results.length} | ${clean}/${answered.length} | ${passed}/${applicable} | ` +
        `${seconds(quantile(latencies, 0.5))} | ${seconds(quantile(latencies, 1))} | ${mean(thought) ?? "—"} |`
    );
  }
  lines.push("");

  const withRepair = run.results.filter((r) => r.ok && r.repair);
  if (withRepair.length) {
    lines.push("## The fix pass", "");
    lines.push(
      `When the planner would warn about a plan, the plan and its warnings go once to ${run.repairModel ? `\`${run.repairModel}\`` : "the same model"} for a fix, ` +
        "and the fixed plan is shown only if it is better. " +
        "First = the first answer as the planner sees it; shown = what the traveller gets.",
      ""
    );
    lines.push(`| Level | ${REPAIR_OUTCOMES.join(" | ")} | Checks passed, first → shown | Every check passing, first → shown | Planner warnings, first → shown | Median fix time |`);
    lines.push(`|---|${REPAIR_OUTCOMES.map(() => "---").join("|")}|---|---|---|---|`);
    for (const level of run.levels) {
      const results = withRepair.filter((r) => r.level === level);
      if (!results.length) continue;
      const first = totals(results, "first");
      const shown = totals(results, "shown");
      const fixTimes = results.map((r) => r.repairMs).filter((ms): ms is number => typeof ms === "number");
      lines.push(
        `| ${level} | ${REPAIR_OUTCOMES.map((o) => results.filter((r) => r.repair === o).length).join(" | ")} | ` +
          `${first.passed}/${first.applicable} → ${shown.passed}/${shown.applicable} | ${first.clean} → ${shown.clean} of ${results.length} | ` +
          `${first.warnings} → ${shown.warnings} | ${seconds(quantile(fixTimes, 0.5))} |`
      );
    }
    lines.push("");
    for (const r of withRepair.filter((x) => x.repair === "failed")) {
      lines.push(`- Fix failed for **${r.caseId}** · ${r.level} after ${seconds(r.repairMs ?? null)}: ${cell(r.repairError ?? "reason not recorded")}`);
    }
    if (withRepair.some((r) => r.repair === "failed")) lines.push("");
    const used = withRepair.filter((r) => r.repair === "used");
    if (used.length) {
      lines.push("Plans the fix replaced, with the checks each one failed before and after:", "");
      for (const r of used) {
        const before = failedChecks(r, "first");
        const after = failedChecks(r);
        lines.push(
          `- **${r.caseId}** · ${r.level}: ${before.length ? before.join(", ") : "none"} → ${after.length ? after.join(", ") : "none"}` +
            ` · warnings ${r.firstScore?.metrics.plannerWarnings ?? "?"} → ${r.score?.metrics.plannerWarnings ?? "?"}`
        );
      }
      lines.push("");
    }
  }

  lines.push("## Each check", "");
  lines.push(`| Check | ${run.levels.join(" | ")} |`);
  lines.push(`|---|${run.levels.map(() => "---").join("|")}|`);
  for (const id of CHECK_IDS) {
    const cells = run.levels.map((level) => {
      const { passed, applicable } = checkTally((byLevel.get(level) ?? []).filter((r) => r.ok), id);
      return applicable === 0 ? "—" : `${passed}/${applicable}`;
    });
    lines.push(`| ${CHECK_LABELS[id]} | ${cells.join(" | ")} |`);
  }
  lines.push("");

  lines.push("## Each case", "");
  lines.push("✓ = every check passed; otherwise the checks that failed.", "");
  lines.push(`| Case | What it probes | ${run.levels.join(" | ")} |`);
  lines.push(`|---|---|${run.levels.map(() => "---").join("|")}|`);
  for (const testCase of cases.filter((c) => run.caseIds.includes(c.id))) {
    const cells = run.levels.map((level) =>
      run.results
        .filter((r) => r.caseId === testCase.id && r.level === level)
        .map((r) => (!r.ok ? `error` : failedChecks(r).length === 0 ? "✓" : failedChecks(r).join(", ")))
        .join(" / ") || "—"
    );
    lines.push(`| \`${testCase.id}\` | ${cell(testCase.probes)} | ${cells.map(cell).join(" | ")} |`);
  }
  lines.push("");

  const budgetRows = run.results.filter((r) => r.ok && r.score && r.score.checks.budget.status !== "n/a");
  if (budgetRows.length) {
    lines.push("## Budget: what the dialog says vs what the planner shows", "");
    lines.push("| Case | Level | Dialog shows | Planner shows | Result |");
    lines.push("|---|---|---|---|---|");
    for (const r of budgetRows) {
      const m = r.score!.metrics;
      lines.push(
        `| \`${r.caseId}\` | ${r.level} | ฿${m.dialogEstimateThb.toLocaleString("en-US")} | ฿${m.plannerTotalThb.toLocaleString("en-US")} | ${cell(r.score!.checks.budget.detail ?? "")} |`
      );
    }
    lines.push("");
  }

  lines.push("## Details of every failure", "");
  for (const r of run.results) {
    const failures = failedChecks(r);
    if (r.ok && failures.length === 0) continue;
    lines.push(`- **${r.caseId}** · ${r.level}${run.repeat > 1 ? ` · run ${r.repeat}` : ""}`);
    if (!r.ok) {
      lines.push(`  - error: ${cell(r.error ?? "unknown")}`);
      continue;
    }
    for (const id of failures) lines.push(`  - ${CHECK_LABELS[id]}: ${cell(r.score!.checks[id].detail ?? "")}`);
  }
  lines.push("");

  lines.push("## Plans", "");
  for (const r of run.results.filter((x) => x.ok)) {
    const m = r.score!.metrics;
    lines.push(
      `- **${r.caseId}** · ${r.level} · ${seconds(r.latencyMs)}${r.repair ? ` · fix ${r.repair}` : ""} · ${m.days} day(s), ${m.stops} stops, longest ride day ${m.maxDayTravelMinutes} min, ends ${m.latestFinish ?? "—"}`
    );
    if (r.firstPlan) r.firstPlan.days.forEach((day, i) => lines.push(`  - First, day ${i + 1}: ${day.slugs.join(" → ")}`));
    r.plan!.days.forEach((day, i) => lines.push(`  - Day ${i + 1}: ${day.slugs.join(" → ")}`));
    if (r.raw!.unmetConstraints.length) lines.push(`  - Unmet: ${cell(r.raw!.unmetConstraints.join(" · "))}`);
  }
  lines.push("");

  return lines.join("\n");
}
