"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Clock,
  Ellipsis,
  ExternalLink,
  GripVertical,
  House,
  Lock,
  Plus,
  Route,
  RotateCcw,
  Sun,
  Sunset,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import type { DayTimeline, TimelineStop } from "@/lib/planner/golden-hour";
import { earliestFeasibleArrival } from "@/lib/planner/golden-hour";
import { minutesToClock } from "@/lib/opening-hours";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { Button, ButtonLink, buttonStyles } from "@/components/brand/button";
import { googleMapsReviewsUrl } from "@/lib/google-maps";
import { ICON_STROKE, categoryIcon } from "@/components/brand/icons";
import { NoPhoto, PlacePhoto } from "@/components/brand/place-photo";
import { Select } from "@/components/brand/select";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, formatDuration } from "@/components/brand/place-text";
import { moveFromTo, restoreToContainer } from "./restore";
import { ThaiName } from "@/components/brand/thai-name";

const STEP_MINUTES = 15;
/** Nothing may be set before midnight or after the last five-minute slot of the day. */
const DAY_END_MINUTES = 23 * 60 + 55;
/** Free time before a stop past this is flagged as worth a second look. */
const LONG_GAP_WARNING_MINUTES = 120;

const clampToDay = (minutes: number) => Math.max(0, Math.min(DAY_END_MINUTES, minutes));

export const itemId = (containerId: string, slug: string) => `${containerId}::${slug}`;
export function parseItemId(id: string): { containerId: string; slug: string } | null {
  const at = id.indexOf("::");
  return at === -1 ? null : { containerId: id.slice(0, at), slug: id.slice(at + 2) };
}

export interface DayChoice {
  id: string;
  dayNumber: number;
}

/**
 * One day, in order: when to leave, each stop with the time you get there
 * and leave, and the road between them. The times are the planner's own
 * Golden Hour timeline — the same one the old review view showed — so a time
 * you set yourself, a sunrise stop and where you're staying all show here.
 */
export function StopList({
  dayId,
  dayNumber,
  timeline,
  hasDate,
  days,
  hoveredSlug,
  focusedSlug,
  onHover,
  onAddPlace,
}: {
  dayId: string;
  dayNumber: number;
  timeline: DayTimeline;
  hasDate: boolean;
  /** Every day of the trip, for "move to". */
  days: DayChoice[];
  hoveredSlug: string | null;
  focusedSlug: string | null;
  onHover: (slug: string | null) => void;
  onAddPlace: (trigger: HTMLElement) => void;
}) {
  const { dict } = useLocale();
  const t = dict.plan;
  const g = dict.planner.goldenHour;
  const baseLocation = useTripStore((s) => s.baseLocation);
  const setLockedTime = useTripStore((s) => s.setLockedTime);
  const { setNodeRef, isOver } = useDroppable({ id: dayId });
  const [heldBack, setHeldBack] = useState<{ slug: string; earliest: number } | null>(null);
  const stops = timeline.stops;
  const sun = timeline.sun;

  // Unchanged from the old timeline: a time is never set somewhere you can't
  // physically be. It is held at the earliest reachable time instead, and the
  // stop says why.
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

  // Sun events sit between the stops they fall between; one inside a stop's
  // own span is shown on that stop as its golden-hour line instead.
  const sunEvents =
    stops.length === 0
      ? []
      : [
          { minutes: sun.sunriseMinutes, label: g.axisSunrise, Icon: Sun },
          { minutes: sun.sunsetMinutes, label: g.axisSunset, Icon: Sunset },
        ]
          .filter((event) => {
            const start = Math.min(timeline.leaveByMinutes ?? stops[0].arrivalMinutes, stops[0].arrivalMinutes) - 30;
            const end = stops[stops.length - 1].departureMinutes + 30;
            return event.minutes >= start && event.minutes <= end;
          })
          .map((event) => {
            const before = stops.findIndex((stop) => stop.arrivalMinutes >= event.minutes);
            return { ...event, beforeIndex: before === -1 ? stops.length : before };
          });

  return (
    <div className="grid gap-3">
      {!hasDate ? (
        <p className="text-small text-pretty text-ink-soft">{g.noDateNotice}</p>
      ) : sun.isEstimate ? (
        <p className="text-small text-pretty text-ink-soft">{g.estimateNotice}</p>
      ) : null}

      <ol
        ref={setNodeRef}
        tabIndex={-1}
        aria-label={fill(t.stopsLabel, { day: dayNumber })}
        className={cx("grid rounded-lg transition-colors duration-150", isOver && "bg-leaf-fill")}
      >
        {stops.length > 0 ? (
          <LeaveRow time={baseLocation && timeline.leaveByMinutes !== null ? minutesToClock(timeline.leaveByMinutes) : null} />
        ) : null}

        <SortableContext items={stops.map((stop) => itemId(dayId, stop.place.slug))} strategy={verticalListSortingStrategy}>
          {stops.map((stop, index) => (
            <StopItem
              key={stop.place.slug}
              dayId={dayId}
              dayNumber={dayNumber}
              index={index}
              stop={stop}
              previous={index > 0 ? stops[index - 1] : null}
              earliest={earliestFeasibleArrival(stops, index)}
              sunEvents={sunEvents.filter((event) => event.beforeIndex === index)}
              heldBack={heldBack?.slug === stop.place.slug ? heldBack.earliest : null}
              days={days}
              hovered={hoveredSlug === stop.place.slug}
              focused={focusedSlug === stop.place.slug}
              onHover={onHover}
              onCommitTime={(minutes) => commitTime(index, minutes)}
              onResetTime={() => resetTime(stop.place.slug)}
            />
          ))}
        </SortableContext>

        {sunEvents
          .filter((event) => event.beforeIndex === stops.length)
          .map((event) => (
            <li key={event.label}>
              <SunRow minutes={event.minutes} label={event.label} Icon={event.Icon} />
            </li>
          ))}
      </ol>

      {stops.length === 0 ? (
        <p className="rounded-lg bg-well px-5 py-6 text-center text-small text-pretty text-ink-soft">{t.emptyDay}</p>
      ) : null}

      <button
        type="button"
        onClick={(event) => onAddPlace(event.currentTarget)}
        className={cx(
          "flex min-h-14 w-full items-center justify-center gap-2 rounded-lg border-[1.5px] border-dashed border-line-strong",
          "font-brand text-label text-brand transition-colors duration-150 hover:bg-well",
          focusRing,
        )}
      >
        <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        {fill(t.addToDay, { day: dayNumber })}
      </button>
    </div>
  );
}

/** The thread down the left of the list, from one stop's time column to the next. */
const RAIL = "ml-[25px] border-l-2 border-dashed border-line-strong pl-[18px] sm:ml-[29px]";

function LeaveRow({ time }: { time: string | null }) {
  const { dict } = useLocale();
  const g = dict.planner.goldenHour;
  return (
    <li className="flex items-center gap-3 pb-2">
      <span
        className={cx(
          "grid size-11 flex-none place-items-center rounded-full",
          time ? "bg-leaf-fill text-brand" : "bg-well text-ink-soft",
        )}
      >
        <House aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </span>
      {time ? (
        <p className="text-label">
          <span className="font-semibold text-brand tabular-nums">{fill(g.leaveBy, { time })}</span>
          <span className="block text-small text-ink-soft">{dict.plan.leaveBase}</span>
        </p>
      ) : (
        <p className="text-small text-pretty text-ink-soft">{dict.plan.leaveBaseHint}</p>
      )}
    </li>
  );
}

function SunRow({ minutes, label, Icon }: { minutes: number; label: string; Icon: typeof Sun }) {
  return (
    <p className={cx(RAIL, "flex items-center gap-2 py-2 text-small font-medium text-brand")}>
      <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-cmj-sunset" />
      <span className="tabular-nums">{minutesToClock(minutes)}</span>
      {label}
    </p>
  );
}

function StopItem({
  dayId,
  dayNumber,
  index,
  stop,
  previous,
  earliest,
  sunEvents,
  heldBack,
  days,
  hovered,
  focused,
  onHover,
  onCommitTime,
  onResetTime,
}: {
  dayId: string;
  dayNumber: number;
  index: number;
  stop: TimelineStop;
  previous: TimelineStop | null;
  earliest: number | null;
  sunEvents: { minutes: number; label: string; Icon: typeof Sun }[];
  heldBack: number | null;
  days: DayChoice[];
  hovered: boolean;
  focused: boolean;
  onHover: (slug: string | null) => void;
  onCommitTime: (minutes: number) => void;
  onResetTime: () => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.plan;
  const g = dict.planner.goldenHour;
  const place = stop.place;
  const name = place.name[locale];
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId(dayId, place.slug),
  });
  const [open, setOpen] = useState(false);
  const toolsId = useId();
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focused) cardRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focused]);

  const longGap = stop.waitMinutes > LONG_GAP_WARNING_MINUTES;
  const Icon = categoryIcon[place.category];
  const goldenLabel =
    stop.goldenHourType === "sunrise"
      ? g.sunrise
      : stop.goldenHourType === "sunset"
        ? g.sunset
        : stop.goldenHourType === "blue_hour"
          ? g.blueHour
          : g.night;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx("relative", isDragging && "z-10 opacity-60")}
      onMouseEnter={() => onHover(place.slug)}
      onMouseLeave={() => onHover(null)}
    >
      {sunEvents.map((event) => (
        <SunRow key={event.label} minutes={event.minutes} label={event.label} Icon={event.Icon} />
      ))}

      {previous && stop.travelMinutesFromPrevious > 0 ? (
        <p className={cx(RAIL, "flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-small text-ink-soft")}>
          <span className="inline-flex items-center gap-1.5 tabular-nums">
            <Route aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
            {fill(t.leg, { duration: formatDuration(stop.travelMinutesFromPrevious, dict) })}
          </span>
          {stop.waitMinutes > 0 ? (
            <span className={cx("inline-flex items-center gap-1.5", longGap && "font-medium text-ink")}>
              {longGap ? <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-cmj-sunset" /> : null}
              {longGap
                ? fill(g.longGap, { minutes: stop.waitMinutes })
                : fill(t.wait, { duration: formatDuration(stop.waitMinutes, dict) })}
            </span>
          ) : null}
        </p>
      ) : previous ? (
        <span aria-hidden className={cx(RAIL, "block h-3")} />
      ) : null}

      {/* A day loaded from an old saved trip, or reordered after its times
          were set, can still hold a stop you can't reach in time. It gets
          its own line with the fix, as in the old timeline. */}
      {stop.conflict && previous && earliest !== null ? (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-md bg-[color-mix(in_oklab,var(--cmj-sunset)_24%,var(--cmj-panel))] px-4 py-2 text-small text-ink">
          <span className="inline-flex items-center gap-2">
            <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />
            {fill(g.shortfallRow, { minutes: earliest - stop.arrivalMinutes })}
          </span>
          <Button variant="secondary" size="sm" onClick={() => onCommitTime(earliest)}>
            {g.fixOverlap}
          </Button>
        </div>
      ) : null}

      <div
        ref={cardRef}
        className={cx(
          "grid grid-cols-[44px_56px_minmax(0,1fr)_44px] items-center gap-2.5 rounded-lg border border-line bg-panel p-2.5 shadow-float",
          "sm:grid-cols-[44px_56px_64px_minmax(0,1fr)_44px] sm:gap-3 sm:p-3",
          "transition-[box-shadow,border-color] duration-200",
          (hovered || focused) && !isDragging && "border-brand shadow-[0_0_0_2px_var(--cmj-brand)]",
          stop.isGoldenHour && !hovered && !focused && "border-cmj-sunset",
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label={fill(t.dragHandle, { place: name })}
          className={cx(
            "grid h-11 w-11 cursor-grab touch-none place-items-center rounded-md text-ink-soft hover:bg-well active:cursor-grabbing",
            focusRing,
          )}
        >
          <GripVertical aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </button>

        <p className="grid leading-[1.3] tabular-nums">
          <span className={cx("inline-flex items-center gap-1 text-label font-semibold", stop.conflict ? "text-ink" : "text-brand")}>
            {minutesToClock(stop.arrivalMinutes)}
            {stop.userLocked ? (
              <Lock aria-label={t.locked} strokeWidth={2} className="size-3.5" />
            ) : null}
          </span>
          <span className="text-credit whitespace-nowrap text-ink-soft">{fill(t.until, { time: minutesToClock(stop.departureMinutes) })}</span>
        </p>

        <div className="relative hidden size-16 overflow-hidden rounded-md sm:block">
          <PlacePhoto
            slug={place.slug}
            alt=""
            sizes="64px"
            fallback={
              <NoPhoto icon={Icon} label={dict.common.categories[place.category]} size="sm" className="p-0" />
            }
          />
        </div>

        <div className="grid min-w-0 gap-1">
          <p className="flex min-w-0 items-start gap-2">
            <span
              aria-hidden
              className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-brand text-credit font-semibold text-on-brand tabular-nums"
            >
              {index + 1}
            </span>
            <Link
              href={`/${locale}/place/${place.slug}`}
              className={cx("min-w-0 text-label leading-[1.4] text-ink hover:underline hover:underline-offset-2", focusRing)}
            >
              <span className="sr-only">{index + 1}. </span>
              <ThaiName text={name} />
            </Link>
          </p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-small text-ink-soft">
            <span className="inline-flex items-center gap-1">
              <Clock aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
              {fill(dict.ui.stay, { duration: formatDuration(stop.departureMinutes - stop.arrivalMinutes, dict) })}
            </span>
            <span className="min-w-0 text-pretty">{fill(t.open, { hours: place.openingHoursText[locale] })}</span>
          </p>
          {stop.isGoldenHour && stop.goldenHourType ? (
            <p className="inline-flex items-center gap-1.5 text-small font-medium text-brand">
              {stop.goldenHourType === "sunset" || stop.goldenHourType === "blue_hour" ? (
                <Sunset aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-cmj-sunset" />
              ) : (
                <Sun aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-cmj-sunset" />
              )}
              {goldenLabel}
            </p>
          ) : null}
          {stop.outsideOpeningHours ? (
            <p className="inline-flex items-start gap-1.5 text-small font-medium text-ink">
              <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
              {place.openingHours?.opens
                ? fill(g.closedAtThisTime, { opens: place.openingHours.opens })
                : dict.planner.route.outsideHours}
            </p>
          ) : null}
        </div>

        <button
          type="button"
          data-stop-toggle
          aria-expanded={open}
          aria-controls={toolsId}
          aria-label={fill(t.stopOptions, { place: name })}
          title={fill(t.stopOptions, { place: name })}
          onClick={() => setOpen((value) => !value)}
          className={cx(
            "grid size-11 place-items-center rounded-full text-brand transition-colors duration-150 hover:bg-well aria-expanded:bg-well",
            focusRing,
          )}
        >
          <Ellipsis aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </button>
      </div>

      {open ? (
        <StopTools
          id={toolsId}
          dayId={dayId}
          dayNumber={dayNumber}
          index={index}
          stop={stop}
          previous={previous}
          heldBack={heldBack}
          days={days}
          onCommitTime={onCommitTime}
          onResetTime={onResetTime}
        />
      ) : heldBack !== null && previous ? (
        <HeldBackNote earliest={heldBack} previous={previous} stop={stop} />
      ) : null}
    </li>
  );
}

function HeldBackNote({ earliest, previous, stop }: { earliest: number; previous: TimelineStop; stop: TimelineStop }) {
  const { locale, dict } = useLocale();
  const g = dict.planner.goldenHour;
  return (
    <p className="mt-2 rounded-md bg-well px-4 py-2.5 text-small text-pretty text-ink-soft" aria-live="polite">
      <span className="font-medium text-ink">{fill(g.earliestFeasible, { time: minutesToClock(earliest) })}</span>{" "}
      {fill(g.earliestFeasibleWhy, {
        place: previous.place.name[locale],
        time: minutesToClock(previous.departureMinutes),
        minutes: stop.travelMinutesFromPrevious,
      })}
    </p>
  );
}

function StopTools({
  id,
  dayId,
  dayNumber,
  index,
  stop,
  previous,
  heldBack,
  days,
  onCommitTime,
  onResetTime,
}: {
  id: string;
  dayId: string;
  dayNumber: number;
  index: number;
  stop: TimelineStop;
  previous: TimelineStop | null;
  heldBack: number | null;
  days: DayChoice[];
  onCommitTime: (minutes: number) => void;
  onResetTime: () => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.plan;
  const g = dict.planner.goldenHour;
  const toast = dict.planner.toast;
  const { showToast } = useToast();
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const containers = useTripStore((s) => s.containers);
  const slug = stop.place.slug;
  const name = stop.place.name[locale];
  const reviewsUrl = googleMapsReviewsUrl(stop.place);
  const moveId = useId();

  // The row these tools sit in leaves the list, taking the focused control
  // with it. Hand focus to the stop that took its place (or the one before),
  // or to the list itself once it is empty, so a keyboard user is not dropped
  // back at the top of the page.
  function keepFocusInList() {
    const list = document.getElementById(id)?.closest("ol");
    if (!list) return;
    // After React has committed the list without this row.
    setTimeout(() => {
      const toggles = list.querySelectorAll<HTMLElement>("[data-stop-toggle]");
      (toggles[Math.min(index, toggles.length - 1)] ?? list).focus();
    });
  }

  function moveTo(target: string) {
    if (!target) return;
    if (!moveFromTo(slug, dayId, target, containers[target]?.length ?? 0)) return;
    keepFocusInList();
    const targetDay = days.find((d) => d.id === target);
    showToast({
      message: targetDay ? fill(toast.moved, { day: targetDay.dayNumber }) : fill(t.movedToTray, { place: name }),
      actions: [{ label: toast.undo, onClick: () => moveFromTo(slug, target, dayId, index) }],
    });
  }

  function remove() {
    keepFocusInList();
    removeFromPlan(slug, dayId);
    showToast({
      message: fill(toast.removedFromDay, { day: dayNumber }),
      actions: [{ label: toast.undo, onClick: () => restoreToContainer(slug, dayId, index) }],
    });
  }

  return (
    <div id={id} className="mt-2 grid gap-4 rounded-lg bg-well p-4">
      <div className="grid gap-2">
        <p className="text-small text-ink-soft">
          {t.timeLabel}{" "}
          <span className="font-semibold text-ink tabular-nums">{minutesToClock(stop.arrivalMinutes)}</span>
        </p>
        <div role="group" aria-label={fill(g.adjustTime, { place: name })} className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onCommitTime(stop.arrivalMinutes - STEP_MINUTES)}>
            {g.stepEarlier}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onCommitTime(stop.arrivalMinutes + STEP_MINUTES)}>
            {g.stepLater}
          </Button>
          {stop.userLocked ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onResetTime}
              icon={<RotateCcw aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
            >
              {g.reset}
            </Button>
          ) : null}
        </div>
        {heldBack !== null && previous ? <HeldBackNote earliest={heldBack} previous={previous} stop={stop} /> : null}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={moveId} className="text-small text-ink-soft">
          {t.moveTo}
        </label>
        <Select
          id={moveId}
          value=""
          onChange={(event) => moveTo(event.target.value)}
          wrapperClassName="min-w-[10rem]"
          className="bg-panel"
        >
          <option value="" disabled>
            {fill(t.moveToDay, { day: dayNumber })}
          </option>
          {days
            .filter((d) => d.id !== dayId && !containers[d.id]?.includes(slug))
            .map((d) => (
              <option key={d.id} value={d.id}>
                {fill(t.moveToDay, { day: d.dayNumber })}
              </option>
            ))}
          {containers[UNSCHEDULED]?.includes(slug) ? null : <option value={UNSCHEDULED}>{dict.planner.unscheduled}</option>}
        </Select>
      </div>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/${locale}/place/${slug}`} variant="ghost" size="sm" className="px-3">
          {t.viewPlace}
        </ButtonLink>
        {reviewsUrl ? (
          <a
            href={reviewsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(buttonStyles({ variant: "ghost", size: "sm" }), "px-3")}
          >
            {t.reviews}
            <ExternalLink aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
          </a>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={remove}
          icon={<Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
        >
          {dict.planner.remove}
        </Button>
      </div>
    </div>
  );
}
