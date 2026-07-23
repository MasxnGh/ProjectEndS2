"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Check, CloudSun, Compass, Copy, Plus, Printer, Save } from "lucide-react";
import { places } from "@/data/places";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useLocale } from "@/components/providers/locale-provider";
import { dayStats } from "@/lib/trip-calculations";
import { PlanImportListener } from "@/components/planner/plan-import-listener";
import { UnscheduledPanel } from "@/components/planner/unscheduled-panel";
import { DayColumn } from "@/components/planner/day-column";
import { GoogleTripMap } from "@/components/planner/google-trip-map";
import { TripDetailsForm } from "@/components/planner/trip-details-form";
import { SummaryView } from "@/components/planner/summary-view";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { SectionHeading } from "@/components/section-heading";
import { SeasonalSmogBanner } from "@/components/weather/seasonal-smog-banner";
import { cn } from "@/lib/utils";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { useWeatherBundle } from "@/lib/weather/use-weather";
import { resolveDayDate, findDailyForecast, isBadWeatherDay } from "@/lib/weather/day-forecast";
import type { AqiLevel } from "@/lib/weather/types";

const BAD_AQI_LEVELS: AqiLevel[] = ["unhealthy", "very-unhealthy", "hazardous"];

function findContainerOf(containers: Record<string, string[]>, slug: string) {
  return Object.keys(containers).find((key) => containers[key].includes(slug));
}

export function PlannerBoard() {
  const { locale, dict } = useLocale();

  const dayIds = useTripStore((s) => s.dayIds);
  const containers = useTripStore((s) => s.containers);
  const addDay = useTripStore((s) => s.addDay);
  const moveItem = useTripStore((s) => s.moveItem);
  const travelers = useTripStore((s) => s.travelers);
  const travelDate = useTripStore((s) => s.travelDate);

  const [view, setView] = useState<"list" | "map" | "summary">("list");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState(false);
  const [sharedMessage, setSharedMessage] = useState(false);
  const [reflowStatus, setReflowStatus] = useState<"idle" | "applied" | "noChange" | "needsDate">("idle");

  const weatherBundle = useWeatherBundle(CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const resolvedDays = useMemo(
    () =>
      dayIds.map((id, i) => ({
        id,
        dayNumber: i + 1,
        places: (containers[id] ?? [])
          .map((slug) => places.find((p) => p.slug === slug))
          .filter((p): p is NonNullable<typeof p> => Boolean(p)),
      })),
    [dayIds, containers]
  );

  const unscheduledPlaces = useMemo(
    () =>
      (containers[UNSCHEDULED] ?? [])
        .map((slug) => places.find((p) => p.slug === slug))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [containers]
  );

  const tripTotals = useMemo(() => {
    return resolvedDays.reduce(
      (acc, day) => {
        const stats = dayStats(day.places);
        return {
          minutes: acc.minutes + stats.totalMinutes,
          budget: acc.budget + stats.budgetThb,
          places: acc.places + day.places.length,
        };
      },
      { minutes: 0, budget: 0, places: 0 }
    );
  }, [resolvedDays]);

  const isEmpty = tripTotals.places === 0 && unscheduledPlaces.length === 0;
  const activePlace = activeSlug ? places.find((p) => p.slug === activeSlug) : null;

  const todayDate = weatherBundle.weather?.daily[0]?.date;

  const dayForecasts = useMemo(
    () =>
      resolvedDays.map((day) => {
        const date = resolveDayDate(travelDate, day.dayNumber);
        const entry = findDailyForecast(weatherBundle.weather?.daily, date);
        const isToday = Boolean(date) && date === todayDate;
        return { dayId: day.id, date, entry, isToday };
      }),
    [resolvedDays, travelDate, weatherBundle.weather, todayDate]
  );

  function handleReflowByWeather() {
    if (!travelDate) {
      setReflowStatus("needsDate");
      setTimeout(() => setReflowStatus("idle"), 3000);
      return;
    }
    if (!weatherBundle.weather) return;

    const badDayIds = dayForecasts
      .filter(
        (d) =>
          isBadWeatherDay(d.entry) ||
          (d.isToday && weatherBundle.airQuality && BAD_AQI_LEVELS.includes(weatherBundle.airQuality.level))
      )
      .map((d) => d.dayId);
    const goodDayIds = dayForecasts
      .filter((d) => d.date && !badDayIds.includes(d.dayId))
      .map((d) => d.dayId);

    const working: Record<string, string[]> = {};
    for (const id of [...badDayIds, ...goodDayIds]) working[id] = [...(containers[id] ?? [])];

    const swaps: { outdoorSlug: string; badDay: string; indoorSlug: string; goodDay: string }[] = [];

    for (const badDay of badDayIds) {
      const outdoorSlug = working[badDay]?.find((slug) => places.find((p) => p.slug === slug)?.outdoor);
      if (!outdoorSlug) continue;
      const goodDay = goodDayIds.find(
        (id) => id !== badDay && working[id]?.some((slug) => places.find((p) => p.slug === slug)?.outdoor === false)
      );
      if (!goodDay) continue;
      const indoorSlug = working[goodDay].find((slug) => places.find((p) => p.slug === slug)?.outdoor === false)!;

      working[badDay] = working[badDay].filter((s) => s !== outdoorSlug);
      working[goodDay] = working[goodDay].filter((s) => s !== indoorSlug);
      swaps.push({ outdoorSlug, badDay, indoorSlug, goodDay });
    }

    if (!swaps.length) {
      setReflowStatus("noChange");
      setTimeout(() => setReflowStatus("idle"), 3000);
      return;
    }

    for (const swap of swaps) {
      moveItem({ slug: swap.outdoorSlug, toContainer: swap.goodDay, toIndex: containers[swap.goodDay]?.length ?? 0 });
      moveItem({ slug: swap.indoorSlug, toContainer: swap.badDay, toIndex: containers[swap.badDay]?.length ?? 0 });
    }
    setReflowStatus("applied");
    setTimeout(() => setReflowStatus("idle"), 3000);
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveSlug(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSlug(null);
    const { active, over } = event;
    if (!over) return;

    const activeSlugId = String(active.id);
    const overId = String(over.id);
    const allContainerIds = [UNSCHEDULED, ...dayIds];

    let toContainer: string;
    let toIndex: number;

    if (allContainerIds.includes(overId)) {
      toContainer = overId;
      toIndex = containers[overId]?.length ?? 0;
    } else {
      const container = findContainerOf(containers, overId);
      if (!container) return;
      toContainer = container;
      toIndex = containers[container].indexOf(overId);
    }

    moveItem({ slug: activeSlugId, toContainer, toIndex });
  }

  function handleShare() {
    const data = { dayIds, containers };
    const encoded = encodeURIComponent(btoa(JSON.stringify(data)));
    const url = `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
    navigator.clipboard?.writeText(url);
    setSharedMessage(true);
    setTimeout(() => setSharedMessage(false), 2500);
  }

  function handleSave() {
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <Suspense fallback={null}>
        <PlanImportListener />
      </Suspense>
      <SectionHeading kicker={dict.nav.planner} title={dict.planner.title} subtitle={dict.planner.subtitle} />

      <div className="mt-8">
        <TripDetailsForm
          stats={
            isEmpty
              ? undefined
              : {
                  days: dayIds.length,
                  places: tripTotals.places,
                  minutes: tripTotals.minutes,
                  budgetThb: tripTotals.budget * travelers,
                }
          }
        />
      </div>

      <div className="mt-6">
        <SeasonalSmogBanner referenceDate={travelDate} />
      </div>

      {isEmpty ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong py-24 text-center">
          <Compass className="h-8 w-8 text-accent-text" />
          <h2 className="font-serif-display text-2xl">{dict.planner.emptyTitle}</h2>
          <p className="max-w-sm text-muted-foreground">{dict.planner.emptyBody}</p>
          <Link
            href={`/${locale}/explore`}
            className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground"
          >
            {dict.planner.exploreButton}
          </Link>
        </div>
      ) : (
        <>
          <div className="no-print mt-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-1 rounded-full border border-border p-1 w-fit">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  view === "list" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {dict.planner.listView}
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  view === "map" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {dict.planner.mapView}
              </button>
              <button
                type="button"
                onClick={() => setView("summary")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  view === "summary" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {dict.planner.summaryView}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleReflowByWeather}
                  className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent-text"
                >
                  <CloudSun className="h-4 w-4" />
                  {dict.weather.planner.reflow.button}
                </button>
                {reflowStatus !== "idle" ? (
                  <div className="absolute left-0 top-full z-10 mt-2 w-64 rounded-lg border border-border bg-background p-3 text-xs text-foreground/75 shadow-lg">
                    {reflowStatus === "applied"
                      ? dict.weather.planner.reflow.applied
                      : reflowStatus === "needsDate"
                        ? dict.weather.planner.reflow.needsDate
                        : dict.weather.planner.reflow.noChange}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent-text"
              >
                {savedMessage ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {savedMessage ? dict.planner.saved : dict.planner.save}
              </button>
              <button
                type="button"
                onClick={handleShare}
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent-text"
              >
                {sharedMessage ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {sharedMessage ? dict.planner.shared : dict.planner.share}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent-text"
              >
                <Printer className="h-4 w-4" />
                {dict.planner.print}
              </button>
            </div>
          </div>

          {view === "summary" ? (
            <div className="mt-8">
              <SummaryView days={resolvedDays} />
            </div>
          ) : view === "map" ? (
            <div className="mt-8">
              <GoogleTripMap days={resolvedDays} className="h-[420px]" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="mt-8">
                <UnscheduledPanel places={unscheduledPlaces} />
              </div>

              <div className="mt-8 flex gap-5 overflow-x-auto pb-4">
                {resolvedDays.map((day) => {
                  const forecast = dayForecasts.find((d) => d.dayId === day.id);
                  return (
                    <DayColumn
                      key={day.id}
                      dayId={day.id}
                      dayNumber={day.dayNumber}
                      places={day.places}
                      canRemove={dayIds.length > 1}
                      date={forecast?.date}
                      forecastEntry={forecast?.entry}
                      isToday={forecast?.isToday}
                      airQuality={weatherBundle.airQuality}
                    />
                  );
                })}
                <button
                  type="button"
                  onClick={addDay}
                  className="no-print flex w-[220px] shrink-0 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border-strong text-sm text-muted-foreground hover:border-accent hover:text-accent-text"
                >
                  <Plus className="h-5 w-5" />
                  {dict.planner.addDay}
                </button>
              </div>

              <DragOverlay>
                {activePlace ? (
                  <div className="flex items-center gap-3 rounded-md border border-accent bg-background p-2.5 shadow-elevated">
                    <PlaceImage
                      category={activePlace.category}
                      paletteSeed={activePlace.paletteSeed}
                      photoSrc={getPlacePhoto(activePlace.slug)}
                      sizes="40px"
                      className="h-10 w-10 shrink-0 rounded"
                    />
                    <p className="text-sm font-medium">{activePlace.name[locale]}</p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </>
      )}
    </div>
  );
}
