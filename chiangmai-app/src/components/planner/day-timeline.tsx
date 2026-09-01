"use client";

import { OpenInMapsLink } from "@/components/planner/open-in-maps-link";
import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Lock, LocateFixed, Route, Sun, Sunset } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import type { Place } from "@/data/types";
import type { DailyForecastEntry } from "@/lib/weather/types";
import { minutesToClock } from "@/lib/opening-hours";
import {
  buildDayTimeline,
  earliestFeasibleArrival,
  resolveSunTimes,
  type SunTimes,
  type TimelineStop,
} from "@/lib/planner/golden-hour";
import { cn } from "@/lib/utils";

/**
 * How tall a stop's rail bar grows per minute.
 *
 * This is the only place a duration touches pixels now, and it sizes a bar
 * *inside* a row rather than the row itself. The previous design made a
 * block's height its duration, which forced one element to be both a
 * faithful scale (a 20-minute stop must be tiny) and a content box (it must
 * hold a name, a time and a warning). Those demands contradict, `MIN_BLOCK_
 * HEIGHT` had already broken the scale to paper over it, and short stops
 * still ended up covering the next stop's name. Sizing rows by their content
 * and proportion by a bar retires that whole class of bug.
 */
const RAIL_PX_PER_MINUTE = 0.5;
const RAIL_MIN_PX = 10;
const STEP_MINUTES = 15;
/** Times are a clock, not a duration: nothing may be set before midnight or after the last five-minute slot of the day. */
const DAY_END_MINUTES = 23 * 60 + 55;
/** Free time before a stop past this is flagged as worth double-checking, not just quietly noted as buffer. */
const LONG_GAP_WARNING_MINUTES = 120;

/** Shared column template, so times, rail and content line up across every kind of row. */
const ROW_GRID = "grid grid-cols-[2.75rem_0.75rem_minmax(0,1fr)] gap-x-2";
/**
 * The one vertical rhythm every row keeps, so the gap between any two rows is
 * the same 8px whichever kinds they are. Rows had drifted to three different
 * values — `py-1` on travel and sun rows, `my-0.5` on a warning, and nothing
 * at all on a stop card — which left a warning sitting 2px off the card it
 * was about while everything else had 8px.
 *
 * It has to be margin on every row, not padding on some of them: padding sits
 * *inside* a row's own box, so a padded text row and a margined card were
 * still only 4px apart while two cards were 8px. One value, applied one way.
 */
const ROW_SPACING = "my-1";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function clampToDay(minutes: number): number {
  return Math.max(0, Math.min(DAY_END_MINUTES, minutes));
}

/**
 * The rail bar's colour, from the app's own accent (golden hour) and
 * foreground (night) tokens — the same two the old background wash was built
 * from. That wash mapped position to time, which only worked while the track
 * was proportional; reading each stop's own colour from its own clock keeps
 * the day/night identity and is accurate in a list.
 */
function railTint(stop: TimelineStop, sun: SunTimes): string {
  if (stop.isGoldenHour) return "var(--color-accent)";
  const middle = (stop.arrivalMinutes + stop.departureMinutes) / 2;
  const afterDark = middle < sun.sunriseMinutes || middle > sun.sunsetMinutes;
  return afterDark
    ? "color-mix(in srgb, var(--color-foreground) 45%, transparent)"
    : "color-mix(in srgb, var(--color-accent) 55%, transparent)";
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
  /** The stop whose last time change was held back, and the time it was held to. */
  const [heldBack, setHeldBack] = useState<{ slug: string; earliest: number } | null>(null);

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

  const stops = timeline.stops;

  /**
   * Sets a stop's time, refusing to put it somewhere the traveller cannot
   * physically be. Rather than accept the time and flag it — which is what
   * produced a day where two locked stops sat in the same minutes — the time
   * is held at the earliest reachable one and the row explains why.
   */
  function commitTime(index: number, minutes: number) {
    const stop = stops[index];
    if (!stop) return;
    const earliest = earliestFeasibleArrival(stops, index);
    const wanted = clampToDay(minutes);
    if (earliest !== null && wanted < earliest) {
      setHeldBack({ slug: stop.place.slug, earliest });
      setLockedTime(dayId, stop.place.slug, minutesToClock(clampToDay(earliest)));
      return;
    }
    setHeldBack(null);
    setLockedTime(dayId, stop.place.slug, minutesToClock(wanted));
  }

  function resetTime(slug: string) {
    setHeldBack((current) => (current?.slug === slug ? null : current));
    setLockedTime(dayId, slug, null);
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

  const goldenHourLabel = (type: NonNullable<Place["goldenHourType"]>) =>
    type === "sunrise" ? t.sunrise : type === "sunset" ? t.sunset : type === "blue_hour" ? t.blueHour : t.night;

  const dayStart = Math.min(timeline.leaveByMinutes ?? stops[0].arrivalMinutes, stops[0].arrivalMinutes) - 30;
  const dayEnd = stops[stops.length - 1].departureMinutes + 30;

  // Sun events sit between the stops they fall between. An event inside a
  // stop's own span is already shown on that stop as its golden-hour marker.
  const sunEvents = [
    { minutes: sun.sunriseMinutes, label: t.axisSunrise, Icon: Sun },
    { minutes: sun.sunsetMinutes, label: t.axisSunset, Icon: Sunset },
  ]
    .filter((event) => event.minutes >= dayStart && event.minutes <= dayEnd)
    .map((event) => {
      const before = stops.findIndex((stop) => stop.arrivalMinutes >= event.minutes);
      return { ...event, beforeIndex: before === -1 ? stops.length : before };
    });

  const rows: React.ReactNode[] = [];

  stops.forEach((stop, index) => {
    const duration = stop.departureMinutes - stop.arrivalMinutes;
    const previous = index > 0 ? stops[index - 1] : null;
    const earliest = earliestFeasibleArrival(stops, index);

    for (const event of sunEvents) {
      if (event.beforeIndex !== index) continue;
      rows.push(
        <li key={`sun-${event.label}`} className={cn(ROW_GRID, "items-center")}>
          <span className="text-right text-xs tabular-nums text-accent-text">{minutesToClock(event.minutes)}</span>
          <RailLine dashed />
          <p className={cn(ROW_SPACING, "flex items-center gap-1.5 text-xs font-medium text-accent-text")}>
            <event.Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
            {event.label}
          </p>
        </li>
      );
    }

    if (previous && stop.travelMinutesFromPrevious > 0) {
      const longGap = stop.waitMinutes > LONG_GAP_WARNING_MINUTES;
      rows.push(
        <li key={`travel-${stop.place.slug}`} className={cn(ROW_GRID, "items-center")}>
          <span aria-hidden="true" />
          <RailLine dashed />
          <p className={cn(ROW_SPACING, "flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground")}>
            <span className="flex items-center gap-1">
              <Route className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t.travelMinutes.replace("{minutes}", String(stop.travelMinutesFromPrevious))}
            </span>
            {stop.waitMinutes > 0 ? (
              <span className={longGap ? "flex items-center gap-1 text-destructive" : undefined}>
                {longGap ? <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" /> : null}
                {longGap
                  ? t.longGap.replace("{minutes}", String(stop.waitMinutes))
                  : t.wait.replace("{minutes}", String(stop.waitMinutes))}
              </span>
            ) : null}
          </p>
        </li>
      );
    }

    // A day loaded from an older saved trip, or reordered after its times
    // were locked, can still hold an unreachable stop — `buildDayTimeline`
    // keeps its promise never to move a lock on its own. It gets a row of its
    // own with a way out, instead of an icon underneath the block covering it.
    if (stop.conflict && previous && earliest !== null) {
      const shortBy = earliest - stop.arrivalMinutes;
      rows.push(
        <li key={`conflict-${stop.place.slug}`} className={cn(ROW_GRID, "items-center")}>
          <span aria-hidden="true" />
          <RailLine />
          <p className={cn(ROW_SPACING, "flex flex-wrap items-center justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive")}>
            <span className="flex min-w-0 items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t.shortfallRow.replace("{minutes}", String(shortBy))}
            </span>
            <button
              type="button"
              onClick={() => commitTime(index, earliest)}
              className="shrink-0 rounded border border-destructive/50 px-2 py-0.5 font-medium hover:bg-destructive/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              {t.fixOverlap}
            </button>
          </p>
        </li>
      );
    }

    const wasHeldBack = heldBack?.slug === stop.place.slug;

    rows.push(
      <li key={stop.place.slug} className={cn(ROW_GRID, "items-stretch")}>
        {/* Rows follow the order the day was arranged in, not the clock, so an
            unreachable stop shows a time earlier than the row above it. That
            is the truth about the itinerary rather than a glitch — colouring
            it says so, and the row above offers the fix. */}
        <span
          className={cn(
            "pt-3 text-right text-xs font-medium tabular-nums",
            stop.conflict ? "text-destructive" : "text-muted-foreground"
          )}
        >
          {minutesToClock(stop.arrivalMinutes)}
        </span>

        <span className="relative" aria-hidden="true">
          <span className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-border" />
          <span
            className="absolute left-1/2 top-1/2 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              // Proportional up to the row it lives in: past that the bar
              // stops growing, so a six-hour stop reads as "the longest" but
              // never dictates how tall the row is.
              height: `min(${Math.max(duration * RAIL_PX_PER_MINUTE, RAIL_MIN_PX)}px, calc(100% - 0.5rem))`,
              background: railTint(stop, sun),
            }}
          />
        </span>

        <div
          className={cn(
            ROW_SPACING,
            "min-w-0 rounded-md border bg-surface px-3 py-2 text-xs shadow-sm",
            stop.isGoldenHour ? "border-accent" : "border-border-strong",
            stop.conflict || stop.outsideOpeningHours ? "ring-1 ring-destructive" : ""
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-medium text-foreground">{stop.place.name[locale]}</p>
              <p className="tabular-nums text-xs text-muted-foreground">
                {minutesToClock(stop.arrivalMinutes)}–{minutesToClock(stop.departureMinutes)}
                {" · "}
                {t.durationMinutes.replace("{minutes}", String(duration))}
              </p>
            </div>

            {/* Two explicit steps, not a vertical drag. Pixels stopped meaning
                minutes when rows became content-sized — and in this planner a
                vertical drag on a row is already dnd-kit's gesture for
                reordering the day, so keeping it here would collide. */}
            <div
              role="group"
              aria-label={t.adjustTime.replace("{place}", stop.place.name[locale])}
              className="flex shrink-0 flex-col overflow-hidden rounded border border-border-strong"
            >
              <button
                type="button"
                aria-label={t.stepEarlier}
                title={t.stepEarlier}
                onClick={() => commitTime(index, stop.arrivalMinutes - STEP_MINUTES)}
                className="flex h-5 w-6 items-center justify-center text-muted-foreground hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronUp className="h-3 w-3" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={t.stepLater}
                title={t.stepLater}
                onClick={() => commitTime(index, stop.arrivalMinutes + STEP_MINUTES)}
                className="flex h-5 w-6 items-center justify-center border-t border-border-strong text-muted-foreground hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Rows are sized by what they hold now, so these say what they mean
              instead of shrinking to bare icons. */}
          {stop.isGoldenHour && stop.goldenHourType ? (
            <p className="mt-1.5 flex items-center gap-1.5 text-xs text-accent-text">
              {stop.goldenHourType === "sunset" || stop.goldenHourType === "blue_hour" ? (
                <Sunset className="h-3 w-3 shrink-0" aria-hidden="true" />
              ) : (
                <Sun className="h-3 w-3 shrink-0" aria-hidden="true" />
              )}
              {goldenHourLabel(stop.goldenHourType)}
            </p>
          ) : null}

          {stop.outsideOpeningHours ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-destructive">
              <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
              {t.closedAtThisTime.replace("{opens}", stop.place.openingHours?.opens ?? "")}
            </p>
          ) : null}

          {wasHeldBack && previous ? (
            <p className="mt-1.5 rounded bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {t.earliestFeasible.replace("{time}", minutesToClock(heldBack!.earliest))}
              </span>
              <br />
              {t.earliestFeasibleWhy
                .replace("{place}", previous.place.name[locale])
                .replace("{time}", minutesToClock(previous.departureMinutes))
                .replace("{minutes}", String(stop.travelMinutesFromPrevious))}
            </p>
          ) : null}

          {stop.userLocked ? (
            <button
              type="button"
              onClick={() => resetTime(stop.place.slug)}
              title={t.lockedHint}
              className="mt-1.5 flex items-center gap-1.5 rounded py-0.5 text-xs text-accent-text underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
            >
              <Lock className="h-3 w-3 shrink-0" aria-hidden="true" />
              {t.reset}
            </button>
          ) : null}
        </div>
      </li>
    );
  });

  return (
    <div className={cn("rounded-lg border border-border bg-surface p-4", fullWidth ? "w-full" : "w-[380px] shrink-0 snap-start lg:w-[400px]")}>
      {/* The timeline is the view someone reads on the morning of the day, so
          the link out to navigation belongs at the top of it. */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="font-serif-display text-lg">
          {dict.planner.day} {dayNumber}
        </h3>
        <OpenInMapsLink places={places} variant="icon" className="-mr-1.5 shrink-0" />
      </div>

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
        <p className="mb-3 text-xs text-accent-text">{t.noDateNotice}</p>
      ) : sun.isEstimate ? (
        <p className="mb-3 text-xs text-muted-foreground">{t.estimateNotice}</p>
      ) : null}

      <ol className="rounded-md border border-border p-2">{rows}</ol>
    </div>
  );
}

/** The thread running down the day, behind every row. */
function RailLine({ dashed }: { dashed?: boolean }) {
  return (
    <span className="relative" aria-hidden="true">
      <span
        className={cn(
          "absolute left-1/2 top-0 h-full -translate-x-1/2",
          dashed ? "border-l border-dashed border-border-strong" : "w-px bg-border"
        )}
      />
    </span>
  );
}
