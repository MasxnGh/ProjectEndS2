"use client";

import { useMemo, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { AlertTriangle, GripVertical, Lock, LocateFixed, Route, Sun, Sunset } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import type { Place } from "@/data/types";
import type { DailyForecastEntry } from "@/lib/weather/types";
import { minutesToClock } from "@/lib/opening-hours";
import { buildDayTimeline, resolveSunTimes, type SunTimes, type TimelineStop } from "@/lib/planner/golden-hour";
import { cn } from "@/lib/utils";

/**
 * How much vertical room a minute earns.
 *
 * Raised from 1.1. At that scale a 40-minute stop owned 44px while its
 * heading alone needs 46px, so short stops were structurally unable to fit
 * and landed on top of whatever came next — a locked stop with a warning
 * overlapped the following block by 17px. Giving a minute more room fixes
 * that at the source, and keeps every block exactly where its time says it
 * belongs, which pushing blocks around to avoid collisions would not.
 *
 * A twelve-hour day is ~1,150px of track. That is a long column, but the
 * timeline is already a scrolling card, and a readable long column beats a
 * compact one where the blocks cover each other.
 */
const PX_PER_MINUTE = 1.6;
/**
 * The shortest a block may be: just its heading. Kept deliberately tight.
 *
 * A very short stop can never own enough track to be readable — a 20-minute
 * visit is 32px and its name and time need ~46px — so some overlap between
 * back-to-back short stops is unavoidable. What matters is *what* gets
 * covered: content sits at the top of a block and later blocks paint over
 * earlier ones, so a tight floor means the overlap eats trailing padding
 * rather than the next stop's name.
 */
const MIN_BLOCK_HEIGHT = 50;
/**
 * A block's height is its duration, so it cannot grow to fit its contents —
 * growing one drops it on top of the next stop. Instead the extras (golden
 * hour, a time lock, a warning) collapse into a single compact row of
 * markers, so the most any block ever needs is its heading plus one line.
 */
const BLOCK_HEADING_PX = 44;
const BLOCK_MARKER_ROW_PX = 20;
const SNAP_MINUTES = 5;
const KEYBOARD_STEP_MINUTES = 15;
const MAX_MINUTES = 23 * 60 + 55;
/** Free time before a stop past this is flagged as worth double-checking, not just quietly noted as buffer. */
const LONG_GAP_WARNING_MINUTES = 120;

interface HourMark {
  minutes: number;
  top: number;
}

function hourMarks(startMinutes: number, endMinutes: number): HourMark[] {
  const marks: HourMark[] = [];
  const first = Math.ceil(startMinutes / 60) * 60;
  for (let m = first; m <= endMinutes; m += 60) {
    marks.push({ minutes: m, top: (m - startMinutes) * PX_PER_MINUTE });
  }
  return marks;
}

/** Whether this stop shows the marker row at all. */
function hasMarkers(stop: TimelineStop): boolean {
  return Boolean(
    (stop.isGoldenHour && stop.goldenHourType) ||
      stop.userLocked ||
      stop.outsideOpeningHours ||
      stop.conflict ||
      stop.waitMinutes > LONG_GAP_WARNING_MINUTES
  );
}

/**
 * The height a block needs: its duration, floored so the heading — and the
 * marker row when there is one — always fits. Deliberately only one row's
 * worth of slack: any more and short stops start covering the next one.
 */
function blockHeightFor(stop: TimelineStop, durationMinutes: number): number {
  const floor = hasMarkers(stop) ? BLOCK_HEADING_PX + BLOCK_MARKER_ROW_PX : MIN_BLOCK_HEIGHT;
  return Math.max(durationMinutes * PX_PER_MINUTE, MIN_BLOCK_HEIGHT, floor);
}

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
  fullWidth,
}: {
  dayId: string;
  dayNumber: number;
  date: string | null;
  places: Place[];
  forecastEntry: DailyForecastEntry | undefined;
  /** Stretches to fill the column instead of a fixed card width — used when this is the only day, so a single-day trip's timeline isn't left stranded in a narrow strip. */
  fullWidth?: boolean;
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
      <div
        className={cn(
          "flex items-center justify-center rounded-lg border border-dashed border-border p-8 text-center text-xs text-muted-foreground",
          fullWidth ? "w-full" : "w-[380px] shrink-0 snap-start lg:w-[400px]"
        )}
      >
        {t.emptyDay}
      </div>
    );
  }

  const stops = timeline.stops;
  const startMinutes = Math.min(timeline.leaveByMinutes ?? stops[0].arrivalMinutes, stops[0].arrivalMinutes) - 30;
  const endMinutes = stops[stops.length - 1].departureMinutes + 30;

  // The track is `overflow-hidden`, so it has to be at least as tall as the
  // lowest block reaches. A block that grew to fit a warning used to run past
  // the bottom edge and get cut off there.
  const lowestBlockBottom = stops.reduce((lowest, stop) => {
    const top = (stop.arrivalMinutes - startMinutes) * PX_PER_MINUTE;
    return Math.max(lowest, top + blockHeightFor(stop, stop.departureMinutes - stop.arrivalMinutes));
  }, 0);
  const trackHeight = Math.max(
    Math.max(endMinutes - startMinutes, 60) * PX_PER_MINUTE,
    lowestBlockBottom + BLOCK_MARKER_ROW_PX
  );

  const goldenHourLabel = (type: NonNullable<Place["goldenHourType"]>) =>
    type === "sunrise" ? t.sunrise : type === "sunset" ? t.sunset : type === "blue_hour" ? t.blueHour : t.night;

  const marks = hourMarks(startMinutes, endMinutes);
  const sunMarks = [
    { minutes: sun.sunriseMinutes, label: t.axisSunrise, Icon: Sun },
    { minutes: sun.sunsetMinutes, label: t.axisSunset, Icon: Sunset },
  ].filter((m) => m.minutes >= startMinutes && m.minutes <= endMinutes);

  const stopPositions = stops.map((stop) => {
    const isDragging = dragState?.slug === stop.place.slug;
    const displayArrival = isDragging ? dragState!.previewMinutes : stop.arrivalMinutes;
    const displayDeparture = displayArrival + (stop.departureMinutes - stop.arrivalMinutes);
    return {
      stop,
      isDragging,
      displayArrival,
      displayDeparture,
      top: (displayArrival - startMinutes) * PX_PER_MINUTE,
      height: blockHeightFor(stop, stop.departureMinutes - stop.arrivalMinutes),
    };
  });

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", fullWidth ? "w-full" : "w-[380px] shrink-0 snap-start lg:w-[400px]")}>
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
        <div className="mb-3 space-y-1.5">
          {/* Ghost preview of the "Leave by" banner — shows the feature's shape, not a fabricated time. */}
          <p className="flex items-center gap-1.5 rounded-md border border-dashed border-border-strong px-3 py-2 text-sm font-medium text-muted-foreground/70">
            <LocateFixed className="h-4 w-4 shrink-0" aria-hidden="true" />
            {t.leaveBy.replace("{time}", "--:--")}
          </p>
          <p className="text-xs text-muted-foreground">{t.noBaseLocation}</p>
        </div>
      )}
      {!date ? (
        <p className="mb-3 text-[11px] text-accent-text">{t.noDateNotice}</p>
      ) : sun.isEstimate ? (
        <p className="mb-3 text-[11px] text-muted-foreground">{t.estimateNotice}</p>
      ) : null}

      <div
        className="relative overflow-hidden rounded-md border border-border"
        style={{ height: trackHeight, background: buildTimeOfDayGradient(startMinutes, endMinutes, sun) }}
      >
        {marks.map((mark) => (
          <div key={mark.minutes} className="pointer-events-none absolute inset-x-0 border-t border-border/40" style={{ top: mark.top }}>
            <span className="absolute left-1.5 top-0.5 rounded bg-surface/70 px-1 text-[9px] tabular-nums text-muted-foreground">
              {minutesToClock(mark.minutes)}
            </span>
          </div>
        ))}

        {sunMarks.map(({ minutes, label, Icon }) => (
          <div
            key={label}
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-accent/70"
            style={{ top: (minutes - startMinutes) * PX_PER_MINUTE }}
          >
            <span className="absolute right-1.5 top-0.5 flex items-center gap-1 rounded bg-surface/80 px-1 text-[9px] font-medium text-accent-text">
              <Icon className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
              {label} · {minutesToClock(minutes)}
            </span>
          </div>
        ))}

        {stopPositions.slice(1).map(({ stop, top }, i) => {
          const prev = stopPositions[i];
          const gapTop = prev.top + prev.height;
          const gapHeight = Math.max(top - gapTop, 0);
          if (!stop.travelMinutesFromPrevious) return null;
          return (
            <div
              key={`connector-${stop.place.slug}`}
              className="pointer-events-none absolute inset-x-0 z-0"
              style={{ top: gapTop, height: gapHeight }}
            >
              <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 border-l border-dashed border-border-strong" />
              <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-border-strong bg-surface px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground shadow-sm">
                <Route className="h-2.5 w-2.5 shrink-0" aria-hidden="true" />
                {t.travelMinutes.replace("{minutes}", String(stop.travelMinutesFromPrevious))}
              </span>
            </div>
          );
        })}

        {stopPositions.map(({ stop, isDragging, displayArrival, displayDeparture, top, height }) => {
          // Short form for the strip, full sentence for `title` and the label.
          const markerWarning = stop.outsideOpeningHours
            ? {
                short: stop.place.openingHours?.opens ?? "",
                full: t.closedAtThisTime.replace("{opens}", stop.place.openingHours?.opens ?? ""),
              }
            : stop.conflict
              ? { short: "", full: t.conflict }
              : stop.waitMinutes > LONG_GAP_WARNING_MINUTES
                ? {
                    short: `+${stop.waitMinutes}`,
                    full: t.longGap.replace("{minutes}", String(stop.waitMinutes)),
                  }
                : null;

          return (
            <div
              key={stop.place.slug}
              role="group"
              aria-label={[
                stop.place.name[locale],
                `${minutesToClock(displayArrival)}–${minutesToClock(displayDeparture)}`,
                stop.userLocked ? t.reset : null,
                markerWarning?.full ?? null,
              ]
                .filter(Boolean)
                .join(", ")}
              className={cn(
                "absolute left-2 right-2 z-10 rounded-md border bg-surface/95 px-3 py-1.5 text-xs shadow-sm backdrop-blur-sm",
                stop.isGoldenHour ? "border-accent shadow-[0_0_0_2px_var(--color-accent)]" : "border-border-strong",
                stop.conflict || stop.outsideOpeningHours ? "ring-2 ring-destructive" : "",
                isDragging ? "z-20 opacity-90" : ""
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

              {/* One line, never more. Each marker carries its full sentence in
                  `title`, and the block's aria-label repeats it for screen
                  readers, so compacting the display costs no information. */}
              {hasMarkers(stop) ? (
                <div className="mt-1 flex items-center gap-2 overflow-hidden text-[11px]">
                  {stop.isGoldenHour && stop.goldenHourType ? (
                    <span
                      className="flex shrink-0 items-center gap-1 text-accent-text"
                      title={goldenHourLabel(stop.goldenHourType)}
                    >
                      {stop.goldenHourType === "sunset" || stop.goldenHourType === "blue_hour" ? (
                        <Sunset className="h-3 w-3 shrink-0" aria-hidden="true" />
                      ) : (
                        <Sun className="h-3 w-3 shrink-0" aria-hidden="true" />
                      )}
                    </span>
                  ) : null}

                  {stop.userLocked ? (
                    <button
                      type="button"
                      onClick={() => setLockedTime(dayId, stop.place.slug, null)}
                      aria-label={t.reset}
                      title={t.reset}
                      // Padded out to a 24px target with a matching negative
                      // margin: as an icon-only control it was 12px square,
                      // which is not tappable, and the padding must not push
                      // the marker row taller.
                      className="-m-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded p-1.5 text-accent-text hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
                    </button>
                  ) : null}

                  {markerWarning ? (
                    <span
                      className="flex min-w-0 items-center gap-1 text-destructive"
                      title={markerWarning.full}
                    >
                      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{markerWarning.short}</span>
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
