"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { GripVertical, Lock, LocateFixed, Sun, Sunset } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import type { Place } from "@/data/types";
import type { DailyForecastEntry } from "@/lib/weather/types";
import { minutesToClock } from "@/lib/opening-hours";
import { buildDayTimeline, resolveSunTimes, type SunTimes } from "@/lib/planner/golden-hour";
import { cn } from "@/lib/utils";

const PX_PER_MINUTE = 1.1;
const MIN_BLOCK_HEIGHT = 60;
const SNAP_MINUTES = 5;
const KEYBOARD_STEP_MINUTES = 15;
const MAX_MINUTES = 23 * 60 + 55;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function clampMinutes(m: number): number {
  return Math.max(0, Math.min(MAX_MINUTES, m));
}

/** Decorative time-of-day wash behind the timeline track — built from the app's own accent gold (golden hour) and foreground (night) colors, not new hues. */
function buildTimeOfDayGradient(startMinutes: number, endMinutes: number, sun: SunTimes): string {
  const span = Math.max(1, endMinutes - startMinutes);
  const pct = (m: number) => Math.max(0, Math.min(100, ((m - startMinutes) / span) * 100));
  const night = "color-mix(in srgb, var(--color-foreground) 16%, transparent)";
  const golden = "color-mix(in srgb, var(--color-accent) 28%, transparent)";
  const clear = "transparent";
  const stops = [
    { pct: 0, color: night },
    { pct: pct(sun.sunriseMinutes - 45), color: night },
    { pct: pct(sun.sunriseMinutes), color: golden },
    { pct: pct(sun.sunriseMinutes + 45), color: clear },
    { pct: pct(sun.sunsetMinutes - 45), color: clear },
    { pct: pct(sun.sunsetMinutes), color: golden },
    { pct: pct(sun.sunsetMinutes + 45), color: night },
    { pct: 100, color: night },
  ].sort((a, b) => a.pct - b.pct);
  return `linear-gradient(to bottom, ${stops.map((s) => `${s.color} ${s.pct}%`).join(", ")})`;
}

export function DayTimeline({
  dayId,
  dayNumber,
  date,
  places,
  forecastEntry,
}: {
  dayId: string;
  dayNumber: number;
  date: string | null;
  places: Place[];
  forecastEntry: DailyForecastEntry | undefined;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.goldenHour;
  const baseLocation = useTripStore((s) => s.baseLocation);
  const allLockedTimes = useTripStore((s) => s.lockedTimes);
  const setLockedTime = useTripStore((s) => s.setLockedTime);
  const [dragState, setDragState] = useState<{ slug: string; previewMinutes: number } | null>(null);

  const lockedArrivals = useMemo(() => {
    const prefix = `${dayId}::`;
    const result: Record<string, string> = {};
    for (const [key, clock] of Object.entries(allLockedTimes)) {
      if (key.startsWith(prefix)) result[key.slice(prefix.length)] = clock;
    }
    return result;
  }, [allLockedTimes, dayId]);

  const sun = useMemo(
    () => resolveSunTimes(forecastEntry, CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng, date ?? todayIso()),
    [forecastEntry, date]
  );

  const timeline = useMemo(
    () => buildDayTimeline({ order: places, sun, baseLocation, lockedArrivals }),
    [places, sun, baseLocation, lockedArrivals]
  );

  function commitTime(slug: string, minutes: number) {
    setLockedTime(dayId, slug, minutesToClock(clampMinutes(minutes)));
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLButtonElement>, slug: string, arrivalMinutes: number) {
    event.currentTarget.setPointerCapture(event.pointerId);
    const startClientY = event.clientY;
    setDragState({ slug, previewMinutes: arrivalMinutes });

    function toDelta(clientY: number): number {
      return Math.round((clientY - startClientY) / PX_PER_MINUTE / SNAP_MINUTES) * SNAP_MINUTES;
    }
    function handleMove(moveEvent: PointerEvent) {
      setDragState({ slug, previewMinutes: clampMinutes(arrivalMinutes + toDelta(moveEvent.clientY)) });
    }
    function handleUp(upEvent: PointerEvent) {
      commitTime(slug, arrivalMinutes + toDelta(upEvent.clientY));
      setDragState(null);
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  function handleKeyDown(event: ReactKeyboardEvent<HTMLButtonElement>, slug: string, arrivalMinutes: number) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const delta = event.key === "ArrowUp" ? -KEYBOARD_STEP_MINUTES : KEYBOARD_STEP_MINUTES;
    commitTime(slug, arrivalMinutes + delta);
  }

  if (places.length === 0) {
    return (
      <div className="flex w-[300px] shrink-0 items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
        {t.emptyDay}
      </div>
    );
  }

  const stops = timeline.stops;
  const startMinutes = Math.min(timeline.leaveByMinutes ?? stops[0].arrivalMinutes, stops[0].arrivalMinutes) - 30;
  const endMinutes = stops[stops.length - 1].departureMinutes + 30;
  const trackHeight = Math.max(endMinutes - startMinutes, 60) * PX_PER_MINUTE;

  const goldenHourLabel = (type: NonNullable<Place["goldenHourType"]>) =>
    type === "sunrise" ? t.sunrise : type === "sunset" ? t.sunset : type === "blue_hour" ? t.blueHour : t.night;

  return (
    <div className="w-[300px] shrink-0 rounded-lg border border-border bg-surface p-4">
      <h3 className="mb-3 font-serif-display text-lg">
        {dict.planner.day} {dayNumber}
      </h3>

      {baseLocation ? (
        timeline.leaveByMinutes !== null ? (
          <p className="mb-3 flex items-center gap-1.5 rounded-md bg-accent/10 px-3 py-2 text-sm font-medium text-accent-text">
            <LocateFixed className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t.leaveBy.replace("{time}", minutesToClock(timeline.leaveByMinutes))}
          </p>
        ) : null
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">{t.noBaseLocation}</p>
      )}
      {sun.isEstimate ? <p className="mb-3 text-[11px] text-muted-foreground">{t.estimateNotice}</p> : null}

      <div
        className="relative overflow-hidden rounded-md border border-border"
        style={{ height: trackHeight, background: buildTimeOfDayGradient(startMinutes, endMinutes, sun) }}
      >
        {stops.map((stop) => {
          const isDragging = dragState?.slug === stop.place.slug;
          const displayArrival = isDragging ? dragState!.previewMinutes : stop.arrivalMinutes;
          const displayDeparture = displayArrival + (stop.departureMinutes - stop.arrivalMinutes);
          const top = (displayArrival - startMinutes) * PX_PER_MINUTE;
          const height = Math.max((stop.departureMinutes - stop.arrivalMinutes) * PX_PER_MINUTE, MIN_BLOCK_HEIGHT);

          return (
            <div
              key={stop.place.slug}
              role="group"
              aria-label={`${stop.place.name[locale]}, ${minutesToClock(displayArrival)}–${minutesToClock(displayDeparture)}`}
              className={cn(
                "absolute left-2 right-2 rounded-md border bg-surface/95 px-3 py-2 text-xs shadow-sm backdrop-blur-sm",
                stop.isGoldenHour ? "border-accent shadow-[0_0_0_2px_var(--color-accent)]" : "border-border-strong",
                stop.conflict ? "ring-2 ring-destructive" : "",
                isDragging ? "z-10 opacity-90" : ""
              )}
              style={{ top, height }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{stop.place.name[locale]}</p>
                  <p className="tabular-nums text-[11px] text-muted-foreground">
                    {minutesToClock(displayArrival)}–{minutesToClock(displayDeparture)}
                  </p>
                </div>
                <button
                  type="button"
                  aria-label={t.dragHint}
                  title={t.dragHint}
                  onPointerDown={(e) => handlePointerDown(e, stop.place.slug, stop.arrivalMinutes)}
                  onKeyDown={(e) => handleKeyDown(e, stop.place.slug, stop.arrivalMinutes)}
                  className="shrink-0 touch-none rounded p-1 text-muted-foreground hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:cursor-grabbing"
                >
                  <GripVertical className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>

              {stop.isGoldenHour && stop.goldenHourType ? (
                <p className="mt-1 flex items-center gap-1 text-[11px] text-accent-text">
                  {stop.goldenHourType === "sunset" || stop.goldenHourType === "blue_hour" ? (
                    <Sunset className="h-3 w-3 shrink-0" aria-hidden="true" />
                  ) : (
                    <Sun className="h-3 w-3 shrink-0" aria-hidden="true" />
                  )}
                  {goldenHourLabel(stop.goldenHourType)}
                </p>
              ) : null}

              {stop.userLocked ? (
                <button
                  type="button"
                  onClick={() => setLockedTime(dayId, stop.place.slug, null)}
                  className="mt-1 flex items-center gap-1 text-[11px] text-accent-text underline-offset-2 hover:underline"
                >
                  <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                  {t.reset}
                </button>
              ) : null}

              {stop.conflict ? (
                <p className="mt-1 text-[11px] text-destructive">{t.conflict}</p>
              ) : stop.waitMinutes > 0 ? (
                <p className="mt-1 text-[11px] text-muted-foreground">{t.wait.replace("{minutes}", String(stop.waitMinutes))}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
