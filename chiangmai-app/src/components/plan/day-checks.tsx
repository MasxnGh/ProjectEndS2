"use client";

import { useMemo, useState } from "react";
import { Plus, Route, Sparkles, TriangleAlert, UtensilsCrossed } from "lucide-react";
import type { Place } from "@/data/types";
import { places as allPlaces } from "@/data/places";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { compareOptimization, type DaySchedule, type OptimizationComparison } from "@/lib/planner/schedule";
import { fetchDurationMatrix } from "@/lib/routing/fetch-matrix";
import type { FeasibilityIssue } from "@/lib/planner/feasibility";
import type { AnchorFirstSuggestion } from "@/lib/planner/anchor-first";
import type { DayPace } from "@/lib/planner/pace";
import { findMealGaps, suggestMealPlaces, type MealGap } from "@/lib/planner/meals";
import { findLongestLeg, findOnRouteStops } from "@/lib/planner/detours";
import { minutesToClock } from "@/lib/opening-hours";
import { Button } from "@/components/brand/button";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx } from "@/components/brand/cx";
import { fill, formatDuration } from "@/components/brand/place-text";
import { RouteDots } from "@/components/brand/loaders";
import { shortDayDate } from "./plan-text";

const warnBox = "rounded-lg bg-[color-mix(in_oklab,var(--cmj-sunset)_22%,var(--cmj-panel))] p-4 text-ink";

/**
 * What the day needs a second look at, and what would make it better. Every
 * check is the planner's existing one — feasibility, pace, meal gaps, stops
 * on the way, the route optimiser — moved here unchanged.
 */
export function DayChecks({
  dayId,
  dayNumber,
  date,
  places,
  schedule,
  pace,
  issues,
  relocations,
  onApplyRelocations,
  anchorFirst,
  onApplyAnchorFirst,
  paceEaseLabel,
  onEasePace,
}: {
  dayId: string;
  dayNumber: number;
  date: string | null;
  places: Place[];
  schedule: DaySchedule;
  pace: DayPace;
  issues: FeasibilityIssue[];
  relocations?: { placeSlug: string; toDayNumber: number }[];
  onApplyRelocations: () => void;
  anchorFirst?: AnchorFirstSuggestion;
  onApplyAnchorFirst?: () => void;
  paceEaseLabel?: string;
  onEasePace?: () => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.plan;
  const f = dict.planner.feasibility;

  if (places.length === 0) return null;

  const nameOf = (slug: string) => places.find((p) => p.slug === slug)?.name[locale] ?? slug;
  const hasWarnings = schedule.exceedsTenHours || issues.length > 0 || Boolean(anchorFirst);

  return (
    <section aria-labelledby={`${dayId}-checks`} className="grid gap-3">
      <h3 id={`${dayId}-checks`} tabIndex={-1} className="text-label text-brand">
        {t.checks.title}
      </h3>

      {hasWarnings ? (
        <div className={cx(warnBox, "grid gap-2")}>
          <ul className="grid gap-2 text-small text-pretty">
            {schedule.exceedsTenHours ? (
              <li className="flex items-start gap-2">
                <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
                {dict.planner.route.exceedsTenHours}
              </li>
            ) : null}
            {anchorFirst ? (
              <li className="flex items-start gap-2">
                <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
                {fill(f.anchorEarly, {
                  place: nameOf(anchorFirst.placeSlug),
                  time: minutesToClock(anchorFirst.currentStartMinutes),
                })}
              </li>
            ) : null}
            {issues.map((issue) => {
              const place = nameOf(issue.placeSlug);
              const message =
                issue.type === "closedOnDay"
                  ? issue.suggestedIsoDate
                    ? fill(f.closedOnDayWithSuggestion, { place, date: shortDayDate(issue.suggestedIsoDate, locale) })
                    : fill(f.closedOnDay, { place })
                  : issue.type === "seasonalClosure"
                    ? fill(f.seasonalClosure, { place })
                    : fill(f.hazeSensitive, { place });
              return (
                <li key={`${issue.type}-${issue.placeSlug}`} className="flex items-start gap-2">
                  <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
                  {message}
                </li>
              );
            })}
          </ul>
          {/* Each fix sits beside the problem it fixes and moves only this day's places. */}
          {anchorFirst && onApplyAnchorFirst ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <p className="text-small text-pretty">
                {anchorFirst.closedAfter === 0
                  ? fill(f.anchorFirstAll, { place: nameOf(anchorFirst.placeSlug) })
                  : fill(f.anchorFirstSome, { place: nameOf(anchorFirst.placeSlug), count: anchorFirst.closedAfter })}
              </p>
              <Button variant="secondary" size="sm" onClick={onApplyAnchorFirst}>
                {f.anchorFirstButton}
              </Button>
            </div>
          ) : null}
          {relocations && relocations.length > 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
              <p className="text-small">
                {relocations.length === 1
                  ? fill(f.fixThisDayOne, { place: nameOf(relocations[0].placeSlug), toDay: relocations[0].toDayNumber })
                  : fill(f.fixThisDayMany, { count: relocations.length })}
              </p>
              <Button variant="secondary" size="sm" onClick={onApplyRelocations}>
                {f.fixThisDay}
              </Button>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-small text-ink-soft">{t.checks.none}</p>
      )}

      <PaceMeter pace={pace} easeLabel={paceEaseLabel} onEase={onEasePace} />
      <Suggestions dayId={dayId} dayNumber={dayNumber} schedule={schedule} date={date} />
      {places.length >= 3 ? <OptimizeRoute dayId={dayId} places={places} /> : null}
    </section>
  );
}

function PaceMeter({ pace, easeLabel, onEase }: { pace: DayPace; easeLabel?: string; onEase?: () => void }) {
  const { dict } = useLocale();
  const t = dict.planner.pace;
  if (pace.dominantFactor === null) return null;

  return (
    <div className="grid gap-2 rounded-lg border border-line bg-panel p-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-small text-ink-soft">{t.label}</span>
        <span className="text-label font-semibold text-brand">{t.bands[pace.band]}</span>
      </div>
      <div
        role="meter"
        aria-label={t.label}
        aria-valuenow={pace.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={t.bands[pace.band]}
        className="h-2 overflow-hidden rounded-full bg-well"
      >
        <div
          className={cx(
            "h-full rounded-full transition-[width] duration-300",
            pace.band === "ambitious" || pace.band === "full" ? "bg-cmj-sunset" : "bg-cmj-leaf",
          )}
          style={{ width: `${pace.score}%` }}
        />
      </div>
      <p className="text-small text-pretty text-ink-soft">{t.bandDescriptions[pace.band]}</p>
      {onEase && easeLabel ? (
        <Button variant="secondary" size="sm" onClick={onEase} className="h-auto min-h-11 justify-self-start py-2 whitespace-normal text-left">
          {easeLabel}
        </Button>
      ) : null}
    </div>
  );
}

function Suggestions({
  dayId,
  dayNumber,
  schedule,
  date,
}: {
  dayId: string;
  dayNumber: number;
  schedule: DaySchedule;
  date: string | null;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.suggestions;
  const { showToast } = useToast();
  const containers = useTripStore((s) => s.containers);
  const addPlace = useTripStore((s) => s.addPlace);
  const moveItem = useTripStore((s) => s.moveItem);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);

  // Anything already in the trip is spoken for.
  const planned = useMemo(() => new Set(Object.values(containers).flat()), [containers]);

  const meals = useMemo(
    () =>
      findMealGaps(schedule).map((gap) => ({
        gap,
        suggestions: suggestMealPlaces({ gap, candidates: allPlaces, excludeSlugs: planned, isoDate: date }),
      })),
    [schedule, planned, date],
  );

  const route = useMemo(() => {
    const leg = findLongestLeg(schedule);
    if (!leg) return null;
    const suggestions = findOnRouteStops({ leg, candidates: allPlaces, excludeSlugs: planned, isoDate: date });
    return suggestions.length > 0 ? { leg, suggestions } : null;
  }, [schedule, planned, date]);

  if (meals.length === 0 && !route) return null;

  function insertAt(place: Place, index: number) {
    addPlace(place.slug);
    moveItem({ slug: place.slug, toContainer: dayId, toIndex: index });
    showToast({
      message: fill(t.added, { place: place.name[locale], day: dayNumber }),
      actions: [{ label: dict.planner.toast.undo, onClick: () => removeFromPlan(place.slug, dayId) }],
    });
  }

  const mealHeadline = (gap: MealGap) =>
    fill(gap.meal === "lunch" ? t.mealGapLunch : t.mealGapDinner, {
      start: minutesToClock(gap.windowStartMinutes),
      end: minutesToClock(gap.windowEndMinutes),
    });

  return (
    <div className="grid gap-4 rounded-lg bg-sand-fill p-4">
      <p className="text-label text-brand">{t.title}</p>

      {meals.map(({ gap, suggestions }) => (
        <div key={gap.meal} className="grid gap-2">
          <p className="flex items-start gap-2 text-small text-pretty">
            <UtensilsCrossed aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
            {mealHeadline(gap)}
          </p>
          {suggestions.length === 0 ? (
            <p className="pl-6 text-small text-ink-soft">{t.mealNone}</p>
          ) : (
            <ul className="grid gap-1 pl-6">
              {suggestions.map(({ place, travelMinutes }) => (
                <SuggestionRow
                  key={place.slug}
                  name={place.name[locale]}
                  detail={fill(t.awayMinutes, { minutes: travelMinutes })}
                  addLabel={fill(t.add, { place: place.name[locale] })}
                  onAdd={() => insertAt(place, gap.insertAfterIndex + 1)}
                />
              ))}
            </ul>
          )}
        </div>
      ))}

      {route ? (
        <div className="grid gap-2">
          <p className="flex items-start gap-2 text-small text-pretty">
            <Route aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
            {fill(t.onRoute, {
              minutes: route.leg.directMinutes,
              from: route.leg.from.name[locale],
              to: route.leg.to.name[locale],
            })}
          </p>
          <ul className="grid gap-1 pl-6">
            {route.suggestions.map(({ place, addedMinutes }) => (
              <SuggestionRow
                key={place.slug}
                name={place.name[locale]}
                detail={addedMinutes === 0 ? t.addedNothing : fill(t.addedMinutes, { minutes: addedMinutes })}
                addLabel={fill(t.add, { place: place.name[locale] })}
                onAdd={() => insertAt(place, route.leg.fromIndex + 1)}
              />
            ))}
          </ul>
        </div>
      ) : null}

      <p className="text-credit text-pretty text-ink-soft">{t.estimateNote}</p>
    </div>
  );
}

function SuggestionRow({
  name,
  detail,
  addLabel,
  onAdd,
}: {
  name: string;
  detail: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="min-w-0 text-small">
        {name} <span className="text-ink-soft">· {detail}</span>
      </span>
      <IconButton label={addLabel} size="sm" className="bg-panel" onClick={onAdd}>
        <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
      </IconButton>
    </li>
  );
}

function OptimizeRoute({ dayId, places }: { dayId: string; places: Place[] }) {
  const { dict } = useLocale();
  const rt = dict.planner.route;
  const { showToast } = useToast();
  const reorderDay = useTripStore((s) => s.reorderDay);
  const [comparison, setComparison] = useState<OptimizationComparison | null>(null);
  const [busy, setBusy] = useState(false);
  const [estimated, setEstimated] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  async function optimize() {
    setBusy(true);
    const { durations, isEstimate } = await fetchDurationMatrix(
      places.map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng, elevation: p.elevation })),
    );
    setBusy(false);
    setEstimated(isEstimate);
    const result = compareOptimization(places, undefined, durations);
    if (!result.changed) {
      showToast({ message: rt.noSavings });
      return;
    }
    setComparison(result);
  }

  function confirm() {
    if (!comparison) return;
    const previous = comparison.before.order.map((p) => p.slug);
    const next = comparison.after.order.map((p) => p.slug);
    const minutes = Math.max(0, Math.round(comparison.minutesSaved));
    reorderDay(dayId, next);
    const message = fill(rt.applied, { minutes });
    showToast({ message, actions: [{ label: dict.planner.toast.undo, onClick: () => reorderDay(dayId, previous) }] });
    setAnnouncement(message);
    setComparison(null);
  }

  const km = (value: number) => fill(dict.browse.km, { km: value.toFixed(1) });

  return (
    <div className="grid gap-3">
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {comparison ? (
        <div className="grid gap-3 rounded-lg border-[1.5px] border-brand bg-panel p-4">
          <p className="text-label text-brand">{rt.compareTitle}</p>
          {estimated ? <p className="text-small text-ink-soft">{rt.fallbackNotice}</p> : null}
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-small tabular-nums">
            <dt className="text-ink-soft">{rt.before}</dt>
            <dd>
              {km(comparison.before.totalDistanceKm)} · {formatDuration(comparison.before.totalTravelMinutes, dict)}
            </dd>
            <dt className="text-ink-soft">{rt.after}</dt>
            <dd className="font-semibold text-brand">
              {km(comparison.after.totalDistanceKm)} · {formatDuration(comparison.after.totalTravelMinutes, dict)}
            </dd>
          </dl>
          <p className="text-small text-brand">
            {fill(rt.distanceSaved, { distance: Math.max(0, comparison.distanceSavedKm).toFixed(1) })} ·{" "}
            {fill(rt.timeSaved, { minutes: Math.max(0, Math.round(comparison.minutesSaved)) })}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={confirm}>
              {rt.confirm}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setComparison(null)}>
              {rt.cancel}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={optimize}
          disabled={busy}
          aria-busy={busy}
          className="justify-self-start"
          icon={busy ? <RouteDots /> : <Sparkles aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
        >
          {busy ? rt.optimizing : rt.optimize}
        </Button>
      )}
    </div>
  );
}
