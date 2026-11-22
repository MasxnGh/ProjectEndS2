"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, Sparkles, TriangleAlert, X } from "lucide-react";
import { places, getPlaceBySlug } from "@/data/places";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { checkPlanDays, planDays, type PlanIssue } from "@/lib/ai/plan-check";
import { minutesToClock } from "@/lib/opening-hours";
import { dayStats } from "@/lib/trip-calculations";
import { addDaysIso } from "@/lib/date-utils";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, formatDuration } from "@/components/brand/place-text";
import { LoadingLabel, MarkLoader, RouteDots } from "@/components/brand/loaders";
import type { Dictionary, Locale } from "@/i18n";
import type { ValidatedTripPlan } from "@/lib/ai/schema";
import { baht, shortDayDate } from "./plan-text";

type AiPlanResponse = ValidatedTripPlan;

const MAX_DAYS = 14;
/** The server gives up at 108 s, first plan and fix together; waiting a little longer lets its own answer arrive. */
const CLIENT_TIMEOUT_MS = 115_000;
/** After this, the loading line says the wait is normal. Most plans take 20–30 s. */
const SLOW_AFTER_MS = 15_000;
const TIMED_OUT = "timed-out";

type ErrorKey = keyof Dictionary["planner"]["ai"]["errors"];
interface PlanError {
  key: ErrorKey;
  values?: Record<string, string | number>;
}

/** The Days field holds whatever is typed; this is the number it stands for. */
function clampDays(text: string): number {
  const n = Math.round(Number(text));
  return Number.isFinite(n) && n >= 1 ? Math.min(MAX_DAYS, n) : 1;
}

/**
 * The route answers every failure with a code (and, for limits, how long to
 * wait). A daily quota that frees up later today is shown as a clock time; a
 * wait of a minute or two is just "busy".
 */
async function errorFromResponse(res: Response, clockIn: (seconds: number) => string): Promise<PlanError> {
  const body = (await res.json().catch(() => null)) as { code?: string; retryAfterSeconds?: number } | null;
  const wait = Number(body?.retryAfterSeconds ?? res.headers.get("Retry-After"));
  const waitSeconds = Number.isFinite(wait) && wait > 0 ? wait : null;

  if (res.status === 429) {
    return { key: "rateLimited", values: { minutes: Math.max(1, Math.ceil((waitSeconds ?? 60) / 60)) } };
  }
  if (res.status === 422) return { key: "refused" };
  if (body?.code === "quota") {
    return waitSeconds !== null && waitSeconds > 120
      ? { key: "quota", values: { time: clockIn(waitSeconds) } }
      : { key: "busy" };
  }
  if (body?.code === "timeout" || res.status === 504) return { key: "timeout" };
  return { key: "generic" };
}

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
  const travelMode = useTripStore((s) => s.travelMode);
  const accommodationThb = useTripStore((s) => s.accommodationThb);
  const travelDate = useTripStore((s) => s.travelDate);
  const setBudgetThb = useTripStore((s) => s.setBudgetThb);
  const loadPlan = useTripStore((s) => s.loadPlan);
  const hasExistingPlan = useTripStore((s) =>
    Object.entries(s.containers).some(([id, slugs]) => id !== UNSCHEDULED && slugs.length > 0),
  );

  const [request, setRequest] = useState("");
  // Text, not a number: clamping on every keystroke made the field impossible
  // to clear and retype ("1" could only become "13", never "3").
  const [daysText, setDaysText] = useState("1");
  // Typed in by the traveller, as opposed to left at 1 or filled in by an
  // example: only then does the field outrank a length written in the request.
  const [daysEdited, setDaysEdited] = useState(false);
  // What the shown plan was asked for, to say where the answer differs from it.
  const [sent, setSent] = useState({ days: 1, daysEdited: false });
  const [budgetJustSet, setBudgetJustSet] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<PlanError>({ key: "generic" });
  const [slow, setSlow] = useState(false);
  const [plan, setPlan] = useState<AiPlanResponse | null>(null);
  const inFlight = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const titleId = useId();
  const requestId = useId();
  const daysId = useId();

  // Leaving the planner mid-request drops the request with it.
  useEffect(() => () => inFlight.current?.abort(), []);

  // Each day timed and checked the way the planner page will once the plan is
  // used (around a stop's best time when the day has one), so the times and
  // warnings here are the ones the traveller then sees there.
  const checked = useMemo(() => {
    if (!plan) return null;
    const days = planDays(
      plan.days.map((day) => day.slugs),
      travelDate || null,
    );
    return { days, issues: checkPlanDays(days) };
  }, [plan, travelDate]);

  function clockIn(seconds: number): string {
    // Rounded up to five minutes: Gemini gives the wait to the second, and
    // "around 14:53" reads as more precise than anyone needs.
    const at = new Date(Math.ceil((Date.now() + seconds * 1000) / 300_000) * 300_000);
    return at.toLocaleTimeString(locale === "th" ? "th-TH" : "en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
  }

  function close() {
    // Nobody is waiting for the answer any more, and aborting the fetch also
    // stops the server from trying further models on its behalf.
    if (inFlight.current) {
      inFlight.current.abort();
      inFlight.current = null;
      setStatus("idle");
      setSlow(false);
    }
    onClose();
  }

  async function generate() {
    const days = clampDays(daysText);
    setDaysText(String(days));
    if (!request.trim()) {
      setError({ key: "empty" });
      setStatus("error");
      return;
    }

    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    const timeoutTimer = window.setTimeout(() => controller.abort(TIMED_OUT), CLIENT_TIMEOUT_MS);
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    setStatus("loading");
    setSlow(false);
    setPlan(null);
    try {
      const res = await fetch("/api/ai/plan-trip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Travel mode and accommodation price the plan the way the planner
        // will, so the total shown here is the one the planner shows after.
        // The date gives each day its weekday, for closing days.
        body: JSON.stringify({
          request: request.trim(),
          days,
          daysSetByTraveller: daysEdited,
          travelDate: travelDate || null,
          travelers,
          budgetThb,
          travelMode,
          accommodationThb,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        setError(await errorFromResponse(res, clockIn));
        setStatus("error");
        return;
      }
      const next = (await res.json()) as AiPlanResponse;
      setPlan(next);
      setSent({ days, daysEdited });
      setBudgetJustSet(false);
      // The request's own length won; the field now says what the plan is for.
      if (!daysEdited && next.read.days !== null) setDaysText(String(next.read.days));
      setStatus("done");
    } catch {
      // Closed, or replaced by a newer request: whoever aborted it has already
      // set the state, so there is nothing to report.
      if (controller.signal.aborted && controller.signal.reason !== TIMED_OUT) return;
      setError({ key: controller.signal.reason === TIMED_OUT ? "timeout" : "generic" });
      setStatus("error");
    } finally {
      window.clearTimeout(timeoutTimer);
      window.clearTimeout(slowTimer);
      if (inFlight.current === controller) {
        inFlight.current = null;
        setSlow(false);
      }
    }
  }

  function apply() {
    if (!plan || plan.days.length === 0) return;
    const { dayIds, containers, lockedTimes } = useTripStore.getState();
    const previous = { dayIds: [...dayIds], containers: structuredClone(containers), lockedTimes: { ...lockedTimes } };
    const nextContainers: Record<string, string[]> = { [UNSCHEDULED]: [] };
    plan.days.forEach((day, i) => {
      nextContainers[`day-${i + 1}`] = day.slugs;
    });
    // Pinned times belong to the plan they were set on. Kept, a pin on the old
    // day 1 would fix the time of whichever stop the new day 1 shares with it.
    loadPlan({ dayIds: plan.days.map((_, i) => `day-${i + 1}`), containers: nextContainers, lockedTimes: {} });
    // Undo brings the pins back with the plan they belonged to.
    showToast({ message: t.applied, actions: [{ label: t.undo, onClick: () => loadPlan(previous) }] });
    onClose();
  }

  return (
    <Dialog open={open} onClose={close} labelledBy={titleId} className="w-[min(640px,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)]">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="flex items-center gap-2 text-title font-semibold text-brand">
          <Sparkles aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
          {t.title}
        </h2>
        <IconButton label={dict.nav.close} tone="plain" size="sm" onClick={close} className="-mt-1 -mr-2">
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
              key={example.text}
              type="button"
              onClick={() => {
                setRequest(example.text);
                setDaysText(String(example.days));
                setDaysEdited(false);
                textareaRef.current?.focus();
              }}
              className={cx(
                "min-h-11 rounded-full bg-well px-4 py-2 text-left text-small text-ink hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
                focusRing,
              )}
            >
              {example.text}
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
          value={daysText}
          onChange={(event) => {
            setDaysText(event.target.value);
            setDaysEdited(true);
          }}
          onBlur={() => setDaysText(String(clampDays(daysText)))}
          className={cx("h-11 w-20 rounded-full border-0 bg-well px-4 text-center font-brand text-label tabular-nums", focusRing)}
        />
        <Button
          onClick={generate}
          disabled={status === "loading"}
          aria-busy={status === "loading"}
          icon={
            status === "loading" ? (
              <RouteDots />
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
          <p className="mt-5 flex items-center gap-3">
            <MarkLoader className="w-10 text-brand" />
            <LoadingLabel>{slow ? t.slowHint : fill(t.generatingHint, { count: places.length })}</LoadingLabel>
          </p>
        ) : null}
        {status === "error" ? (
          <p className="mt-4 flex items-start gap-2 text-small text-ink">
            <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
            {fill(t.errors[error.key], error.values ?? {})}
          </p>
        ) : null}
      </div>

      {status === "done" && plan ? (
        <div className="mt-6 grid gap-4 border-t border-line pt-5">
          <div className="grid gap-1.5">
            <p className="text-body text-pretty">{plan.understood}</p>
            <RequestReadingLines plan={plan} sent={sent} dict={dict} />
          </div>
          {plan.days.length === 0 ? (
            <p className="text-small text-ink-soft">{t.emptyResult}</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {plan.days.map((day, i) => {
                  const planned = checked!.days[i];
                  const stats = dayStats(planned.places);
                  const dayIssues = checked!.issues.filter(
                    (issue): issue is DayIssue => issue.day === i + 1 && issue.type !== "outsideHours",
                  );
                  return (
                    <div key={i} className="grid content-start gap-2 rounded-md border border-line p-4">
                      <p className="flex items-baseline justify-between gap-2">
                        <span className="text-label font-semibold text-brand">
                          {fill(t.dayLabel, { day: i + 1 })}
                          {travelDate ? (
                            <span className="font-normal text-ink-soft"> · {shortDayDate(addDaysIso(travelDate, i), locale)}</span>
                          ) : null}
                        </span>
                        <span className="text-credit text-ink-soft tabular-nums">
                          {formatDuration(stats.totalMinutes, dict)} ·{" "}
                          {fill(dict.plan.stats.perPerson, { amount: baht(stats.budgetThb) })}
                        </span>
                      </p>
                      <ol className="grid gap-1.5">
                        {planned.timeline.stops.map((stop) => (
                          <li key={stop.place.slug} className="flex items-baseline gap-3 text-small">
                            <span className="w-24 flex-none text-ink-soft tabular-nums">
                              {minutesToClock(stop.arrivalMinutes)}–{minutesToClock(stop.departureMinutes)}
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
                      {dayIssues.map((issue) => (
                        <p key={`${issue.type}-${"slug" in issue ? issue.slug : ""}`} className="flex items-start gap-2 text-small text-pretty text-ink">
                          <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
                          {issueText(issue, locale, dict)}
                        </p>
                      ))}
                      <p className="text-small text-pretty text-ink-soft">{day.note}</p>
                    </div>
                  );
                })}
              </div>

              <TripCost
                plan={plan}
                tripBudgetThb={budgetThb}
                budgetJustSet={budgetJustSet}
                onUseBudget={(amount) => {
                  setBudgetThb(amount);
                  setBudgetJustSet(true);
                }}
                dict={dict}
              />

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

              {checked!.issues.length > 0 ? (
                <p className="flex items-start gap-2 text-small text-pretty text-ink">
                  <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
                  {fill(t.issuesLeft, { count: checked!.issues.length })}
                </p>
              ) : null}

              {/* Naming the model is part of being honest about what is automated
                  here, and what is not: the times and totals are the planner's own. */}
              <div className="grid gap-0.5">
                <p className="text-credit text-ink-soft">
                  {fill(t.generatedBy, { model: plan.draftModel ?? plan.model })}
                </p>
                {plan.repair === "used" ? (
                  <p className="text-credit text-pretty text-ink-soft">{fill(t.repaired, { model: plan.model })}</p>
                ) : null}
              </div>
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

/**
 * The trip total, said the way the planner will say it once the plan is used:
 * for the whole party, with what is per person and what is shared spelled
 * out underneath. The day cards above are per person, like the planner's.
 */
function TripCost({
  plan,
  tripBudgetThb,
  budgetJustSet,
  onUseBudget,
  dict,
}: {
  plan: AiPlanResponse;
  tripBudgetThb: number;
  budgetJustSet: boolean;
  onUseBudget: (amount: number) => void;
  dict: Dictionary;
}) {
  const t = dict.planner.ai;
  const { cost, budget } = plan;
  const values = {
    amount: baht(plan.estimatedCostThb),
    people: people(cost.travelers, dict),
    budget: baht(budget?.thb ?? 0),
    over: baht(plan.overBudgetByThb ?? 0),
  };
  const headline = plan.overBudgetByThb
    ? fill(t.costOver, values)
    : budget
      ? fill(t.costWithin, values)
      : fill(t.costTotal, values);
  // The request named a budget the trip does not have (yet): say which one the
  // plan was held to, and offer to keep it.
  const requestBudget = budget?.source === "request" && budget.thb !== tripBudgetThb ? budget.thb : null;
  const parts = [
    fill(t.costPerPerson, { amount: baht(cost.perPersonThb) }),
    fill(t.costTransport, {
      mode: dict.planner.summary.transport.modes[cost.travelMode],
      amount: baht(cost.transportThb),
    }),
    ...(cost.accommodationThb > 0 ? [fill(t.costStay, { amount: baht(cost.accommodationThb) })] : []),
  ];

  return (
    <div className="grid gap-1">
      <p className={cx("text-small text-pretty", plan.overBudgetByThb ? "font-medium text-ink" : "text-ink-soft")}>
        {headline}
      </p>
      <p className="text-credit text-pretty text-ink-soft tabular-nums">{parts.join(" · ")}</p>
      {requestBudget !== null ? (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-small text-pretty text-ink-soft">
            {fill(tripBudgetThb > 0 ? t.budgetFromRequest : t.budgetFromRequestNoTrip, {
              budget: baht(requestBudget),
              trip: baht(tripBudgetThb),
            })}
          </p>
          <Button variant="secondary" size="sm" onClick={() => onUseBudget(requestBudget)}>
            {t.setTripBudget}
          </Button>
        </div>
      ) : budgetJustSet && budget ? (
        <p className="mt-2 flex items-center gap-1.5 text-small text-ink-soft" role="status">
          <Check aria-hidden strokeWidth={2} className="size-4 flex-none text-brand" />
          {fill(t.tripBudgetSet, { amount: baht(budget.thb) })}
        </p>
      ) : null}
    </div>
  );
}

/**
 * A day's warning in the planner page's own words. A stop timed outside its
 * hours is marked on the stop itself instead, as on the planner page.
 */
type DayIssue = Exclude<PlanIssue, { type: "outsideHours" }>;

function issueText(issue: DayIssue, locale: Locale, dict: Dictionary): string {
  const f = dict.planner.feasibility;
  const place = (slug: string) => getPlaceBySlug(slug)?.name[locale] ?? slug;
  switch (issue.type) {
    case "closedOnDay":
      return fill(f.closedOnDay, { place: place(issue.slug) });
    case "seasonalClosure":
      return fill(f.seasonalClosure, { place: place(issue.slug) });
    case "anchorFirst":
      return fill(f.anchorEarly, { place: place(issue.slug), time: issue.startsAt });
    case "longDay":
      return dict.planner.route.exceedsTenHours;
  }
}

function people(count: number, dict: Dictionary): string {
  return count === 1 ? dict.plan.travellersOne : fill(dict.plan.travellers, { count });
}

/**
 * The numbers the request itself states, as the AI read them, and where the
 * plan departs from them: a days field the traveller set, or a party size the
 * trip settings say otherwise about. Nothing is shown when the request named
 * no numbers.
 */
function RequestReadingLines({
  plan,
  sent,
  dict,
}: {
  plan: AiPlanResponse;
  sent: { days: number; daysEdited: boolean };
  dict: Dictionary;
}) {
  const t = dict.planner.ai;
  const { read } = plan;
  // A party size equal to the trip's adds nothing, and is often the model
  // echoing the settings rather than anything the request said.
  const readTravellers = read.travelers !== null && read.travelers !== plan.cost.travelers ? read.travelers : null;
  const items = [
    read.days === null ? null : read.days === 1 ? t.readDaysOne : fill(t.readDays, { count: read.days }),
    read.budgetThb === null
      ? null
      : fill(read.budgetBasis === "per_person" ? t.readBudgetPerPerson : t.readBudgetGroup, { amount: baht(read.budgetThb) }),
    readTravellers === null ? null : people(readTravellers, dict),
  ].filter((item): item is string => item !== null);
  if (items.length === 0) return null;

  const notes = [
    sent.daysEdited && read.days !== null && read.days !== sent.days
      ? fill(t.daysDiffer, { read: read.days, form: sent.days })
      : null,
    readTravellers === null
      ? null
      : fill(t.travellersDiffer, { read: people(readTravellers, dict), trip: people(plan.cost.travelers, dict) }),
  ].filter((note): note is string => note !== null);

  return (
    <>
      <p className="text-small text-pretty text-ink-soft">
        {t.readLabel} {items.join(" · ")}
      </p>
      {notes.map((note) => (
        <p key={note} className="flex items-start gap-2 text-small text-pretty text-ink">
          <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
          {note}
        </p>
      ))}
    </>
  );
}
