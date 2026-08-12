"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import {
  AlertTriangle,
  Calendar,
  Check,
  CloudSun,
  Compass,
  Copy,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  QrCode,
  Save,
  Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { places } from "@/data/places";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useLocale } from "@/components/providers/locale-provider";
import { useMediaQuery } from "@/lib/use-media-query";
import { categorySpendBreakdown, dayStats, estimateTripCostThb } from "@/lib/trip-calculations";
import { PlanImportListener } from "@/components/planner/plan-import-listener";
import { PlacePickerUrlSync } from "@/components/planner/place-picker-url-sync";
import { PlacePickerPanel } from "@/components/planner/place-picker-panel";
import { PlannerHighlightSync } from "@/components/planner/planner-highlight-sync";
import { UnscheduledPanel } from "@/components/planner/unscheduled-panel";
import { DayColumn } from "@/components/planner/day-column";
import { DayTimeline } from "@/components/planner/day-timeline";
import { NarrativeItinerary } from "@/components/planner/narrative-itinerary";
import { BaseLocationPicker } from "@/components/planner/base-location-picker";
import { AiPlannerPanel } from "@/components/planner/ai-planner-panel";
import { PlannerMapLoader } from "@/components/planner/planner-map-loader";
import { TripDetailsForm } from "@/components/planner/trip-details-form";
import { SummaryView } from "@/components/planner/summary-view";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { SectionHeading } from "@/components/section-heading";
import { SeasonalSmogBanner } from "@/components/weather/seasonal-smog-banner";
import { FestivalBanner } from "@/components/planner/festival-banner";
import { useToast } from "@/components/toast/toast-provider";
import { useTripCloudSync } from "@/lib/planner/use-trip-cloud-sync";
import { SignInPromptModal } from "@/components/auth/sign-in-prompt-modal";
import { MigrationChoiceModal } from "@/components/planner/migration-choice-modal";
import { cn } from "@/lib/utils";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { useWeatherBundle } from "@/lib/weather/use-weather";
import { resolveDayDate, findDailyForecast, isBadWeatherDay, isBurningSeasonDate } from "@/lib/weather/day-forecast";
import { suggestDayFixes, type PlaceRelocation } from "@/lib/planner/feasibility";
import { buildSchedule } from "@/lib/planner/schedule";
import { suggestPaceRelief } from "@/lib/planner/pace";
import type { AqiLevel } from "@/lib/weather/types";

const BAD_AQI_LEVELS: AqiLevel[] = ["unhealthy", "very-unhealthy", "hazardous"];

function findContainerOf(containers: Record<string, string[]>, slug: string) {
  return Object.keys(containers).find((key) => containers[key].includes(slug));
}

export function PlannerBoard({ aiEnabled = false }: { aiEnabled?: boolean }) {
  const { locale, dict } = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const dayIds = useTripStore((s) => s.dayIds);
  const containers = useTripStore((s) => s.containers);
  const addDay = useTripStore((s) => s.addDay);
  const addPlace = useTripStore((s) => s.addPlace);
  const moveItem = useTripStore((s) => s.moveItem);
  const travelers = useTripStore((s) => s.travelers);
  const travelDate = useTripStore((s) => s.travelDate);
  const tripName = useTripStore((s) => s.tripName);
  const accommodationThb = useTripStore((s) => s.accommodationThb);

  const [selectedView, setView] = useState<"list" | "map" | "summary" | "timeline">("list");
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [sharedMessage, setSharedMessage] = useState(false);
  const [signInPromptOpen, setSignInPromptOpen] = useState(false);
  const cloudSync = useTripCloudSync();
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [reflowStatus, setReflowStatus] = useState<"idle" | "applied" | "noChange" | "needsDate">("idle");
  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const pickerTriggerRef = useRef<HTMLElement | null>(null);
  const pickerPushedRef = useRef(false);
  const [highlightedDayId, setHighlightedDayId] = useState<string | null>(null);
  const [dayFixSuggestion, setDayFixSuggestion] = useState<PlaceRelocation[] | null>(null);
  const [hoveredPlaceSlug, setHoveredPlaceSlug] = useState<string | null>(null);
  const [focusedItemId, setFocusedItemId] = useState<string | null>(null);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  // On desktop the map lives permanently in the sticky sidebar, so the "map"
  // tab — a mobile/tablet-only fallback — must not stay selected if the
  // viewport grows past the breakpoint while it was active. Derived rather than
  // corrected after the fact, so the invalid combination never renders at all.
  const view = isDesktop && selectedView === "map" ? "list" : selectedView;
  const [pickingBaseLocation, setPickingBaseLocation] = useState(false);
  const setBaseLocation = useTripStore((s) => s.setBaseLocation);

  const weatherBundle = useWeatherBundle(CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng);
  const { showToast } = useToast();
  const dayFix = dict.planner.feasibility;

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
          places: acc.places + day.places.length,
        };
      },
      { minutes: 0, places: 0 }
    );
  }, [resolvedDays]);

  // Single source of truth for "estimated cost" — Summary → Budget computes
  // the exact same figure from the exact same categorySpendBreakdown, so the
  // two never drift apart.
  const estimatedCostThb = useMemo(
    () => estimateTripCostThb(categorySpendBreakdown(resolvedDays), travelers, accommodationThb),
    [resolvedDays, travelers, accommodationThb]
  );

  const isEmpty = tripTotals.places === 0 && unscheduledPlaces.length === 0;
  const activePlace = activeSlug ? places.find((p) => p.slug === activeSlug) : null;

  const todayDate = weatherBundle.weather?.daily[0]?.date;

  const dayForecasts = useMemo(
    () =>
      resolvedDays.map((day) => {
        const date = resolveDayDate(travelDate, day.dayNumber);
        const entry = findDailyForecast(weatherBundle.weather?.daily, date);
        const isToday = Boolean(date) && date === todayDate;
        // Burning season is a calendar fact, not something the live forecast can confirm for a far-future date —
        // flagged independently so a haze-sensitive outdoor stop still gets caught even months out.
        const isHazeSensitive =
          Boolean(date) &&
          isBurningSeasonDate(date) &&
          day.places.some((p) => p.outdoor && p.dustSensitivity === "high");
        return { dayId: day.id, date, entry, isToday, isHazeSensitive };
      }),
    [resolvedDays, travelDate, weatherBundle.weather, todayDate]
  );

  const paceRelief = useMemo(
    () =>
      suggestPaceRelief(
        resolvedDays.map((day) => ({ dayId: day.id, places: day.places, schedule: buildSchedule(day.places) }))
      ),
    [resolvedDays]
  );

  function handleEasePace() {
    if (!paceRelief) return;
    const place = places.find((p) => p.slug === paceRelief.placeSlug);
    const toDayNumber = dayIds.indexOf(paceRelief.toDayId) + 1;
    const fromContainer = containers[paceRelief.fromDayId] ?? [];
    const previousIndex = fromContainer.indexOf(paceRelief.placeSlug);

    moveItem({
      slug: paceRelief.placeSlug,
      toContainer: paceRelief.toDayId,
      toIndex: containers[paceRelief.toDayId]?.length ?? 0,
    });
    showToast({
      message: dict.planner.pace.easeApplied
        .replace("{place}", place?.name[locale] ?? paceRelief.placeSlug)
        .replace("{day}", String(toDayNumber)),
      actions: [
        {
          label: dict.planner.toast.undo,
          onClick: () =>
            moveItem({
              slug: paceRelief.placeSlug,
              toContainer: paceRelief.fromDayId,
              toIndex: previousIndex >= 0 ? previousIndex : 0,
            }),
        },
      ],
    });
  }

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
          d.isHazeSensitive ||
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

  function handleFixDaysClick() {
    const feasibilityDays = resolvedDays.map((day) => ({
      dayId: day.id,
      isoDate: dayForecasts.find((d) => d.dayId === day.id)?.date ?? null,
      places: day.places,
    }));
    const relocations = suggestDayFixes(feasibilityDays);
    if (relocations.length === 0) {
      showToast({ message: dayFix.fixDaysNone });
      return;
    }
    setDayFixSuggestion(relocations);
  }

  function handleConfirmFixDays() {
    if (!dayFixSuggestion) return;
    const previousContainerOf = new Map(dayFixSuggestion.map((r) => [r.placeSlug, r.fromDayId]));
    for (const relocation of dayFixSuggestion) {
      moveItem({
        slug: relocation.placeSlug,
        toContainer: relocation.toDayId,
        toIndex: containers[relocation.toDayId]?.length ?? 0,
      });
    }
    showToast({
      message: dayFix.fixDaysApplied.replace("{count}", String(dayFixSuggestion.length)),
      actions: [
        {
          label: dict.planner.toast.undo,
          onClick: () => {
            for (const [slug, dayId] of previousContainerOf) {
              moveItem({ slug, toContainer: dayId, toIndex: containers[dayId]?.length ?? 0 });
            }
          },
        },
      ],
    });
    setDayFixSuggestion(null);
  }

  function handleCancelFixDays() {
    setDayFixSuggestion(null);
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

  function buildShareUrl(): string {
    const data = { dayIds, containers };
    const encoded = encodeURIComponent(btoa(JSON.stringify(data)));
    return `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
  }

  function handleShare() {
    navigator.clipboard?.writeText(buildShareUrl());
    setSharedMessage(true);
    setTimeout(() => setSharedMessage(false), 2500);
  }

  function handleToggleQr() {
    if (qrDataUrl) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(buildShareUrl(), { margin: 1, width: 200 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }

  function handleSave() {
    if (!cloudSync.isSignedIn) {
      setSignInPromptOpen(true);
      return;
    }
    cloudSync.requestSave();
  }

  function renderSaveAction() {
    if (!cloudSync.isSignedIn || cloudSync.migrationDeclined) {
      return (
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm hover:border-accent hover:text-accent-text"
        >
          <Save className="h-4 w-4" />
          {dict.planner.save}
        </button>
      );
    }
    if (cloudSync.saveStatus === "saving") {
      return (
        <span className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          {dict.planner.cloudSave.saving}
        </span>
      );
    }
    if (cloudSync.saveStatus === "failed") {
      return (
        <button
          type="button"
          onClick={cloudSync.requestSave}
          className="flex items-center gap-1.5 rounded-full border border-destructive px-4 py-2 text-sm text-destructive hover:brightness-95"
        >
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          {dict.planner.cloudSave.failed}
          <span className="underline underline-offset-2">{dict.planner.cloudSave.retry}</span>
        </button>
      );
    }
    return (
      <span className="flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4" aria-hidden="true" />
        {dict.planner.cloudSave.saved}
      </span>
    );
  }

  const EXAMPLE_TRIP_SLUGS = ["wat-phra-that-doi-suthep", "wat-chedi-luang", "wat-phra-singh"];

  function handleStartFromExample() {
    const targetDay = dayIds[0];
    EXAMPLE_TRIP_SLUGS.forEach((slug, index) => {
      addPlace(slug);
      moveItem({ slug, toContainer: targetDay, toIndex: index });
    });
  }

  function handleStartMapPin() {
    setPickingBaseLocation(true);
    if (!isDesktop) setView("map");
  }

  function handlePickLocation(lngLat: { lat: number; lng: number }) {
    setBaseLocation({ lat: lngLat.lat, lng: lngLat.lng, label: dict.planner.baseLocation.pinnedLabel });
    setPickingBaseLocation(false);
    if (!isDesktop) setView("timeline");
  }

  function handleCancelPickLocation() {
    setPickingBaseLocation(false);
  }

  function openPicker(targetDayId: string, trigger: HTMLElement) {
    pickerTriggerRef.current = trigger;
    const wasAlreadyOpen = pickerDayId !== null;
    setPickerDayId(targetDayId);
    if (wasAlreadyOpen) {
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

  function handlePickerOpenFromUrl(dayIdFromUrl: string) {
    setPickerDayId(dayIdFromUrl);
  }

  function handlePickerCloseFromUrl() {
    pickerPushedRef.current = false;
    setPickerDayId(null);
  }

  function handleHighlightDay(dayIdToHighlight: string) {
    setHighlightedDayId(dayIdToHighlight);
    document
      .getElementById(dayIdToHighlight)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    setTimeout(() => {
      setHighlightedDayId((current) => (current === dayIdToHighlight ? null : current));
    }, 2500);
  }

  useEffect(() => {
    if (!moreMenuOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) setMoreMenuOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMoreMenuOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [moreMenuOpen]);

  /** A map pin was clicked: bring the itinerary tab forward and flash-highlight the matching place card. */
  function handleSelectPlace(dayId: string, slug: string) {
    setView("list");
    const itemId = `${dayId}-${slug}`;
    setFocusedItemId(itemId);
    setTimeout(() => {
      setFocusedItemId((current) => (current === itemId ? null : current));
    }, 2500);
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <Suspense fallback={null}>
        <PlanImportListener />
      </Suspense>
      <Suspense fallback={null}>
        <PlacePickerUrlSync
          dayIds={dayIds}
          openDayId={pickerDayId}
          onOpenFromUrl={handlePickerOpenFromUrl}
          onCloseFromUrl={handlePickerCloseFromUrl}
        />
      </Suspense>
      <Suspense fallback={null}>
        <PlannerHighlightSync onHighlight={handleHighlightDay} />
      </Suspense>
      <PlacePickerPanel
        dayId={pickerDayId}
        dayNumber={pickerDayId ? dayIds.indexOf(pickerDayId) + 1 : null}
        onClose={closePicker}
        triggerRef={pickerTriggerRef}
      />
      <SignInPromptModal open={signInPromptOpen} onClose={() => setSignInPromptOpen(false)} />
      <MigrationChoiceModal
        open={cloudSync.migrationPrompt !== null}
        existingTripTitle={cloudSync.migrationPrompt?.existingTripTitle ?? ""}
        onClose={cloudSync.dismissMigrationPrompt}
        onSaveAsNew={cloudSync.resolveMigrationSaveAsNew}
        onReplaceExisting={cloudSync.resolveMigrationReplaceExisting}
      />
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
                  estimatedCostThb,
                }
          }
          actions={isEmpty ? undefined : renderSaveAction()}
        />
      </div>

      <div className="mt-6">
        {travelDate ? <FestivalBanner travelDate={travelDate} dayCount={dayIds.length} /> : null}
        <SeasonalSmogBanner referenceDate={travelDate} />
      </div>

      {/* Outside the empty/non-empty split on purpose: the panel is reachable
          from both the empty state and the toolbar, and rendering it inline
          rather than as a floating dropdown gives the multi-day preview the
          full width it needs. */}
      {aiEnabled && aiPanelOpen ? (
        <div className="print:hidden">
          <AiPlannerPanel onClose={() => setAiPanelOpen(false)} />
        </div>
      ) : null}

      {isEmpty ? (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-lg border border-dashed border-border-strong py-16 text-center">
          <Compass className="h-8 w-8 text-accent-text" />
          <h2 className="font-serif-display text-2xl">{dict.planner.emptyTitle}</h2>
          <p className="max-w-sm text-muted-foreground">{dict.planner.emptyBody}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            {/* The AI planner is at its most useful from a blank plan, so it
                gets an entry point here too — the toolbar copy only appears
                once a plan exists, which is exactly when it's needed least. */}
            {aiEnabled ? (
              <button
                type="button"
                onClick={() => setAiPanelOpen(true)}
                className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground"
              >
                <Sparkles className="h-4 w-4" />
                {dict.planner.ai.button}
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => openPicker(dayIds[0], event.currentTarget)}
              className={cn(
                "rounded-full px-6 py-3 text-sm font-medium",
                aiEnabled
                  ? "border border-border-strong hover:border-accent hover:text-accent-text"
                  : "bg-accent text-accent-foreground"
              )}
            >
              {dict.planner.emptyCta}
            </button>
            <button
              type="button"
              onClick={handleStartFromExample}
              className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium hover:border-accent hover:text-accent-text"
            >
              {dict.planner.exampleTripCta}
            </button>
          </div>
          <Link
            href={`/${locale}/explore`}
            className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-accent-text hover:underline"
          >
            {dict.planner.exploreButton}
          </Link>

          {/* Decorative preview of a finished day — purely illustrative, never announced to assistive tech. */}
          <div className="mt-6 w-full max-w-xs select-none opacity-40" aria-hidden="true">
            <div className="rounded-lg border border-dashed border-border-strong bg-surface p-4 text-left">
              <p className="mb-3 font-serif-display text-sm">{dict.planner.day} 1</p>
              {[0, 1].map((i) => (
                <div key={i} className="mb-2 flex items-center gap-3 rounded-md border border-border bg-background p-2.5">
                  <div className="h-10 w-10 shrink-0 rounded bg-surface-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-3/4 rounded bg-surface-muted" />
                    <div className="h-2 w-1/2 rounded bg-surface-muted" />
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              {isDesktop ? null : (
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
              )}
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
              <button
                type="button"
                onClick={() => setView("timeline")}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium transition-colors",
                  view === "timeline" ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                )}
              >
                {dict.planner.timelineView}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {aiEnabled ? (
                <button
                  type="button"
                  onClick={() => setAiPanelOpen((open) => !open)}
                  aria-expanded={aiPanelOpen}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    aiPanelOpen
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-accent text-accent-text hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Sparkles className="h-4 w-4" />
                  {dict.planner.ai.button}
                </button>
              ) : null}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleReflowByWeather}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:brightness-95"
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
              <div className="relative">
                <button
                  type="button"
                  onClick={handleFixDaysClick}
                  className="flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:brightness-95"
                >
                  <Calendar className="h-4 w-4" />
                  {dayFix.fixDays}
                </button>
                {dayFixSuggestion ? (
                  <div className="absolute left-0 top-full z-10 mt-2 w-80 space-y-3 rounded-lg border border-accent bg-background p-4 text-xs shadow-lg">
                    <p className="font-medium text-foreground">{dayFix.fixDaysTitle}</p>
                    <ul className="space-y-1 text-foreground/75">
                      {dayFixSuggestion.map((relocation) => {
                        const place = places.find((p) => p.slug === relocation.placeSlug);
                        const fromDay = dayIds.indexOf(relocation.fromDayId) + 1;
                        const toDay = dayIds.indexOf(relocation.toDayId) + 1;
                        return (
                          <li key={relocation.placeSlug}>
                            {dayFix.fixDaysMove
                              .replace("{place}", place?.name[locale] ?? relocation.placeSlug)
                              .replace("{fromDay}", String(fromDay))
                              .replace("{toDay}", String(toDay))}
                          </li>
                        );
                      })}
                    </ul>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmFixDays}
                        className="flex-1 rounded-full bg-accent px-3 py-1.5 font-medium text-accent-foreground"
                      >
                        {dict.planner.route.confirm}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelFixDays}
                        className="flex-1 rounded-full border border-border-strong px-3 py-1.5 font-medium hover:border-accent hover:text-accent-text"
                      >
                        {dict.planner.route.cancel}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
              <div className="relative" ref={moreMenuRef}>
                <button
                  type="button"
                  onClick={() => setMoreMenuOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={moreMenuOpen}
                  aria-label={dict.planner.moreActions}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border border-border hover:border-accent hover:text-accent-text",
                    moreMenuOpen && "border-accent text-accent-text"
                  )}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {moreMenuOpen ? (
                  <div
                    role="menu"
                    aria-label={dict.planner.moreActions}
                    className="absolute right-0 top-full z-10 mt-2 w-64 space-y-1 rounded-lg border border-border bg-background p-2 shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleShare}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      {sharedMessage ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
                      {sharedMessage ? dict.planner.shared : dict.planner.share}
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleToggleQr}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      <QrCode className="h-4 w-4 shrink-0" />
                      {dict.planner.qr.button}
                    </button>
                    {qrDataUrl ? (
                      <div className="rounded-md border border-border p-3 text-center">
                        {/* eslint-disable-next-line @next/next/no-img-element -- a base64 data URI has no benefit from next/image optimization */}
                        <img src={qrDataUrl} alt={dict.planner.qr.imageAlt} width={200} height={200} className="mx-auto" />
                        <p className="mt-2 text-xs text-foreground/70">{dict.planner.qr.hint}</p>
                      </div>
                    ) : null}
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMoreMenuOpen(false);
                        window.print();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
                    >
                      <Printer className="h-4 w-4 shrink-0" />
                      {dict.planner.print}
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="print:hidden lg:grid lg:grid-cols-5 lg:items-start lg:gap-8">
          <div className="lg:col-span-3">
          {view === "summary" ? (
            <div className="mt-8">
              <SummaryView days={resolvedDays} />
            </div>
          ) : view === "map" ? (
            <div className="mt-8">
              <PlannerMapLoader
                days={resolvedDays}
                pickingLocation={pickingBaseLocation}
                onPickLocation={handlePickLocation}
                onCancelPickLocation={handleCancelPickLocation}
              />
            </div>
          ) : view === "timeline" ? (
            <div className="mt-8">
              <BaseLocationPicker className="max-w-xs" onRequestMapPin={handleStartMapPin} />
              <div
                className={cn(
                  "mt-6",
                  resolvedDays.length > 1 ? "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4" : ""
                )}
              >
                {resolvedDays.map((day) => {
                  const forecast = dayForecasts.find((d) => d.dayId === day.id);
                  return (
                    <DayTimeline
                      key={day.id}
                      dayId={day.id}
                      dayNumber={day.dayNumber}
                      date={forecast?.date ?? null}
                      places={day.places}
                      forecastEntry={forecast?.entry}
                      fullWidth={resolvedDays.length === 1}
                    />
                  );
                })}
              </div>
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

              <div className="mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4">
                {resolvedDays.map((day) => {
                  const forecast = dayForecasts.find((d) => d.dayId === day.id);
                  const showPaceEase = paceRelief?.fromDayId === day.id;
                  const paceEaseLabel = showPaceEase
                    ? dict.planner.pace.ease
                        .replace("{place}", places.find((p) => p.slug === paceRelief.placeSlug)?.name[locale] ?? "")
                        .replace("{day}", String(dayIds.indexOf(paceRelief.toDayId) + 1))
                    : undefined;
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
                      onAddPlace={(trigger) => openPicker(day.id, trigger)}
                      highlighted={highlightedDayId === day.id}
                      paceEaseLabel={paceEaseLabel}
                      onEasePace={showPaceEase ? handleEasePace : undefined}
                      hoveredPlaceSlug={hoveredPlaceSlug}
                      onHoverPlace={setHoveredPlaceSlug}
                      focusedItemId={focusedItemId}
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
          </div>

          {isDesktop ? (
            <div className="sticky top-24 h-[calc(100dvh-7rem)] lg:col-span-2">
              <PlannerMapLoader
                days={resolvedDays}
                className="h-full"
                canvasOnly
                hoveredSlug={hoveredPlaceSlug}
                onSelectPlace={handleSelectPlace}
                pickingLocation={pickingBaseLocation}
                onPickLocation={handlePickLocation}
                onCancelPickLocation={handleCancelPickLocation}
              />
            </div>
          ) : null}
          </div>

          <NarrativeItinerary
            days={resolvedDays.map((day) => ({
              ...day,
              date: dayForecasts.find((d) => d.dayId === day.id)?.date,
            }))}
            tripName={tripName}
            className="hidden print:block"
          />
        </>
      )}
    </div>
  );
}
