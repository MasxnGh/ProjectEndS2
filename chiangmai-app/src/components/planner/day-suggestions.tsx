"use client";

import { useMemo } from "react";
import { Plus, Route, UtensilsCrossed } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMotionTokens } from "@/lib/motion";
import type { Place } from "@/data/types";
import type { DaySchedule } from "@/lib/planner/schedule";
import { places as allPlaces } from "@/data/places";
import { findMealGaps, suggestMealPlaces, type MealGap } from "@/lib/planner/meals";
import { findLongestLeg, findOnRouteStops } from "@/lib/planner/detours";
import { minutesToClock } from "@/lib/opening-hours";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";

/**
 * Rendered in the day card's footer rather than between the stops themselves:
 * the stop list is a dnd-kit SortableContext, and interleaving non-sortable
 * nodes into it breaks keyboard drag ordering.
 */
export function DaySuggestions({
  dayId,
  dayNumber,
  schedule,
  date,
}: {
  dayId: string;
  dayNumber: number;
  schedule: DaySchedule;
  date?: string;
}) {
  const { locale, dict } = useLocale();
  const { showToast } = useToast();
  const containers = useTripStore((s) => s.containers);
  const addPlace = useTripStore((s) => s.addPlace);
  const moveItem = useTripStore((s) => s.moveItem);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const t = dict.planner.suggestions;
  const m = useMotionTokens();

  // Anything anywhere in the trip is already spoken for — suggesting it again
  // would just move it out of the day it is already on.
  const plannedSlugs = useMemo(
    () => new Set(Object.values(containers).flat()),
    [containers]
  );

  const mealBlocks = useMemo(() => {
    return findMealGaps(schedule).map((gap) => ({
      gap,
      suggestions: suggestMealPlaces({
        gap,
        candidates: allPlaces,
        excludeSlugs: plannedSlugs,
        isoDate: date ?? null,
      }),
    }));
  }, [schedule, plannedSlugs, date]);

  const routeBlock = useMemo(() => {
    const leg = findLongestLeg(schedule);
    if (!leg) return null;
    const suggestions = findOnRouteStops({
      leg,
      candidates: allPlaces,
      excludeSlugs: plannedSlugs,
      isoDate: date ?? null,
    });
    return suggestions.length > 0 ? { leg, suggestions } : null;
  }, [schedule, plannedSlugs, date]);

  if (mealBlocks.length === 0 && !routeBlock) return null;

  /** Drops a place straight into this day at `index` — addPlace parks it in the unscheduled tray, moveItem puts it where it belongs. */
  function insertAt(place: Place, index: number) {
    addPlace(place.slug);
    moveItem({ slug: place.slug, toContainer: dayId, toIndex: index });
    showToast({
      message: t.added.replace("{place}", place.name[locale]).replace("{day}", String(dayNumber)),
      actions: [
        { label: dict.planner.toast.undo, onClick: () => removeFromPlan(place.slug, dayId) },
      ],
    });
  }

  function mealHeadline(gap: MealGap) {
    const template = gap.meal === "lunch" ? t.mealGapLunch : t.mealGapDinner;
    return template
      .replace("{start}", minutesToClock(gap.windowStartMinutes))
      .replace("{end}", minutesToClock(gap.windowEndMinutes));
  }

  return (
    <div className="no-print space-y-3 rounded-md border border-border bg-surface-muted/40 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t.title}</p>

      {mealBlocks.map(({ gap, suggestions }) => (
        <div key={gap.meal} className="space-y-2">
          <p className="flex items-start gap-1.5 text-xs text-foreground">
            <UtensilsCrossed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" />
            {mealHeadline(gap)}
          </p>
          {suggestions.length === 0 ? (
            <p className="pl-5 text-xs text-muted-foreground">{t.mealNone}</p>
          ) : (
            <ul className="space-y-1.5 pl-5">
              {/* Clicking + plans the place, which drops it out of this list.
                  Letting it leave rather than vanish is the confirmation. */}
              <AnimatePresence initial={false}>
                {suggestions.map(({ place, travelMinutes }) => (
                  <SuggestionRow
                    key={place.slug}
                    place={place}
                    detail={t.awayMinutes.replace("{minutes}", String(travelMinutes))}
                    addLabel={t.add.replace("{place}", place.name[locale])}
                    onAdd={() => insertAt(place, gap.insertAfterIndex + 1)}
                    locale={locale}
                    reduced={m.reduced}
                  />
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      ))}

      {routeBlock ? (
        <div className="space-y-2">
          <p className="flex items-start gap-1.5 text-xs text-foreground">
            <Route className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" />
            {t.onRoute
              .replace("{minutes}", String(routeBlock.leg.directMinutes))
              .replace("{from}", routeBlock.leg.from.name[locale])
              .replace("{to}", routeBlock.leg.to.name[locale])}
          </p>
          <ul className="space-y-1.5 pl-5">
            <AnimatePresence initial={false}>
              {routeBlock.suggestions.map(({ place, addedMinutes }) => (
                <SuggestionRow
                  key={place.slug}
                  place={place}
                  detail={
                    addedMinutes === 0
                      ? t.addedNothing
                      : t.addedMinutes.replace("{minutes}", String(addedMinutes))
                  }
                  addLabel={t.add.replace("{place}", place.name[locale])}
                  onAdd={() => insertAt(place, routeBlock.leg.fromIndex + 1)}
                  locale={locale}
                  reduced={m.reduced}
                />
              ))}
            </AnimatePresence>
          </ul>
        </div>
      ) : null}

      <p className="text-xs leading-snug text-muted-foreground">{t.estimateNote}</p>
    </div>
  );
}

function SuggestionRow({
  place,
  detail,
  addLabel,
  onAdd,
  locale,
  reduced,
}: {
  place: Place;
  detail: string;
  addLabel: string;
  onAdd: () => void;
  locale: "en" | "th";
  reduced: boolean;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, x: reduced ? 0 : -6 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reduced ? 0 : 12, height: 0 }}
      transition={{ duration: reduced ? 0 : 0.25 }}
      className="flex items-center justify-between gap-2"
    >
      <span className="min-w-0 flex-1 truncate text-xs">
        {place.name[locale]}{" "}
        <span className="text-muted-foreground">{detail}</span>
      </span>
      <button
        type="button"
        onClick={onAdd}
        aria-label={addLabel}
        className="shrink-0 rounded-full border border-border-strong p-1 text-muted-foreground hover:border-accent hover:text-accent-text"
      >
        <Plus className="h-3 w-3" />
      </button>
    </motion.li>
  );
}
