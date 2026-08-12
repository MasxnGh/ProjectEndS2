"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Sparkles, X } from "lucide-react";
import { places, getPlaceBySlug } from "@/data/places";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { buildSchedule } from "@/lib/planner/schedule";
import { dayStats, formatMinutes } from "@/lib/trip-calculations";
import { cn } from "@/lib/utils";

interface AiPlanResponse {
  understood: string;
  days: { slugs: string[]; note: string }[];
  unmetConstraints: string[];
  estimatedCostThb: number;
  droppedSlugs: string[];
  overBudgetByThb: number | null;
  provider: string;
  model: string;
}

const MAX_DAYS = 14;

function formatThb(amount: number): string {
  return Math.round(amount).toLocaleString("en-US");
}

export function AiPlannerPanel({ onClose }: { onClose: () => void }) {
  const { locale, dict } = useLocale();
  const t = dict.planner.ai;
  const { showToast } = useToast();

  const travelers = useTripStore((s) => s.travelers);
  const budgetThb = useTripStore((s) => s.budgetThb);
  const loadPlan = useTripStore((s) => s.loadPlan);

  const [request, setRequest] = useState("");
  const [days, setDays] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorKey, setErrorKey] = useState<keyof typeof t.errors>("generic");
  const [plan, setPlan] = useState<AiPlanResponse | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const hasExistingPlan = useTripStore((s) =>
    Object.entries(s.containers).some(([id, slugs]) => id !== UNSCHEDULED && slugs.length > 0)
  );

  async function handleGenerate() {
    if (!request.trim()) {
      setErrorKey("empty");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setPlan(null);

    try {
      const res = await fetch("/api/ai/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request: request.trim(), days, travelers, budgetThb }),
      });

      if (!res.ok) {
        setErrorKey(res.status === 429 ? "rateLimited" : res.status === 422 ? "refused" : "generic");
        setStatus("error");
        return;
      }

      setPlan((await res.json()) as AiPlanResponse);
      setStatus("done");
    } catch {
      setErrorKey("generic");
      setStatus("error");
    }
  }

  function handleApply() {
    if (!plan || plan.days.length === 0) return;

    // Snapshot before overwriting so the toast's Undo is a real restore, not a
    // guess at what the traveller had.
    const { dayIds, containers } = useTripStore.getState();
    const previous = { dayIds: [...dayIds], containers: structuredClone(containers) };

    const nextDayIds = plan.days.map((_, i) => `day-${i + 1}`);
    const nextContainers: Record<string, string[]> = { [UNSCHEDULED]: [] };
    plan.days.forEach((day, i) => {
      nextContainers[`day-${i + 1}`] = day.slugs;
    });

    loadPlan({ dayIds: nextDayIds, containers: nextContainers });
    showToast({
      message: t.applied,
      actions: [{ label: t.undo, onClick: () => loadPlan(previous) }],
    });
    onClose();
  }

  return (
    <section className="mt-6 rounded-lg border border-accent/40 bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2 font-serif-display text-lg">
            <Sparkles className="h-4 w-4 text-accent-text" />
            {t.title}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t.intro}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={dict.nav.close}
          className="shrink-0 rounded p-1 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <textarea
        ref={textareaRef}
        value={request}
        onChange={(e) => setRequest(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={t.placeholder}
        className="mt-4 w-full resize-y rounded-md border border-border bg-background p-3 text-sm focus:border-accent focus:outline-none"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{t.examplesLabel}:</span>
        {t.examples.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setRequest(example);
              textareaRef.current?.focus();
            }}
            className="rounded-full border border-border px-3 py-1 text-xs text-foreground/80 hover:border-accent hover:text-accent-text"
          >
            {example}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{t.daysLabel}</span>
          <input
            type="number"
            min={1}
            max={MAX_DAYS}
            value={days}
            onChange={(e) => setDays(Math.min(MAX_DAYS, Math.max(1, Number(e.target.value) || 1)))}
            className="w-16 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:border-accent focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95 disabled:opacity-60"
        >
          {status === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {status === "loading" ? t.generating : t.generate}
        </button>
      </div>

      {status === "loading" ? (
        <p className="mt-4 text-sm text-muted-foreground">
          {t.generatingHint.replace("{count}", String(places.length))}
        </p>
      ) : null}

      {status === "error" ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-accent-text">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {t.errors[errorKey]}
        </p>
      ) : null}

      {status === "done" && plan ? (
        <div className="mt-6 border-t border-border pt-5">
          <p className="text-sm text-foreground">{plan.understood}</p>

          {plan.days.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">{t.emptyResult}</p>
          ) : (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {plan.days.map((day, i) => {
                  // Times and totals come from the planner's own scheduler, so
                  // this preview shows exactly what the board will show once
                  // the traveller applies it.
                  const dayPlaces = day.slugs
                    .map((slug) => getPlaceBySlug(slug))
                    .filter((p): p is NonNullable<typeof p> => Boolean(p));
                  const schedule = buildSchedule(dayPlaces);
                  const stats = dayStats(dayPlaces);

                  return (
                    <div key={i} className="rounded-md border border-border p-4">
                      <div className="flex items-baseline justify-between gap-2">
                        <h4 className="font-medium">{t.dayLabel.replace("{day}", String(i + 1))}</h4>
                        <span className="text-xs text-muted-foreground">
                          {formatMinutes(stats.totalMinutes)} · ฿{formatThb(stats.budgetThb)}
                        </span>
                      </div>
                      <ol className="mt-3 space-y-2">
                        {schedule.stops.map((stop) => (
                          <li key={stop.place.slug} className="flex items-baseline gap-3 text-sm">
                            <span className="w-24 shrink-0 tabular-nums text-xs text-muted-foreground">
                              {stop.arrival}–{stop.departure}
                            </span>
                            <span className="flex-1">{stop.place.name[locale]}</span>
                            {stop.outsideOpeningHours ? (
                              <AlertTriangle
                                className="h-3.5 w-3.5 shrink-0 text-accent-text"
                                aria-label={dict.common.openingHours}
                              />
                            ) : null}
                          </li>
                        ))}
                      </ol>
                      <p className="mt-3 text-xs text-muted-foreground">{day.note}</p>
                    </div>
                  );
                })}
              </div>

              <p
                className={cn(
                  "mt-4 text-sm",
                  plan.overBudgetByThb ? "text-accent-text" : "text-muted-foreground"
                )}
              >
                {plan.overBudgetByThb
                  ? t.overBudget.replace("{amount}", formatThb(plan.overBudgetByThb))
                  : budgetThb > 0
                    ? t.withinBudget.replace("{amount}", formatThb(plan.estimatedCostThb))
                    : t.estimated.replace("{amount}", formatThb(plan.estimatedCostThb))}
              </p>

              {plan.unmetConstraints.length > 0 ? (
                <div className="mt-4 rounded-md border-l-4 border-accent bg-surface-muted p-4">
                  <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-accent-text">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t.notEverything}
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground/80">
                    {plan.unmetConstraints.map((item) => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Naming the model is part of being honest about what is
                  automated here — and about what is not: the schedule and the
                  totals above are the planner's own arithmetic. */}
              <p className="mt-3 text-xs text-muted-foreground">
                {t.generatedBy.replace("{model}", plan.model)}
              </p>

              {hasExistingPlan ? (
                <p className="mt-4 text-xs text-muted-foreground">{t.overwriteWarning}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleApply}
                  className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95"
                >
                  <Check className="h-4 w-4" />
                  {t.applyCta}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlan(null);
                    setStatus("idle");
                  }}
                  className="rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text"
                >
                  {t.discard}
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
