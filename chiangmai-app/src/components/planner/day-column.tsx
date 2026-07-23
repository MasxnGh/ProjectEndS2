"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import type { Place } from "@/data/types";
import type { AirQualityResponse, DailyForecastEntry } from "@/lib/weather/types";
import { SortablePlaceItem } from "@/components/planner/sortable-place-item";
import { DayWeatherHeader } from "@/components/planner/day-weather-header";
import { DayWeatherSuggestion } from "@/components/planner/day-weather-suggestion";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { dayStats, formatMinutes, formatThb } from "@/lib/trip-calculations";
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
  const autoArrangeDay = useTripStore((s) => s.autoArrangeDay);
  const travelers = useTripStore((s) => s.travelers);
  const { setNodeRef, isOver } = useDroppable({ id: dayId });
  const t = dict.planner.toast;

  const stats = dayStats(places);
  const suggestion = pickDaySuggestion({
    date,
    entry: forecastEntry,
    isToday: Boolean(isToday),
    airQuality,
  });

  return (
    <div
      id={dayId}
      className={cn(
        "flex w-[300px] shrink-0 scroll-mx-6 flex-col rounded-lg border bg-surface transition-shadow duration-500",
        highlighted ? "border-accent shadow-[0_0_0_3px_var(--color-accent)]" : "border-border"
      )}
    >
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
          {places.map((place, i) => (
            <SortablePlaceItem
              key={place.slug}
              place={place}
              index={i}
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
          ))}
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
        {places.length >= 3 ? (
          <button
            type="button"
            onClick={() => autoArrangeDay(dayId)}
            className="no-print mt-2 flex w-full items-center justify-center gap-1.5 rounded-full border border-border-strong px-3 py-2 text-xs font-medium hover:border-accent hover:text-accent-text"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {dict.planner.autoArrange}
          </button>
        ) : null}
      </div>
    </div>
  );
}
