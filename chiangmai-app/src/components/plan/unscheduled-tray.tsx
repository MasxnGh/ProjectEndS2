"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowRight, GripVertical, X } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, UNSCHEDULED } from "@/lib/trip-store";
import { useToast } from "@/components/toast/toast-provider";
import { Button } from "@/components/brand/button";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx, focusRing } from "@/components/brand/cx";
import { fill, placeWhere } from "@/components/brand/place-text";
import { itemId } from "./stop-list";
import { moveFromTo, restoreToContainer } from "./restore";
import { ThaiName } from "@/components/brand/thai-name";

/**
 * Places added from Explore or a place page that are not on a day yet. They
 * can be dragged onto the day below or a day's tab, or put on the day being
 * looked at with one press.
 */
export function UnscheduledTray({
  places,
  targetDayId,
  targetDayNumber,
}: {
  places: Place[];
  targetDayId: string;
  targetDayNumber: number;
}) {
  const { dict } = useLocale();
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED });

  return (
    <section
      aria-labelledby="planner-tray-title"
      className={cx(
        "grid gap-3 rounded-lg bg-sand-fill px-5 py-4 transition-shadow duration-150",
        isOver && "shadow-[0_0_0_3px_var(--cmj-brand)]",
      )}
    >
      <h3 id="planner-tray-title" className="flex items-center justify-between gap-3 text-label text-brand">
        {dict.planner.unscheduled}
        <span className="grid min-h-[30px] min-w-[30px] place-items-center rounded-full bg-panel px-2 text-small font-semibold tabular-nums">
          {places.length}
        </span>
      </h3>
      <p className="text-small text-pretty text-ink-soft">{dict.plan.tray.body}</p>
      <ul ref={setNodeRef} className="grid min-h-2 gap-2">
        <SortableContext items={places.map((p) => itemId(UNSCHEDULED, p.slug))} strategy={verticalListSortingStrategy}>
          {places.map((place, index) => (
            <TrayItem
              key={place.slug}
              place={place}
              index={index}
              targetDayId={targetDayId}
              targetDayNumber={targetDayNumber}
            />
          ))}
        </SortableContext>
      </ul>
    </section>
  );
}

function TrayItem({
  place,
  index,
  targetDayId,
  targetDayNumber,
}: {
  place: Place;
  index: number;
  targetDayId: string;
  targetDayNumber: number;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.toast;
  const { showToast } = useToast();
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const containers = useTripStore((s) => s.containers);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: itemId(UNSCHEDULED, place.slug),
  });
  const name = place.name[locale];

  function putOnDay() {
    if (!moveFromTo(place.slug, UNSCHEDULED, targetDayId, containers[targetDayId]?.length ?? 0)) return;
    showToast({
      message: fill(t.addedToDay, { day: targetDayNumber }),
      actions: [{ label: t.undo, onClick: () => moveFromTo(place.slug, targetDayId, UNSCHEDULED, index) }],
    });
  }

  function remove() {
    removeFromPlan(place.slug, UNSCHEDULED);
    showToast({
      message: t.removed,
      actions: [{ label: t.undo, onClick: () => restoreToContainer(place.slug, UNSCHEDULED, index) }],
    });
  }

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cx(
        "grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg bg-panel p-2 shadow-float",
        isDragging && "z-10 opacity-60",
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label={fill(dict.plan.dragHandle, { place: name })}
        className={cx("grid size-11 cursor-grab touch-none place-items-center rounded-md text-ink-soft hover:bg-well", focusRing)}
      >
        <GripVertical aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </button>
      <p className="grid min-w-0">
        <span className="text-label leading-[1.4]">
          <ThaiName text={name} />
        </span>
        <span className="truncate text-small text-ink-soft">{placeWhere(place, dict)}</span>
      </p>
      <span className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={putOnDay}
          className="px-3"
          aria-label={`${fill(dict.plan.tray.addTo, { day: targetDayNumber })} · ${name}`}
        >
          <span className="hidden sm:inline">{fill(dict.plan.tray.addTo, { day: targetDayNumber })}</span>
          <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        </Button>
        <IconButton label={`${dict.planner.remove} · ${name}`} tone="plain" onClick={remove}>
          <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </IconButton>
      </span>
    </li>
  );
}
