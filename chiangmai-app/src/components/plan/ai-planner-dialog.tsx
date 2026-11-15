"use client";

import { useId, useRef, useState } from "react";
import { Check, LoaderCircle, Sparkles, TriangleAlert, X } from "lucide-react";
import { places, getPlaceBySlug } from "@/data/places";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { buildSchedule } from "@/lib/planner/schedule";
import { dayStats } from "@/lib/trip-calculations";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, formatDuration } from "@/components/brand/place-text";
import { baht } from "./plan-text";

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

/**
 * Describe the trip, get a draft built from the catalogue's own places. The
 * request, the preview and "use this plan" (with a real Undo) are the old
 * panel's; the times and totals shown are the planner's own arithmetic.
 */
export function AiPlannerDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { locale, dict } = useLocale();
  const t = dict.planner.ai;
  const { showToast } = useToast();
  const travelers = useTripStore((s) => s.travelers);
  const budgetThb = useTripStore((s) => s.budgetThb);
  const loadPlan = useTripStore((s) => s.loadPlan);
  const hasExistingPlan = useTripStore((s) =>
    Object.entries(s.containers).some(([id, slugs]) => id !== UNSCHEDULED && slugs.length > 0),
  );

  const [request, setRequest] = useState("");
  const [days, setDays] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorKey, setErrorKey] = useState<keyof typeof t.errors>("generic");
  const [plan, setPlan] = useState<AiPlanResponse | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const requestId = useId();
  const daysId = useId();

  async function generate() {
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

  function apply() {
    if (!plan || plan.days.length === 0) return;
    const { dayIds, containers } = useTripStore.getState();
    const previous = { dayIds: [...dayIds], containers: structuredClone(containers) };
    const nextContainers: Record<string, string[]> = { [UNSCHEDULED]: [] };
    plan.days.forEach((day, i) => {
      nextContainers[`day-${i + 1}`] = day.slugs;
    });
    loadPlan({ dayIds: plan.days.map((_, i) => `day-${i + 1}`), containers: nextContainers });
    showToast({ message: t.applied, actions: [{ label: t.undo, onClick: () => loadPlan(previous) }] });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId} className="w-[min(640px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)]">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="flex items-center gap-2 text-title font-semibold text-brand">
          <Sparkles aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
          {t.title}
        </h2>
        <IconButton label={dict.nav.close} tone="plain" size="sm" onClick={onClose} className="-mt-1 -mr-2">
          <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </IconButton>
      </div>
      <p className="mt-1 text-small text-pretty text-ink-soft">{t.intro}</p>

      <label htmlFor={requestId} className="sr-only">
        {t.title}
      </label>
      <textarea
        id={requestId}
        ref={textareaRef}
        data-autofocus
        value={request}
        onChange={(event) => setRequest(event.target.value)}
        rows={3}
        maxLength={1000}
        placeholder={t.placeholder}
        className={cx(
          "mt-4 w-full resize-y rounded-md border-0 bg-well p-4 font-brand text-body text-ink placeholder:text-ink-soft",
          focusRing,
        )}
      />

      <div className="mt-3 grid gap-2">
        <p className="text-small text-ink-soft">{t.examplesLabel}</p>
        <div className="flex flex-wrap gap-2">
          {t.examples.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => {
                setRequest(example);
                textareaRef.current?.focus();
              }}
              className={cx(
                "min-h-11 rounded-full bg-well px-4 py-2 text-left text-small text-ink hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
                focusRing,
              )}
            >
              {example}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label htmlFor={daysId} className="text-small text-ink-soft">
          {t.daysLabel}
        </label>
        <input
          id={daysId}
          type="number"
          inputMode="numeric"
          min={1}
          max={MAX_DAYS}
          value={days}
          onChange={(event) => setDays(Math.min(MAX_DAYS, Math.max(1, Number(event.target.value) || 1)))}
          className={cx("h-11 w-20 rounded-full border-0 bg-well px-4 text-center font-brand text-label tabular-nums", focusRing)}
        />
        <Button
          onClick={generate}
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          icon={
            status === "loading" ? (
              <LoaderCircle aria-hidden strokeWidth={ICON_STROKE} className="size-4 animate-spin" />
            ) : (
              <Sparkles aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            )
          }
        >
          {status === "loading" ? t.generating : t.generate}
        </Button>
      </div>

      <div aria-live="polite">
        {status === "loading" ? (
          <p className="mt-4 text-small text-ink-soft">{fill(t.generatingHint, { count: places.length })}</p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 flex items-start gap-2 text-small text-ink">
            <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
            {t.errors[errorKey]}
          </p>
        ) : null}
      </div>

      {status === "done" && plan ? (
        <div className="mt-6 grid gap-4 border-t border-line pt-5">
          <p className="text-body text-pretty">{plan.understood}</p>
          {plan.days.length === 0 ? (
            <p className="text-small text-ink-soft">{t.emptyResult}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.days.map((day, i) => {
                  const dayPlaces = day.slugs
                    .map((slug) => getPlaceBySlug(slug))
                    .filter((p): p is NonNullable<typeof p> => Boolean(p));
                  const schedule = buildSchedule(dayPlaces);
                  const stats = dayStats(dayPlaces);
                  return (
                    <div key={i} className="grid content-start gap-2 rounded-md border border-line p-4">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="text-label font-semibold text-brand">{fill(t.dayLabel, { day: i + 1 })}</span>
                        <span className="text-credit text-ink-soft tabular-nums">
                          {formatDuration(stats.totalMinutes, dict)} · {baht(stats.budgetThb)}
                        </span>
                      </p>
                      <ol className="grid gap-1.5">
                        {schedule.stops.map((stop) => (
                          <li key={stop.place.slug} className="flex items-baseline gap-3 text-small">
                            <span className="w-24 flex-none text-ink-soft tabular-nums">
                              {stop.arrival}–{stop.departure}
                            </span>
                            <span className="flex-1">{stop.place.name[locale]}</span>
                            {stop.outsideOpeningHours ? (
                              <TriangleAlert
                                aria-label={dict.planner.route.outsideHours}
                                strokeWidth={ICON_STROKE}
                                className="size-4 flex-none text-cmj-sunset"
                              />
                            ) : null}
                          </li>
                        ))}
                      </ol>
                      <p className="text-small text-pretty text-ink-soft">{day.note}</p>
                    </div>
                  );
                })}
              </div>

              <p className={cx("text-small", plan.overBudgetByThb ? "font-medium text-ink" : "text-ink-soft")}>
                {plan.overBudgetByThb
                  ? fill(t.overBudget, { amount: Math.round(plan.overBudgetByThb).toLocaleString("en-US") })
                  : fill(budgetThb > 0 ? t.withinBudget : t.estimated, {
                      amount: Math.round(plan.estimatedCostThb).toLocaleString("en-US"),
                    })}
              </p>

              {plan.unmetConstraints.length > 0 ? (
                <div className="grid gap-2 rounded-md bg-sand-fill p-4">
                  <p className="flex items-center gap-2 text-label text-brand">
                    <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                    {t.notEverything}
                  </p>
                  <ul className="grid list-disc gap-1 pl-5 text-small">
                    {plan.unmetConstraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {/* Naming the model is part of being honest about what is automated
                  here, and what is not: the times and totals are the planner's own. */}
              <p className="text-credit text-ink-soft">{fill(t.generatedBy, { model: plan.model })}</p>
              {hasExistingPlan ? <p className="text-small text-ink">{t.overwriteWarning}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button onClick={apply} icon={<Check aria-hidden strokeWidth={2} className="size-4" />}>
                  {t.applyCta}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setPlan(null);
                    setStatus("idle");
                  }}
                >
                  {t.discard}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </Dialog>
  );
}
