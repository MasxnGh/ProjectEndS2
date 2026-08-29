"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { EASE } from "@/lib/motion";
import type { PlanProgress, PlanStepId } from "@/lib/planner/plan-progress";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/** Where each step scrolls to. Ids live on the sections in planner-board.tsx. */
const STEP_TARGET_ID: Record<PlanStepId, string> = {
  details: "planner-details",
  places: "planner-days",
  arrange: "planner-days",
  share: "planner-toolbar",
};

/**
 * A "you are here" strip for the planner, built on the look of React Bits'
 * Stepper (https://reactbits.dev/components/stepper) — numbered circles, a
 * connecting rail that fills as you go, a tick when a step is done.
 *
 * What it deliberately does NOT take from Stepper is the wizard: no next/back
 * buttons, and nothing is hidden behind a step. Planning a trip is not a
 * linear form — people pick a café before they pick a date — so this reports
 * where the plan stands and scrolls you to the relevant section, and every
 * control on the page stays reachable the whole time.
 */
export function PlanProgressBar({ progress }: { progress: PlanProgress }) {
  const { dict } = useLocale();
  const reduced = useReducedMotion();
  const t = dict.planner.progress;

  const currentStep = progress.steps.find((s) => s.current);
  const filledRatio =
    progress.steps.length > 1 ? progress.completedCount / (progress.steps.length - 1) : 0;

  function handleJump(stepId: PlanStepId) {
    const target = document.getElementById(STEP_TARGET_ID[stepId]);
    if (!target) return;
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    // Move focus too, so this works for keyboard and screen-reader users
    // rather than only moving the viewport for sighted mouse users.
    const focusable = target.querySelector<HTMLElement>(
      "input, button, [href], select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    focusable?.focus({ preventScroll: true });
  }

  return (
    <nav aria-label={t.label} className="no-print rounded-lg border border-border bg-surface p-4 sm:p-5">
      <ol className="relative flex items-start justify-between gap-2">
        {/* The rail sits behind the circles and fills to the last done step. */}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 top-4 -z-0 h-px bg-border"
          style={{ marginInline: "1rem" }}
        />
        <motion.div
          aria-hidden="true"
          className="absolute left-0 top-4 -z-0 h-px bg-accent"
          style={{ marginInline: "1rem" }}
          initial={false}
          animate={{ width: `calc(${Math.min(1, filledRatio) * 100}% - 2rem)` }}
          transition={{ duration: reduced ? 0 : 0.5, ease: EASE }}
        />

        {progress.steps.map((step, i) => (
          <li key={step.id} className="relative z-10 flex min-w-0 flex-1 flex-col items-center">
            <button
              type="button"
              onClick={() => handleJump(step.id)}
              aria-current={step.current ? "step" : undefined}
              className="group flex w-full flex-col items-center gap-1.5 rounded-md px-1 py-1 text-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors",
                  step.done
                    ? "border-accent bg-accent text-accent-foreground"
                    : step.current
                      ? "border-accent bg-surface text-accent-text shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-accent)_25%,transparent)]"
                      : "border-border bg-surface text-muted-foreground"
                )}
              >
                {step.done ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs leading-tight sm:text-xs",
                  step.done || step.current ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {t.steps[step.id]}
              </span>
            </button>
          </li>
        ))}
      </ol>

      <p className="mt-3 border-t border-border pt-3 text-center text-xs text-muted-foreground">
        {currentStep
          ? currentStep.remaining !== null
            ? t.hints[currentStep.id].replace("{count}", String(currentStep.remaining))
            : t.hints[currentStep.id].replace("{count}", "")
          : t.allDone}
      </p>
    </nav>
  );
}
