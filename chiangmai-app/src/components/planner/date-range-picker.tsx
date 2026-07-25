"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { addDaysIso, daysBetweenIso } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

function firstWeekdayOfMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 1)).getUTCDay();
}

function getWeekdayLabels(locale: string): string[] {
  const fmt = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { weekday: "short", timeZone: "UTC" });
  // 1970-01-04 (UTC) is a Sunday — a stable anchor to enumerate Sun..Sat.
  return Array.from({ length: 7 }, (_, i) => fmt.format(new Date(Date.UTC(1970, 0, 4 + i))));
}

function formatDisplayDate(iso: string, locale: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

export interface DateRangePickerProps {
  /** ISO "YYYY-MM-DD", or null when no date has been chosen yet. */
  startDate: string | null;
  /** Current trip length — the picker shows/edits [startDate, startDate + dayCount - 1]. */
  dayCount: number;
  onRangeChange: (startIso: string, dayCount: number) => void;
  className?: string;
}

/**
 * A site-styled date range picker (not the native browser one) that sets
 * both the trip's start date and its length in one action — picking Mar 10
 * to Mar 13 sets startDate=2026-03-10 and a 4-day trip, adjusting the
 * number of day columns to match.
 */
export function DateRangePicker({ startDate, dayCount, onRangeChange, className }: DateRangePickerProps) {
  const { locale, dict } = useLocale();
  const t = dict.planner.dateRangePicker;
  const [open, setOpen] = useState(false);
  const [pendingStart, setPendingStart] = useState<string | null>(startDate);
  const [pendingEnd, setPendingEnd] = useState<string | null>(
    startDate ? addDaysIso(startDate, dayCount - 1) : null
  );
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [viewYear, setViewYear] = useState(() => Number((startDate ?? today).slice(0, 4)));
  const [viewMonth, setViewMonth] = useState(() => Number((startDate ?? today).slice(5, 7)) - 1);
  const rootRef = useRef<HTMLDivElement>(null);

  const endDate = startDate ? addDaysIso(startDate, dayCount - 1) : null;
  const weekdayLabels = useMemo(() => getWeekdayLabels(locale), [locale]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function openPicker() {
    setPendingStart(startDate);
    setPendingEnd(endDate);
    setViewYear(Number((startDate ?? today).slice(0, 4)));
    setViewMonth(Number((startDate ?? today).slice(5, 7)) - 1);
    setOpen(true);
  }

  function handleDayClick(iso: string) {
    if (!pendingStart || pendingEnd) {
      setPendingStart(iso);
      setPendingEnd(null);
    } else if (iso < pendingStart) {
      setPendingStart(iso);
      setPendingEnd(null);
    } else {
      setPendingEnd(iso);
    }
  }

  function handleConfirm() {
    if (!pendingStart) return;
    const end = pendingEnd ?? pendingStart;
    onRangeChange(pendingStart, daysBetweenIso(pendingStart, end) + 1);
    setOpen(false);
  }

  function shiftMonth(delta: number) {
    const next = new Date(Date.UTC(viewYear, viewMonth + delta, 1));
    setViewYear(next.getUTCFullYear());
    setViewMonth(next.getUTCMonth());
  }

  const weeks = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const lead = firstWeekdayOfMonth(viewYear, viewMonth);
    const cells: (string | null)[] = [
      ...Array.from({ length: lead }, () => null),
      ...Array.from({ length: total }, (_, i) => isoOf(viewYear, viewMonth, i + 1)),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [viewYear, viewMonth]);

  function isInPendingRange(iso: string): boolean {
    if (!pendingStart) return false;
    const end = pendingEnd ?? pendingStart;
    const lo = pendingStart < end ? pendingStart : end;
    const hi = pendingStart < end ? end : pendingStart;
    return iso >= lo && iso <= hi;
  }

  const monthLabel = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(viewYear, viewMonth, 1)));

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={openPicker}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-left text-sm outline-none focus-visible:border-accent"
      >
        <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
        {startDate && endDate ? (
          <span>
            {formatDisplayDate(startDate, locale)} – {formatDisplayDate(endDate, locale)} · {dayCount}{" "}
            {t.days}
          </span>
        ) : (
          <span className="text-muted-foreground">{t.placeholder}</span>
        )}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label={t.dialogLabel}
          className="absolute left-0 top-full z-30 mt-2 w-[19rem] rounded-lg border border-border bg-background p-4 shadow-elevated"
        >
          <p className="text-xs text-muted-foreground">{t.instructions}</p>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label={t.previousMonth}
              className="rounded-full p-1.5 hover:bg-surface-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="font-serif-display text-sm">{monthLabel}</p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label={t.nextMonth}
              className="rounded-full p-1.5 hover:bg-surface-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {weekdayLabels.map((label, i) => (
              <div key={`${label}-${i}`}>{label}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {weeks.flat().map((iso, i) =>
              iso ? (
                <button
                  key={iso}
                  type="button"
                  onClick={() => handleDayClick(iso)}
                  disabled={iso < today}
                  aria-pressed={iso === pendingStart || iso === pendingEnd}
                  className={cn(
                    "aspect-square rounded-full text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
                    iso < today && "cursor-not-allowed text-muted-foreground/30",
                    iso >= today && !isInPendingRange(iso) && "hover:bg-surface-muted",
                    isInPendingRange(iso) && iso !== pendingStart && iso !== pendingEnd && "bg-accent/15",
                    (iso === pendingStart || iso === pendingEnd) && "bg-accent font-medium text-accent-foreground"
                  )}
                >
                  {Number(iso.slice(8, 10))}
                </button>
              ) : (
                <div key={`empty-${i}`} />
              )
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-text"
            >
              {t.cancel}
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!pendingStart}
              className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
            >
              {t.confirm}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
