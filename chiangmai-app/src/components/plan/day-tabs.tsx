"use client";

import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx, focusRing } from "@/components/brand/cx";
import { fill } from "@/components/brand/place-text";
import { shortDayDate, stopsLabel } from "./plan-text";

export interface DayTabInfo {
  id: string;
  dayNumber: number;
  date: string | null;
  stopCount: number;
}

export const DAY_PANEL_ID = "planner-day-panel";
export const tabDropId = (dayId: string) => `tab:${dayId}`;

/**
 * One tab per day. A stop dragged onto a tab moves to the end of that day,
 * which is how a place changes day without scrolling between them.
 */
export function DayTabs({
  days,
  selectedId,
  highlightedId,
  onSelect,
  onAddDay,
}: {
  days: DayTabInfo[];
  selectedId: string;
  highlightedId: string | null;
  onSelect: (dayId: string) => void;
  onAddDay: () => void;
}) {
  const { dict } = useLocale();
  const listRef = useRef<HTMLDivElement>(null);

  function focusTab(index: number) {
    const day = days[(index + days.length) % days.length];
    onSelect(day.id);
    listRef.current?.querySelector<HTMLElement>(`[data-tab="${day.id}"]`)?.focus();
  }

  return (
    <div className="flex items-stretch gap-2">
      <div
        ref={listRef}
        role="tablist"
        aria-label={dict.plan.days.label}
        className="cmj-scroll-row -my-1 flex min-w-0 flex-1 gap-2 overflow-x-auto py-1"
        onKeyDown={(event) => {
          const index = days.findIndex((d) => d.id === selectedId);
          if (event.key === "ArrowRight") focusTab(index + 1);
          else if (event.key === "ArrowLeft") focusTab(index - 1);
          else if (event.key === "Home") focusTab(0);
          else if (event.key === "End") focusTab(days.length - 1);
          else return;
          event.preventDefault();
        }}
      >
        {days.map((day) => (
          <DayTab
            key={day.id}
            day={day}
            selected={day.id === selectedId}
            highlighted={day.id === highlightedId}
            onSelect={() => onSelect(day.id)}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={onAddDay}
        aria-label={dict.planner.addDay}
        title={dict.planner.addDay}
        className={cx(
          "grid min-h-14 min-w-14 flex-none place-items-center rounded-lg text-brand",
          "shadow-[inset_0_0_0_1.5px_var(--cmj-line-strong)] transition-colors duration-150 hover:bg-well",
          focusRing,
        )}
      >
        <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </button>
    </div>
  );
}

function DayTab({
  day,
  selected,
  highlighted,
  onSelect,
}: {
  day: DayTabInfo;
  selected: boolean;
  highlighted: boolean;
  onSelect: () => void;
}) {
  const { locale, dict } = useLocale();
  const { setNodeRef, isOver } = useDroppable({ id: tabDropId(day.id) });
  const detail = [
    day.date ? shortDayDate(day.date, locale) : null,
    day.stopCount > 0 ? stopsLabel(day.stopCount, dict) : dict.plan.days.empty,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      id={`tab-${day.id}`}
      data-tab={day.id}
      aria-selected={selected}
      aria-controls={DAY_PANEL_ID}
      tabIndex={selected ? 0 : -1}
      onClick={onSelect}
      className={cx(
        "grid min-h-14 flex-none content-center rounded-lg px-[18px] py-2 text-left transition-[background-color,box-shadow] duration-150 ease-brand",
        focusRing,
        selected ? "bg-brand text-on-brand" : "bg-well text-ink hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
        isOver && "shadow-[0_0_0_3px_var(--cmj-spark)]",
        highlighted && "shadow-[0_0_0_3px_var(--cmj-spark)]",
      )}
    >
      <span className="text-label font-semibold">{fill(dict.plan.days.tab, { day: day.dayNumber })}</span>
      <span className={cx("text-credit tabular-nums", selected ? "opacity-85" : "text-ink-soft")}>{detail}</span>
    </button>
  );
}
