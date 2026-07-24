"use client";

import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { AlertTriangle, Plus, Sparkles, Trash2 } from "lucide-react";
import type { Place } from "@/data/types";
import type { AirQualityResponse, DailyForecastEntry } from "@/lib/weather/types";
import { SortablePlaceItem } from "@/components/planner/sortable-place-item";
import { DayWeatherHeader } from "@/components/planner/day-weather-header";
import { DayWeatherSuggestion } from "@/components/planner/day-weather-suggestion";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { dayStats, formatMinutes, formatThb } from "@/lib/trip-calculations";
import { buildSchedule, compareOptimization, type OptimizationComparison } from "@/lib/planner/schedule";
import { pickDaySuggestion } from "@/lib/weather/day-forecast";
import { useToast } from "@/components/toast/toast-provider";
import { cn } from "@/lib/utils";

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
}) {
  const { dict } = useLocale();
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

  const stats = dayStats(places);
  const schedule = buildSchedule(places);
  const suggestion = pickDaySuggestion({
    date,
    entry: forecastEntry,
    isToday: Boolean(isToday),
    airQuality,
  });

  function handleOptimizeClick() {
    const result = compareOptimization(places);
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
    <div
      id={dayId}
      className={cn(
        "flex w-[300px] shrink-0 scroll-mx-6 flex-col rounded-lg border bg-surface transition-shadow duration-500",
        highlighted ? "border-accent shadow-[0_0_0_3px_var(--color-accent)]" : "border-border"
      )}
    >
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <div className="flex items-center justify-between border-b border-border p-4 pb-3">
        <h3 className="font-serif-display text-lg">
          {dict.planner.day} {dayNumber}
        </h3>
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
      <DayWeatherHeader entry={forecastEntry} isToday={Boolean(isToday)} airQuality={airQuality} />
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
                place={place}
                index={i}
                arrival={stop?.arrival}
                departure={stop?.departure}
                travelMinutesFromPrevious={stop?.travelMinutesFromPrevious}
                outsideOpeningHours={stop?.outsideOpeningHours}
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

      <div className="space-y-2 border-t border-border p-4 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>{dict.planner.estimatedTime}</span>
          <span className="font-medium text-foreground">{formatMinutes(stats.totalMinutes)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>{dict.planner.estimatedBudget}</span>
          <span className="font-medium text-foreground">{formatThb(stats.budgetThb * travelers)}</span>
        </div>

        {schedule.exceedsTenHours ? (
          <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {rt.exceedsTenHours}
          </p>
        ) : null}

        {places.length >= 3 ? (
          <button
            type="button"
            onClick={handleOptimizeClick}
            className="no-print mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-border-strong px-3 py-2 text-xs font-medium hover:border-accent hover:text-accent-text"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {rt.optimize}
          </button>
        ) : null}

        {comparison ? (
          <div className="no-print space-y-3 rounded-md border border-accent bg-surface-muted/60 p-3 text-xs">
            <p className="font-medium text-foreground">{rt.compareTitle}</p>
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
    </div>
  );
}
