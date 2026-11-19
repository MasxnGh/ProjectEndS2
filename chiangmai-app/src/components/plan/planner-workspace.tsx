"use client";

import { Suspense, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { GripVertical, List, Map as MapIcon, Navigation, Route, Sun, Sunset, Trash2, TriangleAlert } from "lucide-react";
import { places as catalogue } from "@/data/places";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { Skeleton } from "@/components/brand/loaders";
import { useTripStore, useTripStoreHydrated, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { useMediaQuery } from "@/lib/use-media-query";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { minutesToClock } from "@/lib/opening-hours";
import { categorySpendBreakdown, dayStats, estimateTripCostThb } from "@/lib/trip-calculations";
import { buildSchedule } from "@/lib/planner/schedule";
import { buildDayTimeline, resolveSunTimes, type DayTimeline } from "@/lib/planner/golden-hour";
import { checkDayFeasibility, suggestDayFixes } from "@/lib/planner/feasibility";
import { computeDayPace, suggestPaceRelief } from "@/lib/planner/pace";
import { derivePlanProgress } from "@/lib/planner/plan-progress";
import { farthestWalkLeg } from "@/lib/planner/walk-check";
import { useTripCloudSync } from "@/lib/planner/use-trip-cloud-sync";
import { useWeatherBundle } from "@/lib/weather/use-weather";
import { findDailyForecast, isBadWeatherDay, isBurningSeasonDate, resolveDayDate } from "@/lib/weather/day-forecast";
import type { AqiLevel } from "@/lib/weather/types";
import { PlanImportListener } from "@/components/planner/plan-import-listener";
import { PlacePickerUrlSync } from "@/components/planner/place-picker-url-sync";
import { PlannerHighlightSync } from "@/components/planner/planner-highlight-sync";
import { Badge } from "@/components/brand/badge";
import { Button } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { SignInPrompt } from "@/components/brand/sign-in-prompt";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, formatDistance, formatDuration } from "@/components/brand/place-text";
import { AiPlannerDialog } from "./ai-planner-dialog";
import { DayChecks } from "./day-checks";
import { DAY_PANEL_ID, DayTabs } from "./day-tabs";
import { useDayWeather } from "./day-weather";
import { FinishSection, SaveStatus, type SaveState } from "./finish-section";
import { dayMapsLink } from "./maps-link";
import { PlacePickerDialog } from "./place-picker-dialog";
import { MigrationChoiceDialog, SavedTripLoader } from "./plan-dialogs";
import { PlanDock } from "./plan-dock";
import { PlanEmpty } from "./plan-empty";
import { PlanMapLoader } from "./plan-map-loader";
import { baht, longDayDate, stopsLabel, todayIso } from "./plan-text";
import { PrintItinerary } from "./print-itinerary";
import { moveFromTo } from "./restore";
import { parseItemId, StopList } from "./stop-list";
import { TripHead } from "./trip-head";
import { TripNotes } from "./trip-notes";
import { TripOverview } from "./trip-overview";
import { UnscheduledTray } from "./unscheduled-tray";

const BAD_AQI_LEVELS: AqiLevel[] = ["unhealthy", "very-unhealthy", "hazardous"];
const FLASH_MS = 2500;

const bySlug = new Map(catalogue.map((p) => [p.slug, p]));
const resolve = (slugs: string[] | undefined): Place[] =>
  (slugs ?? []).map((slug) => bySlug.get(slug)).filter((p): p is Place => Boolean(p));

/**
 * Drops on a day tab win while the pointer is over one — that is how a stop
 * goes to another day by dragging. Everywhere else, the nearest list or stop.
 * Keyboard drags have no pointer, so they stay within the open lists.
 */
const collision: CollisionDetection = (args) => {
  const tab = pointerWithin(args).find((c) => String(c.id).startsWith("tab:"));
  if (tab) return [tab];
  return closestCorners({
    ...args,
    droppableContainers: args.droppableContainers.filter((c) => !String(c.id).startsWith("tab:")),
  });
};

/** The page before the saved plan is read: the same frame, nothing in it yet. */
function WorkspaceSkeleton() {
  const { dict } = useLocale();
  return (
    <div
      data-brand
      aria-busy="true"
      className="bg-page font-brand text-ink lg:grid lg:h-[calc(100svh-73px)] lg:min-h-[720px] lg:grid-cols-[520px_minmax(0,1fr)]"
    >
      <p className="sr-only">{dict.common.loading}</p>
      <div aria-hidden className="grid content-start gap-5 px-4 py-6 sm:px-6 lg:border-r lg:border-line lg:p-8">
        <Skeleton className="h-9 w-3/4 rounded-md" />
        <div className="flex flex-wrap gap-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-11 w-28 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-14 w-2/3 rounded-lg" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 rounded-lg" />
        ))}
      </div>
      <Skeleton ground="map" className="hidden lg:block" />
    </div>
  );
}

export function PlannerWorkspace({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const hydrated = useTripStoreHydrated();
  if (!hydrated) return <WorkspaceSkeleton />;
  return <Workspace aiEnabled={aiEnabled} />;
}

function Workspace({ aiEnabled }: { aiEnabled: boolean }) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const { showToast } = useToast();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const dayIds = useTripStore((s) => s.dayIds);
  const containers = useTripStore((s) => s.containers);
  const lockedTimes = useTripStore((s) => s.lockedTimes);
  const baseLocation = useTripStore((s) => s.baseLocation);
  const travelDate = useTripStore((s) => s.travelDate);
  const travelers = useTripStore((s) => s.travelers);
  const travelMode = useTripStore((s) => s.travelMode);
  const accommodationThb = useTripStore((s) => s.accommodationThb);
  const tripName = useTripStore((s) => s.tripName);
  const remoteTripId = useTripStore((s) => s.remoteTripId);
  const addDay = useTripStore((s) => s.addDay);
  const removeDay = useTripStore((s) => s.removeDay);
  const loadPlan = useTripStore((s) => s.loadPlan);
  const setBaseLocation = useTripStore((s) => s.setBaseLocation);

  const cloudSync = useTripCloudSync();
  const weatherBundle = useWeatherBundle(CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng);

  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedView, setView] = useState<"list" | "map">("list");
  const view = isDesktop ? "list" : selectedView;
  const [highlightedDayId, setHighlightedDayId] = useState<string | null>(null);
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  // While a stop hovers a day tab, the list must not scroll the tab away from under it.
  const [overTab, setOverTab] = useState(false);
  const [picking, setPicking] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);
  const [shared, setShared] = useState(false);
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const pickerPushedRef = useRef(false);

  const dayId = selectedDayId && dayIds.includes(selectedDayId) ? selectedDayId : dayIds[0];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Derived data: the old board's, with the same functions ──

  const resolvedDays = useMemo(
    () => dayIds.map((id, i) => ({ id, dayNumber: i + 1, places: resolve(containers[id]) })),
    [dayIds, containers],
  );
  const unscheduledPlaces = useMemo(() => resolve(containers[UNSCHEDULED]), [containers]);

  const tripTotals = useMemo(
    () =>
      resolvedDays.reduce(
        (acc, day) => ({ minutes: acc.minutes + dayStats(day.places).totalMinutes, places: acc.places + day.places.length }),
        { minutes: 0, places: 0 },
      ),
    [resolvedDays],
  );

  // The one "estimated cost": the overview's budget tab computes it the same way.
  const estimatedCostThb = useMemo(
    () => estimateTripCostThb(categorySpendBreakdown(resolvedDays, travelMode), travelers, accommodationThb),
    [resolvedDays, travelMode, travelers, accommodationThb],
  );

  const planProgress = useMemo(
    () =>
      derivePlanProgress({
        travelDate,
        days: resolvedDays,
        unscheduledCount: unscheduledPlaces.length,
        savedOrShared: Boolean(remoteTripId) || shared,
      }),
    [travelDate, resolvedDays, unscheduledPlaces.length, remoteTripId, shared],
  );

  const todayDate = weatherBundle.weather?.daily[0]?.date;
  const dayForecasts = useMemo(
    () =>
      resolvedDays.map((day) => {
        const date = resolveDayDate(travelDate, day.dayNumber);
        const entry = findDailyForecast(weatherBundle.weather?.daily, date);
        const isToday = Boolean(date) && date === todayDate;
        // Burning season is a calendar fact, so a far-off date is still caught.
        const isHazeSensitive =
          Boolean(date) && isBurningSeasonDate(date) && day.places.some((p) => p.outdoor && p.dustSensitivity === "high");
        return { dayId: day.id, date, entry, isToday, isHazeSensitive };
      }),
    [resolvedDays, travelDate, weatherBundle.weather, todayDate],
  );

  // Every day's Golden Hour timeline: the open day's list and the printout read the same one.
  const timelines = useMemo(() => {
    const result = new Map<string, DayTimeline>();
    for (const day of resolvedDays) {
      const forecast = dayForecasts.find((d) => d.dayId === day.id);
      const prefix = `${day.id}::`;
      const lockedArrivals: Record<string, string> = {};
      for (const [key, clock] of Object.entries(lockedTimes)) {
        if (key.startsWith(prefix)) lockedArrivals[key.slice(prefix.length)] = clock;
      }
      const sun = resolveSunTimes(forecast?.entry, CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng, forecast?.date ?? todayIso());
      result.set(day.id, buildDayTimeline({ order: day.places, sun, baseLocation, lockedArrivals }));
    }
    return result;
  }, [resolvedDays, dayForecasts, lockedTimes, baseLocation]);

  // The printout's days, kept stable so hovering and dragging don't rebuild its numbers.
  const printDays = useMemo(
    () =>
      resolvedDays.map((x) => ({
        dayNumber: x.dayNumber,
        date: dayForecasts.find((f) => f.dayId === x.id)?.date ?? undefined,
        timeline: timelines.get(x.id)!,
      })),
    [resolvedDays, dayForecasts, timelines],
  );

  const paceRelief = useMemo(
    () => suggestPaceRelief(resolvedDays.map((day) => ({ dayId: day.id, places: day.places, schedule: buildSchedule(day.places) }))),
    [resolvedDays],
  );

  const relocationsByDay = useMemo(() => {
    const dayNumberOf = new Map(resolvedDays.map((day) => [day.id, day.dayNumber]));
    const grouped = new Map<string, { placeSlug: string; toDayNumber: number }[]>();
    const feasibilityDays = resolvedDays.map((day) => ({
      dayId: day.id,
      isoDate: dayForecasts.find((d) => d.dayId === day.id)?.date ?? null,
      places: day.places,
    }));
    for (const relocation of suggestDayFixes(feasibilityDays)) {
      const list = grouped.get(relocation.fromDayId) ?? [];
      list.push({ placeSlug: relocation.placeSlug, toDayNumber: dayNumberOf.get(relocation.toDayId) ?? 0 });
      grouped.set(relocation.fromDayId, list);
    }
    return grouped;
  }, [resolvedDays, dayForecasts]);

  const isEmpty = tripTotals.places === 0 && unscheduledPlaces.length === 0;
  const day = resolvedDays.find((d) => d.id === dayId) ?? resolvedDays[0];
  const forecast = dayForecasts.find((d) => d.dayId === day.id);
  const timeline = timelines.get(day.id)!;
  const schedule = buildSchedule(day.places);
  const stats = dayStats(day.places);
  const farWalk = farthestWalkLeg(day.places, travelMode);
  const dayChoices = resolvedDays.map((d) => ({ id: d.id, dayNumber: d.dayNumber }));
  const mapsLink = dayMapsLink(day.places, dict);
  const weather = useDayWeather({
    date: forecast?.date ?? null,
    entry: forecast?.entry,
    isToday: Boolean(forecast?.isToday),
    airQuality: weatherBundle.airQuality,
  });

  const saveState: SaveState =
    !cloudSync.isSignedIn || cloudSync.migrationDeclined
      ? "local"
      : cloudSync.saveStatus === "saving"
        ? "saving"
        : cloudSync.saveStatus === "failed"
          ? "failed"
          : cloudSync.saveStatus === "saved" || remoteTripId
            ? "saved"
            : "local";

  // ── Handlers, ported ──

  function handleSave() {
    if (!cloudSync.isSignedIn) {
      setSignInOpen(true);
      return;
    }
    cloudSync.requestSave();
  }

  function flash<T>(value: T, set: React.Dispatch<React.SetStateAction<T | null>>) {
    set(value);
    setTimeout(() => set((current) => (current === value ? null : current)), FLASH_MS);
  }

  function handleHighlightDay(target: string) {
    if (!useTripStore.getState().dayIds.includes(target)) return;
    setSelectedDayId(target);
    flash(target, setHighlightedDayId);
  }

  function handleSelectPlace(slug: string) {
    setView("list");
    flash(slug, setFocusedSlug);
  }

  function openPicker(targetDayId: string) {
    const wasOpen = pickerDayId !== null;
    setPickerDayId(targetDayId);
    if (wasOpen) {
      router.replace(`${pathname}?add=${targetDayId}`, { scroll: false });
    } else {
      pickerPushedRef.current = true;
      router.push(`${pathname}?add=${targetDayId}`, { scroll: false });
    }
  }

  function closePicker() {
    setPickerDayId(null);
    if (pickerPushedRef.current) {
      pickerPushedRef.current = false;
      router.back();
    } else {
      router.replace(pathname, { scroll: false });
    }
  }

  function handleRequestMapPin() {
    setPicking(true);
    if (!isDesktop) setView("map");
  }

  function handlePickLocation(lngLat: { lat: number; lng: number }) {
    setBaseLocation({ lat: lngLat.lat, lng: lngLat.lng, label: dict.planner.baseLocation.pinnedLabel });
    setPicking(false);
    if (!isDesktop) setView("list");
  }

  function handleRemoveDay() {
    const previous = { dayIds: [...dayIds], containers: structuredClone(containers) };
    // Open the day beside the removed one and move focus to its tab: the
    // remove button goes with its day, and focus would otherwise fall back to
    // the top of the page.
    const at = dayIds.indexOf(day.id);
    const neighbour = dayIds.filter((id) => id !== day.id)[Math.max(0, at - 1)] ?? null;
    removeDay(day.id);
    setSelectedDayId(neighbour);
    if (neighbour) setTimeout(() => document.getElementById(`tab-${neighbour}`)?.focus());
    showToast({
      message: fill(dict.plan.days.removed, { day: day.dayNumber }),
      actions: [{ label: dict.planner.toast.undo, onClick: () => loadPlan(previous) }],
    });
  }

  function handleApplyDayRelocations(fromDayId: string) {
    const forDay = relocationsByDay.get(fromDayId);
    if (!forDay || forDay.length === 0) return;
    const dayIdOfNumber = new Map(resolvedDays.map((d) => [d.dayNumber, d.id]));
    const moved: { slug: string; to: string }[] = [];
    for (const relocation of forDay) {
      const toDayId = dayIdOfNumber.get(relocation.toDayNumber);
      if (!toDayId) continue;
      if (moveFromTo(relocation.placeSlug, fromDayId, toDayId, useTripStore.getState().containers[toDayId]?.length ?? 0)) {
        moved.push({ slug: relocation.placeSlug, to: toDayId });
      }
    }
    if (moved.length === 0) return;
    showToast({
      message: fill(dict.planner.feasibility.fixDaysApplied, { count: moved.length }),
      actions: [
        {
          label: dict.planner.toast.undo,
          onClick: () => {
            for (const item of moved) {
              moveFromTo(item.slug, item.to, fromDayId, useTripStore.getState().containers[fromDayId]?.length ?? 0);
            }
          },
        },
      ],
    });
  }

  function handleEasePace() {
    if (!paceRelief) return;
    const place = bySlug.get(paceRelief.placeSlug);
    const toDayNumber = dayIds.indexOf(paceRelief.toDayId) + 1;
    const previousIndex = (containers[paceRelief.fromDayId] ?? []).indexOf(paceRelief.placeSlug);
    if (!moveFromTo(paceRelief.placeSlug, paceRelief.fromDayId, paceRelief.toDayId, containers[paceRelief.toDayId]?.length ?? 0)) return;
    showToast({
      message: fill(dict.planner.pace.easeApplied, { place: place?.name[locale] ?? paceRelief.placeSlug, day: toDayNumber }),
      actions: [
        {
          label: dict.planner.toast.undo,
          onClick: () =>
            moveFromTo(paceRelief.placeSlug, paceRelief.toDayId, paceRelief.fromDayId, previousIndex >= 0 ? previousIndex : 0),
        },
      ],
    });
  }

  function handleReflowByWeather() {
    const report = (outcome: "applied" | "noChange" | "needsDate") =>
      showToast({ message: dict.weather.planner.reflow[outcome] });
    if (!travelDate) {
      report("needsDate");
      return;
    }
    if (!weatherBundle.weather) return;

    const badDayIds = dayForecasts
      .filter(
        (d) =>
          isBadWeatherDay(d.entry) ||
          d.isHazeSensitive ||
          (d.isToday && weatherBundle.airQuality && BAD_AQI_LEVELS.includes(weatherBundle.airQuality.level)),
      )
      .map((d) => d.dayId);
    const goodDayIds = dayForecasts.filter((d) => d.date && !badDayIds.includes(d.dayId)).map((d) => d.dayId);

    const working: Record<string, string[]> = {};
    for (const id of [...badDayIds, ...goodDayIds]) working[id] = [...(containers[id] ?? [])];
    const swaps: { outdoorSlug: string; badDay: string; indoorSlug: string; goodDay: string }[] = [];
    for (const badDay of badDayIds) {
      const outdoorSlug = working[badDay]?.find((slug) => bySlug.get(slug)?.outdoor);
      if (!outdoorSlug) continue;
      const goodDay = goodDayIds.find(
        (id) => id !== badDay && working[id]?.some((slug) => bySlug.get(slug)?.outdoor === false),
      );
      if (!goodDay) continue;
      const indoorSlug = working[goodDay].find((slug) => bySlug.get(slug)?.outdoor === false)!;
      working[badDay] = working[badDay].filter((s) => s !== outdoorSlug);
      working[goodDay] = working[goodDay].filter((s) => s !== indoorSlug);
      swaps.push({ outdoorSlug, badDay, indoorSlug, goodDay });
    }
    if (!swaps.length) {
      report("noChange");
      return;
    }
    for (const swap of swaps) {
      moveFromTo(swap.outdoorSlug, swap.badDay, swap.goodDay, useTripStore.getState().containers[swap.goodDay]?.length ?? 0);
      moveFromTo(swap.indoorSlug, swap.goodDay, swap.badDay, useTripStore.getState().containers[swap.badDay]?.length ?? 0);
    }
    report("applied");
  }

  // ── Drag and drop ──

  const nameOfItem = (id: string | number) => {
    const parsed = parseItemId(String(id));
    return parsed ? (bySlug.get(parsed.slug)?.name[locale] ?? parsed.slug) : String(id);
  };
  const nameOfTarget = (id: string | number) => {
    const raw = String(id);
    const container = raw.startsWith("tab:") ? raw.slice(4) : raw;
    if (container === UNSCHEDULED) return dict.plan.dnd.tray;
    const n = dayIds.indexOf(container);
    if (n >= 0) return fill(dict.plan.days.tab, { day: n + 1 });
    return nameOfItem(raw);
  };
  const d = dict.plan.dnd;
  const announcements: Announcements = {
    onDragStart: ({ active }) => fill(d.start, { place: nameOfItem(active.id) }),
    onDragOver: ({ active, over }) =>
      over ? fill(d.over, { place: nameOfItem(active.id), target: nameOfTarget(over.id) }) : fill(d.overNone, { place: nameOfItem(active.id) }),
    onDragEnd: ({ active, over }) =>
      over ? fill(d.end, { place: nameOfItem(active.id), target: nameOfTarget(over.id) }) : fill(d.endNone, { place: nameOfItem(active.id) }),
    onDragCancel: ({ active }) => fill(d.cancel, { place: nameOfItem(active.id) }),
  };

  function handleDragOver({ over }: DragOverEvent) {
    setOverTab(Boolean(over && String(over.id).startsWith("tab:")));
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null);
    setOverTab(false);
    if (!over) return;
    const from = parseItemId(String(active.id));
    if (!from) return;
    const overId = String(over.id);
    const lists = useTripStore.getState().containers;
    let toContainer: string;
    let toIndex: number;
    let viaTab = false;
    if (overId.startsWith("tab:")) {
      toContainer = overId.slice(4);
      toIndex = lists[toContainer]?.length ?? 0;
      viaTab = true;
    } else if (overId === UNSCHEDULED || dayIds.includes(overId)) {
      toContainer = overId;
      toIndex = lists[overId]?.length ?? 0;
    } else {
      const target = parseItemId(overId);
      if (!target) return;
      toContainer = target.containerId;
      toIndex = (lists[toContainer] ?? []).indexOf(target.slug);
    }
    if (toContainer === from.containerId && viaTab) return;
    const fromIndex = (lists[from.containerId] ?? []).indexOf(from.slug);
    if (!moveFromTo(from.slug, from.containerId, toContainer, toIndex)) return;
    // A stop dropped on another day's tab leaves the open list, so say where it went.
    if (viaTab) {
      showToast({
        message: fill(dict.planner.toast.moved, { day: dayIds.indexOf(toContainer) + 1 }),
        actions: [{ label: dict.planner.toast.undo, onClick: () => moveFromTo(from.slug, toContainer, from.containerId, fromIndex) }],
      });
    }
  }

  const activePlace = activeId ? bySlug.get(parseItemId(activeId)?.slug ?? "") : undefined;

  // ── Layout ──

  const dayHeading = forecast?.date
    ? fill(dict.plan.headingWithDate, { day: day.dayNumber, date: longDayDate(forecast.date, locale) })
    : fill(dict.plan.heading, { day: day.dayNumber });

  const mapOverlay = (
    <>
      <div className="pointer-events-none absolute top-4 left-4 z-[2] flex flex-wrap gap-2">
        <Badge className="min-h-10 bg-panel px-4 shadow-float" icon={<Route aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />}>
          {fill(dict.plan.map.badge, { day: day.dayNumber, stops: stopsLabel(day.places.length, dict) })}
        </Badge>
      </div>
      <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[2] flex flex-wrap items-end justify-between gap-3">
        <p className="pointer-events-auto grid gap-0.5 rounded-lg bg-panel px-4 py-3 text-small text-ink-soft shadow-float">
          <span className="inline-flex items-center gap-1.5">
            <Sunset aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />
            {dict.plan.map.sunset}
          </span>
          <span className="text-label font-semibold text-ink tabular-nums">
            {fill(dict.plan.map.sunsetAt, { time: minutesToClock(timeline.sun.sunsetMinutes) })}
          </span>
        </p>
        {mapsLink ? (
          <a
            href={mapsLink.href}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              "pointer-events-auto inline-flex min-h-12 items-center gap-2 rounded-full bg-brand px-5 text-label font-medium text-on-brand shadow-lift hover:bg-[color-mix(in_oklab,var(--cmj-brand)_88%,black)]",
              focusRing,
            )}
          >
            <Navigation aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            {mapsLink.label}
          </a>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <Suspense fallback={null}>
        <PlanImportListener />
      </Suspense>
      <Suspense fallback={null}>
        <SavedTripLoader />
      </Suspense>
      <Suspense fallback={null}>
        <PlacePickerUrlSync
          dayIds={dayIds}
          openDayId={pickerDayId}
          onOpenFromUrl={setPickerDayId}
          onCloseFromUrl={() => {
            pickerPushedRef.current = false;
            setPickerDayId(null);
          }}
        />
      </Suspense>
      <Suspense fallback={null}>
        <PlannerHighlightSync onHighlight={handleHighlightDay} />
      </Suspense>

      <div data-brand className="bg-page font-brand text-ink print:hidden">
        <div className="lg:grid lg:h-[calc(100svh-73px)] lg:min-h-[720px] lg:grid-cols-[520px_minmax(0,1fr)]">
          {/* lg:relative makes this scrolling column the containing block for
              absolute children. Without it a screen-reader-only status line
              (sr-only is position: absolute) took the body as its box, escaped
              the scroll clip, and stretched the page far below the footer.
              data-lenis-prevent hands the wheel back to this column: the
              site's smooth scroll otherwise takes every wheel turn for the
              page, so the column could not be scrolled with a mouse. At the
              column's end the wheel carries on to the page, which on a short
              screen (the workspace is at least 720px) still has the column's
              foot and the footer below the fold. */}
          <div
            data-lenis-prevent
            className="grid content-start gap-6 px-4 pt-6 pb-10 sm:px-6 lg:relative lg:overflow-y-auto lg:border-r lg:border-line lg:p-8"
          >
            <TripHead
              progress={planProgress}
              placeCount={tripTotals.places + unscheduledPlaces.length}
              saveIndicator={<SaveStatus state={saveState} />}
              aiEnabled={aiEnabled}
              canReflow={!isEmpty && dayIds.length > 1}
              onOpenAi={() => setAiOpen(true)}
              onAddPlace={() => openPicker(day.id)}
              onReflow={handleReflowByWeather}
              onRequestMapPin={handleRequestMapPin}
            />

            <TripNotes travelDate={travelDate} dayCount={dayIds.length} />

            {isEmpty ? (
              <PlanEmpty aiEnabled={aiEnabled} onOpenAi={() => setAiOpen(true)} onAddPlace={() => openPicker(dayIds[0])} />
            ) : (
              <>
                <div role="group" aria-label={dict.plan.views.label} className="inline-flex w-fit gap-1 rounded-full bg-well p-1 lg:hidden">
                  {(
                    [
                      ["list", dict.plan.views.list, List],
                      ["map", dict.plan.views.map, MapIcon],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={view === value}
                      onClick={(event) => {
                        setView(value);
                        // The map opens under the trip's details; bring the switch (and the map
                        // right below it) up to just under the header.
                        const top = event.currentTarget.getBoundingClientRect().top + window.scrollY - 88;
                        if (value === "map") window.scrollTo({ top, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                      }}
                      className={cx(
                        "inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full px-[18px] text-label font-medium text-ink-soft",
                        "aria-pressed:bg-panel aria-pressed:text-brand aria-pressed:shadow-float",
                        focusRing,
                      )}
                    >
                      <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                      {label}
                    </button>
                  ))}
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={collision}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  onDragCancel={() => {
                    setActiveId(null);
                    setOverTab(false);
                  }}
                  autoScroll={{ threshold: { x: 0.2, y: 0.12 }, canScroll: () => !overTab }}
                  // Measure the drop targets as the list scrolls: the tabs stay put
                  // (sticky) while everything under them moves.
                  measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
                  accessibility={{ announcements, screenReaderInstructions: { draggable: d.instructions } }}
                >
                  <div className={cx("grid gap-6", view === "map" && "hidden")}>
                    {/* The tabs stay in reach while the list scrolls: they are where a
                        stop is dropped to send it to another day, and dragging up to
                        them scrolls the list under them. */}
                    <div className="sticky top-[73px] z-20 -mx-4 -my-2 bg-page px-4 py-2 sm:-mx-6 sm:px-6 lg:-top-8 lg:-mx-8 lg:-mt-4 lg:px-8 lg:pt-4">
                    <DayTabs
                      days={resolvedDays.map((x) => ({
                        id: x.id,
                        dayNumber: x.dayNumber,
                        date: dayForecasts.find((f) => f.dayId === x.id)?.date ?? null,
                        stopCount: x.places.length,
                      }))}
                      selectedId={day.id}
                      highlightedId={highlightedDayId}
                      onSelect={setSelectedDayId}
                      onAddDay={() => {
                        addDay();
                        setSelectedDayId(useTripStore.getState().dayIds.at(-1) ?? null);
                      }}
                    />
                    </div>

                    <section id={DAY_PANEL_ID} role="tabpanel" aria-labelledby={`tab-${day.id}`} className="grid gap-5">
                      <div className="grid gap-3">
                        <div className="flex items-start justify-between gap-3">
                          <h2 className="text-title font-semibold text-pretty text-brand">{dayHeading}</h2>
                          {dayIds.length > 1 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleRemoveDay}
                              className="-mr-2 flex-none px-3"
                              icon={<Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                            >
                              {dict.plan.days.remove}
                            </Button>
                          ) : null}
                        </div>
                        {day.places.length > 0 ? (
                          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            <Stat label={dict.plan.stats.whole} value={formatDuration(stats.totalMinutes, dict)} />
                            <Stat
                              // When the narrow box wraps, break only after "·": no-break
                              // spaces keep "ราว 16 กม." together.
                              label={fill(dict.plan.stats.travelKm, { km: formatDistance(schedule.totalDistanceKm, dict) })
                                .split(" · ")
                                .map((part) => part.replace(/ /g, " "))
                                .join(" · ")}
                              value={formatDuration(stats.travelMinutes, dict)}
                            />
                            <Stat
                              label={dict.plan.stats.spend}
                              value={fill(dict.plan.stats.perPerson, { amount: baht(stats.budgetThb) })}
                              className="col-span-2 sm:col-span-1"
                            />
                          </dl>
                        ) : null}
                        <div className="flex flex-wrap gap-2">
                          <Badge icon={<Sun aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />}>
                            <span className="tabular-nums">
                              {fill(dict.plan.sun, {
                                rise: minutesToClock(timeline.sun.sunriseMinutes),
                                set: minutesToClock(timeline.sun.sunsetMinutes),
                              })}
                            </span>
                          </Badge>
                          {weather.badges}
                        </div>
                        {weather.advice}
                        {farWalk ? (
                          // Hop times are a ride by road whatever mode is chosen
                          // (the mode sets the fare). With "walk" chosen and a
                          // hop too far to walk, say so instead of letting
                          // "walk" sit beside a 27-minute, 13 km hop.
                          <p className="flex items-start gap-2.5 rounded-md bg-[color-mix(in_oklab,var(--cmj-sunset)_22%,var(--cmj-panel))] px-4 py-3 text-small text-pretty text-ink">
                            <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
                            <span>
                              {fill(dict.plan.farWalk, {
                                from: farWalk.from.name[locale],
                                to: farWalk.to.name[locale],
                                km: formatDistance(farWalk.distanceKm, dict),
                                walk: formatDuration(farWalk.walkMinutes, dict),
                              })}
                            </span>
                          </p>
                        ) : null}
                      </div>

                      <StopList
                        dayId={day.id}
                        dayNumber={day.dayNumber}
                        timeline={timeline}
                        hasDate={Boolean(forecast?.date)}
                        days={dayChoices}
                        hoveredSlug={hoveredSlug}
                        focusedSlug={focusedSlug}
                        onHover={setHoveredSlug}
                        onAddPlace={() => openPicker(day.id)}
                      />

                      {day.places.length > 0 ? (
                        <DayChecks
                          key={day.id}
                          dayId={day.id}
                          dayNumber={day.dayNumber}
                          date={forecast?.date ?? null}
                          places={day.places}
                          schedule={schedule}
                          pace={computeDayPace(day.places, schedule)}
                          issues={checkDayFeasibility(day.places, forecast?.date ?? null)}
                          relocations={relocationsByDay.get(day.id)}
                          onApplyRelocations={() => handleApplyDayRelocations(day.id)}
                          paceEaseLabel={
                            paceRelief?.fromDayId === day.id
                              ? fill(dict.planner.pace.ease, {
                                  place: bySlug.get(paceRelief.placeSlug)?.name[locale] ?? "",
                                  day: dayIds.indexOf(paceRelief.toDayId) + 1,
                                })
                              : undefined
                          }
                          onEasePace={paceRelief?.fromDayId === day.id ? handleEasePace : undefined}
                        />
                      ) : null}
                    </section>

                    <UnscheduledTray places={unscheduledPlaces} targetDayId={day.id} targetDayNumber={day.dayNumber} />

                    <TripOverview days={resolvedDays} totalMinutes={tripTotals.minutes} estimatedCostThb={estimatedCostThb} />

                    <FinishSection
                      saveState={saveState}
                      signedIn={cloudSync.isSignedIn}
                      onSave={handleSave}
                      onShared={() => setShared(true)}
                    />
                  </div>

                  <DragOverlay dropAnimation={null}>
                    {activePlace ? (
                      <div className="flex max-w-[22rem] items-center gap-2 rounded-lg bg-panel py-2 pr-4 pl-2 font-brand text-label text-ink shadow-lift ring-2 ring-cmj-sunset">
                        <GripVertical aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none text-ink-soft" />
                        <span className="truncate">{activePlace.name[locale]}</span>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>
              </>
            )}
          </div>

          {isDesktop || view === "map" || picking ? (
            <div
              className={cx(
                "relative mx-4 h-[70svh] overflow-hidden rounded-lg sm:mx-6 lg:mx-0 lg:h-full lg:rounded-none",
                !isDesktop && view !== "map" && "hidden",
              )}
            >
              <PlanMapLoader
                className="size-full"
                dayNumber={day.dayNumber}
                places={day.places}
                baseLocation={baseLocation}
                hoveredSlug={hoveredSlug}
                onSelectPlace={handleSelectPlace}
                picking={picking}
                onPick={handlePickLocation}
                onCancelPick={() => setPicking(false)}
                overlay={day.places.length > 0 ? mapOverlay : null}
              />
            </div>
          ) : null}
        </div>

        {isEmpty ? null : (
          <PlanDock
            dayNumber={day.dayNumber}
            stopCount={day.places.length}
            totalMinutes={stats.totalMinutes}
            saveState={saveState}
            onSave={handleSave}
            onShared={() => setShared(true)}
          />
        )}
      </div>

      <PrintItinerary tripName={tripName} days={printDays} />

      <PlacePickerDialog
        dayId={pickerDayId}
        dayNumber={pickerDayId ? dayIds.indexOf(pickerDayId) + 1 || null : null}
        onClose={closePicker}
      />
      {aiEnabled ? <AiPlannerDialog open={aiOpen} onClose={() => setAiOpen(false)} /> : null}
      <SignInPrompt open={signInOpen} onClose={() => setSignInOpen(false)} variant="plan" />
      <MigrationChoiceDialog
        open={cloudSync.migrationPrompt !== null}
        existingTripTitle={cloudSync.migrationPrompt?.existingTripTitle ?? ""}
        onClose={cloudSync.dismissMigrationPrompt}
        onSaveAsNew={cloudSync.resolveMigrationSaveAsNew}
        onReplaceExisting={cloudSync.resolveMigrationReplaceExisting}
      />
    </>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cx("grid gap-0.5 rounded-md border border-line bg-panel px-3 py-2.5", className)}>
      <dt className="text-small leading-[1.4] text-ink-soft">{label}</dt>
      <dd className="text-label font-semibold text-ink tabular-nums">{value}</dd>
    </div>
  );
}
