"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { addDaysIso, daysBetweenIso } from "@/lib/date-utils";
import { Button } from "@/components/brand/button";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { Popover, fieldChipStyles } from "@/components/brand/popover";
import { cx, focusRing } from "@/components/brand/cx";
import { dayCountLabel, todayIso, tripRange } from "./plan-text";

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * The trip's dates: pick the first day, then the last, and the trip grows or
 * shrinks to match. Same rules as the old picker — past dates are closed, and
 * a second press before the first starts the range again.
 */
export function DateRangeField({
  startDate,
  dayCount,
  onRangeChange,
}: {
  startDate: string | null;
  dayCount: number;
  onRangeChange: (startIso: string, dayCount: number) => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.dateRangePicker;
  const endDate = startDate ? addDaysIso(startDate, dayCount - 1) : null;

  return (
    <Popover
      label={t.dialogLabel}
      buttonClassName={fieldChipStyles}
      button={
        <>
          <CalendarDays aria-hidden strokeWidth={ICON_STROKE} className="size-[18px] text-brand" />
          {startDate && endDate ? (
            <span className="tabular-nums">
              {tripRange(startDate, endDate, locale)}{" "}
              <span className="font-normal text-ink-soft">· {dayCountLabel(dayCount, dict)}</span>
            </span>
          ) : (
            <span className="font-normal text-ink-soft">{dict.plan.datesNone}</span>
          )}
        </>
      }
    >
      {(close) => (
        <Calendar
          startDate={startDate}
          endDate={endDate}
          onCancel={close}
          onConfirm={(start, end) => {
            onRangeChange(start, daysBetweenIso(start, end) + 1);
            close();
          }}
        />
      )}
    </Popover>
  );
}

function Calendar({
  startDate,
  endDate,
  onCancel,
  onConfirm,
}: {
  startDate: string | null;
  endDate: string | null;
  onCancel: () => void;
  onConfirm: (start: string, end: string) => void;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.dateRangePicker;
  const today = useMemo(() => todayIso(), []);
  const [pendingStart, setPendingStart] = useState<string | null>(startDate);
  const [pendingEnd, setPendingEnd] = useState<string | null>(endDate);
  const [view, setView] = useState(() => {
    const anchor = startDate ?? today;
    return { year: Number(anchor.slice(0, 4)), month: Number(anchor.slice(5, 7)) - 1 };
  });

  const intl = locale === "th" ? "th-TH" : "en-GB";
  const weekdays = useMemo(() => {
    const format = new Intl.DateTimeFormat(intl, { weekday: "narrow", timeZone: "UTC" });
    // 1970-01-04 was a Sunday, a fixed anchor for Sun..Sat.
    return Array.from({ length: 7 }, (_, i) => format.format(new Date(Date.UTC(1970, 0, 4 + i))));
  }, [intl]);

  const cells = useMemo(() => {
    const total = new Date(Date.UTC(view.year, view.month + 1, 0)).getUTCDate();
    const lead = new Date(Date.UTC(view.year, view.month, 1)).getUTCDay();
    const list: (string | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => isoOf(view.year, view.month, i + 1)),
    ];
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [view]);

  const monthLabel = new Intl.DateTimeFormat(intl, { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(view.year, view.month, 1)),
  );
  const fullDate = new Intl.DateTimeFormat(intl, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

  function shift(delta: number) {
    const next = new Date(Date.UTC(view.year, view.month + delta, 1));
    setView({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
  }

  function pick(iso: string) {
    if (!pendingStart || pendingEnd || iso < pendingStart) {
      setPendingStart(iso);
      setPendingEnd(null);
    } else {
      setPendingEnd(iso);
    }
  }

  const rangeEnd = pendingEnd ?? pendingStart;
  const inRange = (iso: string) => Boolean(pendingStart && rangeEnd && iso >= pendingStart && iso <= rangeEnd);
  const isEdge = (iso: string) => iso === pendingStart || iso === pendingEnd;

  return (
    <div className="grid gap-3">
      <p className="text-small text-ink-soft">{t.instructions}</p>
      <div className="flex items-center justify-between gap-2">
        <IconButton label={t.previousMonth} tone="plain" size="sm" onClick={() => shift(-1)}>
          <ChevronLeft aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </IconButton>
        <p className="text-label text-brand" aria-live="polite">
          {monthLabel}
        </p>
        <IconButton label={t.nextMonth} tone="plain" size="sm" onClick={() => shift(1)}>
          <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </IconButton>
      </div>
      <div className="grid grid-cols-7 text-center text-credit text-ink-soft" aria-hidden>
        {weekdays.map((label, i) => (
          <span key={i}>{label}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((iso, i) =>
          iso ? (
            <button
              key={iso}
              type="button"
              onClick={() => pick(iso)}
              disabled={iso < today}
              aria-pressed={isEdge(iso)}
              aria-label={fullDate.format(new Date(`${iso}T00:00:00Z`))}
              className={cx(
                "mx-auto grid size-11 place-items-center rounded-full text-small tabular-nums transition-colors duration-150",
                focusRing,
                iso < today && "cursor-not-allowed text-ink-soft/40",
                iso >= today && !inRange(iso) && "hover:bg-well",
                inRange(iso) && !isEdge(iso) && "bg-leaf-fill text-brand",
                isEdge(iso) && "bg-brand font-semibold text-on-brand",
                iso === today && !isEdge(iso) && "underline decoration-2 underline-offset-4",
              )}
            >
              {Number(iso.slice(8, 10))}
            </button>
          ) : (
            <span key={`blank-${i}`} aria-hidden />
          ),
        )}
      </div>
      {pendingStart ? (
        <p className="text-small text-ink tabular-nums" aria-live="polite">
          {tripRange(pendingStart, rangeEnd ?? pendingStart, locale)} ·{" "}
          {dayCountLabel(daysBetweenIso(pendingStart, rangeEnd ?? pendingStart) + 1, dict)}
        </p>
      ) : null}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          {t.cancel}
        </Button>
        <Button
          size="sm"
          disabled={!pendingStart}
          onClick={() => pendingStart && onConfirm(pendingStart, rangeEnd ?? pendingStart)}
        >
          {t.confirm}
        </Button>
      </div>
    </div>
  );
}
