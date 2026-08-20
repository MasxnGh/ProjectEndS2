"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertTriangle, ChevronDown, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Place } from "@/data/types";
import type { AirQualityResponse, DailyForecastEntry } from "@/lib/weather/types";
import { SortablePlaceItem } from "@/components/planner/sortable-place-item";
import { DayWeatherHeader } from "@/components/planner/day-weather-header";
import { DayWeatherSuggestion } from "@/components/planner/day-weather-suggestion";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { dayStats, formatMinutes, formatThb } from "@/lib/trip-calculations";
import { buildSchedule, compareOptimization, type OptimizationComparison } from "@/lib/planner/schedule";
import { fetchDurationMatrix } from "@/lib/routing/fetch-matrix";
import { checkDayFeasibility } from "@/lib/planner/feasibility";
import { computeDayPace } from "@/lib/planner/pace";
import { PaceMeter } from "@/components/planner/pace-meter";
import { DaySuggestions } from "@/components/planner/day-suggestions";
import { pickDaySuggestion } from "@/lib/weather/day-forecast";
import { useSeasonalAverage } from "@/lib/weather/use-weather";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { useToast } from "@/components/toast/toast-provider";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { cn } from "@/lib/utils";

function formatDayDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export function DayColumn({
  dayId,
  dayNumber,
  places,
  canRemove,
  date,
  forecastEntry,
  isToday,
  airQuality,
  onAddPlace,
  highlighted,
  paceEaseLabel,
  onEasePace,
  hoveredPlaceSlug,
  onHoverPlace,
  focusedItemId,
}: {
  dayId: string;
  dayNumber: number;
  places: Place[];
  canRemove: boolean;
  date?: string;
  forecastEntry?: DailyForecastEntry;
  isToday?: boolean;
  airQuality?: AirQualityResponse;
  onAddPlace: (trigger: HTMLElement) => void;
  highlighted?: boolean;
  paceEaseLabel?: string;
  onEasePace?: () => void;
  hoveredPlaceSlug?: string | null;
  onHoverPlace?: (slug: string | null) => void;
  focusedItemId?: string | null;
}) {
  const { locale, dict } = useLocale();
  const { showToast } = useToast();
  const removeDay = useTripStore((s) => s.removeDay);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const moveItem = useTripStore((s) => s.moveItem);
  const reorderDay = useTripStore((s) => s.reorderDay);
  const travelers = useTripStore((s) => s.travelers);
  const { setNodeRef, isOver } = useDroppable({ id: dayId });
  const t = dict.planner.toast;
  const rt = dict.planner.route;

  const [comparison, setComparison] = useState<OptimizationComparison | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [usedFallbackTimes, setUsedFallbackTimes] = useState(false);

  const stats = dayStats(places);
  const schedule = buildSchedule(places);
  const pace = computeDayPace(places, schedule);
  const feasibilityIssues = checkDayFeasibility(places, date ?? null);
  // Drives the summary chip and whether the disclosure starts open — the
  // things a traveller must not be able to miss.
  const warningCount = feasibilityIssues.length + (schedule.exceedsTenHours ? 1 : 0);
  const hasWarnings = warningCount > 0;
  const suggestion = pickDaySuggestion({
    date,
    entry: forecastEntry,
    isToday: Boolean(isToday),
    airQuality,
  });

  const needsSeasonalAverage = Boolean(date) && !forecastEntry;
  const { data: seasonalAverage } = useSeasonalAverage(
    CHIANGMAI_CENTER.lat,
    CHIANGMAI_CENTER.lng,
    needsSeasonalAverage ? (date as string) : null
  );

  async function handleOptimizeClick() {
    setIsOptimizing(true);
    const { durations, isEstimate } = await fetchDurationMatrix(
      places.map((p) => ({ lat: p.coordinates.lat, lng: p.coordinates.lng, elevation: p.elevation }))
    );
    setIsOptimizing(false);
    setUsedFallbackTimes(isEstimate);

    const result = compareOptimization(places, undefined, durations);
    if (!result.changed) {
      showToast({ message: rt.noSavings });
      return;
    }
    setComparison(result);
  }

  function handleConfirmOptimize() {
    if (!comparison) return;
    const previousOrder = comparison.before.order.map((p) => p.slug);
    const newOrder = comparison.after.order.map((p) => p.slug);
    const minutesSaved = Math.max(0, Math.round(comparison.minutesSaved));

    reorderDay(dayId, newOrder);
    const message = rt.applied.replace("{minutes}", String(minutesSaved));
    showToast({
      message,
      actions: [{ label: t.undo, onClick: () => reorderDay(dayId, previousOrder) }],
    });
    setAnnouncement(message);
    setComparison(null);
  }

  function handleCancelOptimize() {
    setComparison(null);
  }

  return (
    <SpotlightCard
      id={dayId}
      data-day-card=""
      className={cn(
        "flex w-[380px] shrink-0 snap-start scroll-mx-6 flex-col rounded-lg border bg-surface transition-shadow duration-500 lg:w-[400px]",
        highlighted ? "border-accent shadow-[0_0_0_3px_var(--color-accent)]" : "border-border"
      )}
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between border-b border-border p-4 pb-3">
        <div>
          <h3 className="font-serif-display text-lg">
            {dict.planner.day} {dayNumber}
          </h3>
          {date ? <p className="text-xs text-muted-foreground">{formatDayDate(date, locale)}</p> : null}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => onAddPlace(event.currentTarget)}
            className="no-print rounded-full p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-accent-text"
            aria-label={dict.planner.addPlace}
          >
            <Plus className="h-4 w-4" />
          </button>
          {canRemove ? (
            <button
              type="button"
              onClick={() => removeDay(dayId)}
              className="no-print rounded-full p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-destructive"
              aria-label={dict.planner.removeDay}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
      <DayWeatherHeader
        entry={forecastEntry}
        isToday={Boolean(isToday)}
        airQuality={airQuality}
        seasonalAverage={forecastEntry ? undefined : seasonalAverage}
      />
      <DayWeatherSuggestion suggestion={suggestion} />

      <div
        ref={setNodeRef}
        className={`min-h-[120px] flex-1 space-y-2 p-3 transition-colors ${
          isOver ? "bg-accent/10" : ""
        }`}
      >
        <SortableContext items={places.map((p) => p.slug)} strategy={verticalListSortingStrategy}>
          {places.map((place, i) => {
            const stop = schedule.stops[i];
            return (
              <SortablePlaceItem
                key={place.slug}
                itemId={`${dayId}-${place.slug}`}
                place={place}
                index={i}
                arrival={stop?.arrival}
                departure={stop?.departure}
                travelMinutesFromPrevious={stop?.travelMinutesFromPrevious}
                outsideOpeningHours={stop?.outsideOpeningHours}
                hovered={hoveredPlaceSlug === place.slug}
                focused={focusedItemId === `${dayId}-${place.slug}`}
                onHover={onHoverPlace}
                onRemove={() => {
                  removeFromPlan(place.slug, dayId);
                  showToast({
                    message: t.removedFromDay.replace("{day}", String(dayNumber)),
                    actions: [
                      {
                        label: t.undo,
                        onClick: () => moveItem({ slug: place.slug, toContainer: dayId, toIndex: i }),
                      },
                    ],
                  });
                }}
              />
            );
          })}
        </SortableContext>
        {places.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted-foreground">
            {dict.planner.dayEmptyBody}
          </p>
        ) : null}
      </div>

      {/* Always on screen: the two numbers that answer "can I actually do
          this day", side by side rather than stacked. */}
      <div className="grid grid-cols-2 gap-2 border-t border-border p-4 text-sm">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {dict.planner.estimatedTime}
          </p>
          <p className="mt-0.5 font-medium tabular-nums">{formatMinutes(stats.totalMinutes)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {dict.planner.estimatedBudget}
          </p>
          <p className="mt-0.5 font-medium tabular-nums">{formatThb(stats.budgetThb * travelers)}</p>
        </div>
      </div>

      {/* Everything the traveller needs sometimes rather than always. Open by
          default when the day has something wrong with it — a warning nobody
          can see is worse than a tall card. */}
      <details
        open={hasWarnings}
        className="group border-t border-border text-sm [&[open]_.day-details-chevron]:rotate-180"
      >
        <summary className="no-print flex cursor-pointer list-none items-center justify-between gap-2 p-4 hover:bg-surface-muted/50">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium">{dict.planner.dayCard.detailsToggle}</span>
            {warningCount > 0 ? (
              <span className="flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-medium text-destructive">
                <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                {dict.planner.dayCard.warningsChip.replace("{count}", String(warningCount))}
              </span>
            ) : null}
            <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-muted-foreground">
              {dict.planner.pace.bands[pace.band]}
            </span>
          </span>
          <ChevronDown
            className="day-details-chevron h-4 w-4 shrink-0 text-muted-foreground transition-transform"
            aria-hidden="true"
          />
        </summary>

        <div className="space-y-2 px-4 pb-4">
        {schedule.exceedsTenHours ? (
          <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {rt.exceedsTenHours}
          </p>
        ) : null}

        {feasibilityIssues.map((issue) => {
          const place = places.find((p) => p.slug === issue.placeSlug);
          if (!place) return null;
          const message =
            issue.type === "closedOnDay"
              ? issue.suggestedIsoDate
                ? dict.planner.feasibility.closedOnDayWithSuggestion
                    .replace("{place}", place.name[locale])
                    .replace("{date}", formatDayDate(issue.suggestedIsoDate, locale))
                : dict.planner.feasibility.closedOnDay.replace("{place}", place.name[locale])
              : issue.type === "seasonalClosure"
                ? dict.planner.feasibility.seasonalClosure.replace("{place}", place.name[locale])
                : dict.planner.feasibility.hazeSensitive.replace("{place}", place.name[locale]);
          return (
            <p
              key={`${issue.type}-${issue.placeSlug}`}
              className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {message}
            </p>
          );
        })}

        <PaceMeter pace={pace} easeLabel={paceEaseLabel} onEase={onEasePace} />

        <DaySuggestions
          dayId={dayId}
          dayNumber={dayNumber}
          schedule={schedule}
          date={date}
        />

        {places.length >= 3 ? (
          <button
            type="button"
            onClick={handleOptimizeClick}
            disabled={isOptimizing}
            className="no-print mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-border-strong px-3 py-2 text-xs font-medium hover:border-accent hover:text-accent-text disabled:cursor-wait disabled:opacity-60"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isOptimizing ? rt.optimizing : rt.optimize}
          </button>
        ) : null}

        {comparison ? (
          <div className="no-print space-y-3 rounded-md border border-accent bg-surface-muted/60 p-3 text-xs">
            <p className="font-medium text-foreground">{rt.compareTitle}</p>
            {usedFallbackTimes ? <p className="text-muted-foreground">{rt.fallbackNotice}</p> : null}
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{rt.before}</span>
              <span>
                {comparison.before.totalDistanceKm.toFixed(1)} km ·{" "}
                {formatMinutes(comparison.before.totalTravelMinutes)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{rt.after}</span>
              <span className="font-medium text-accent-text">
                {comparison.after.totalDistanceKm.toFixed(1)} km ·{" "}
                {formatMinutes(comparison.after.totalTravelMinutes)}
              </span>
            </div>
            <p className="text-accent-text">
              {rt.distanceSaved.replace("{distance}", Math.max(0, comparison.distanceSavedKm).toFixed(1))}
              {" · "}
              {rt.timeSaved.replace("{minutes}", String(Math.max(0, Math.round(comparison.minutesSaved))))}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleConfirmOptimize}
                className="flex-1 rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground"
              >
                {rt.confirm}
              </button>
              <button
                type="button"
                onClick={handleCancelOptimize}
                className="flex-1 rounded-full border border-border-strong px-3 py-1.5 font-medium hover:border-accent hover:text-accent-text"
              >
                {rt.cancel}
              </button>
            </div>
          </div>
        ) : null}
        </div>
      </details>
    </SpotlightCard>
  );
}
