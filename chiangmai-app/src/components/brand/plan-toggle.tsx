"use client";

import { Check, Plus } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import { UNSCHEDULED, useTripStore, useTripStoreHydrated } from "@/lib/trip-store";
import { buttonStyles } from "./button";
import { cx, focusRing } from "./cx";
import { ICON_STROKE } from "./icons";
import { iconButtonStyles } from "./icon-button";
import { fill } from "./place-text";

export type PlannerDay = { id: string; number: number };

/**
 * Adds a place to the plan or takes it out again.
 *
 * Two modes. Normally it is a plain toggle on the whole plan. Opened from the
 * planner's "add places to Day N" (explore?from=planner&day=N) it works on that
 * one day: add, take out, or — when the place already sits on another day —
 * offer to duplicate it here or move it here. That logic is the old card's,
 * kept as it was; only the button is new.
 *
 * `variant="icon"` is the round button in a card's corner; `"button"` is the
 * full pill on a place page.
 */
export function PlanToggle({
  slug,
  placeName,
  plannerDay,
  variant = "icon",
  className,
}: {
  slug: string;
  placeName: string;
  plannerDay?: PlannerDay | null;
  variant?: "icon" | "button";
  className?: string;
}) {
  const { dict } = useLocale();
  const { showToast } = useToast();
  // Before the store has read localStorage every place looks unplanned, so the
  // pressed state waits for it rather than flipping on after first paint.
  const hydrated = useTripStoreHydrated();
  const planned = useTripStore((s) => s.isPlanned(slug)) && hydrated;
  const storedLocation = useTripStore((s) => s.locationOf(slug));
  const location = hydrated ? storedLocation : null;
  const dayIds = useTripStore((s) => s.dayIds);
  const addPlace = useTripStore((s) => s.addPlace);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const moveToDay = useTripStore((s) => s.moveToDay);
  const duplicateToDay = useTripStore((s) => s.duplicateToDay);

  const t = dict.browse;
  const pt = dict.planner.toast;
  const pp = dict.planner.picker;

  if (plannerDay) {
    const { id, number } = plannerDay;
    const inThisDay = location === id;
    const label = fill(inThisDay ? t.inDay : t.addToDay, { day: number });

    const onClick = () => {
      if (inThisDay) {
        removeFromPlan(slug, id);
        showToast({
          message: fill(pt.removedFromDay, { day: number }),
          actions: [{ label: pt.undo, onClick: () => moveToDay(slug, id) }],
        });
        return;
      }
      if (location && location !== UNSCHEDULED) {
        showToast({
          message: fill(pp.duplicateWarning, { day: dayIds.indexOf(location) + 1 }),
          durationMs: 8000,
          actions: [
            {
              label: pp.addDuplicate,
              onClick: () => {
                duplicateToDay(slug, id);
                showToast({ message: fill(pt.duplicated, { day: number }) });
              },
            },
            {
              label: pp.moveHere,
              onClick: () => {
                moveToDay(slug, id);
                showToast({ message: fill(pt.moved, { day: number }) });
              },
            },
          ],
        });
        return;
      }
      moveToDay(slug, id);
      showToast({
        message: fill(pt.addedToDay, { day: number }),
        actions: [{ label: pt.undo, onClick: () => removeFromPlan(slug, id) }],
      });
    };

    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={inThisDay}
        className={cx(
          "inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-full px-4 font-brand text-label whitespace-nowrap",
          "transition-[background-color,color] duration-150 ease-brand",
          "bg-well text-brand hover:bg-[color-mix(in_oklab,var(--cmj-well)_88%,var(--cmj-brand))]",
          "aria-pressed:bg-brand aria-pressed:text-on-brand",
          focusRing,
          className,
        )}
      >
        {inThisDay ? (
          <Check aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        ) : (
          <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        )}
        {label}
      </button>
    );
  }

  const toggle = () => (planned ? removeFromPlan(slug) : addPlace(slug));

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        aria-pressed={planned}
        className={cx(buttonStyles({ variant: planned ? "secondary" : "primary" }), className)}
      >
        {planned ? (
          <Check aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        ) : (
          <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        )}
        {planned ? dict.placePage.inPlan : dict.common.addToPlan}
      </button>
    );
  }

  const label = fill(planned ? t.removeFromPlan : t.addToPlan, { place: placeName });
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={planned}
      aria-label={label}
      title={label}
      // Unplanned: the board's green round button with a plus. Planned: a pale
      // leaf ground, a check and a green ring, so the two states differ in
      // shape and ground, not only in the icon.
      className={cx(
        iconButtonStyles({ tone: "brand" }),
        "aria-pressed:bg-leaf-fill aria-pressed:text-brand aria-pressed:shadow-[inset_0_0_0_1.5px_var(--cmj-brand)]",
        className,
      )}
    >
      {planned ? (
        <Check aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      ) : (
        <Plus aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      )}
    </button>
  );
}
