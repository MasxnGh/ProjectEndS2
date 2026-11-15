"use client";

import { Share2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { fill, formatDuration } from "@/components/brand/place-text";
import { SaveButton, useSharePlan, type SaveState } from "./finish-section";
import { stopsLabel } from "./plan-text";

/**
 * The phone's bottom bar: the open day in one line, share, and save — so the
 * two things a finished plan needs are never a long scroll away. Hidden from
 * lg up, where the finish section sits in view beside the map.
 */
export function PlanDock({
  dayNumber,
  stopCount,
  totalMinutes,
  saveState,
  onSave,
  onShared,
}: {
  dayNumber: number;
  stopCount: number;
  totalMinutes: number;
  saveState: SaveState;
  onSave: () => void;
  onShared: () => void;
}) {
  const { dict } = useLocale();
  const share = useSharePlan(onShared);
  return (
    <div
      data-brand
      className="sticky bottom-0 z-30 flex items-center gap-3 border-t border-line bg-panel px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] font-brand shadow-[0_-8px_24px_-16px_rgb(29_56_53/0.3)] lg:hidden print:hidden"
    >
      <p className="grid min-w-0 flex-1 text-small leading-[1.4] text-ink-soft">
        <span className="truncate text-label font-semibold text-ink tabular-nums">
          {fill(dict.plan.dock, { day: dayNumber, stops: stopsLabel(stopCount, dict) })}
        </span>
        {stopCount > 0 ? (
          // Two short lines at most, so the bar stays low; the full figures are in the day head.
          <span className="truncate tabular-nums">
            {dict.plan.stats.whole} {formatDuration(totalMinutes, dict)}
          </span>
        ) : null}
      </p>
      <IconButton label={dict.plan.finish.share} onClick={share}>
        <Share2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </IconButton>
      <SaveButton state={saveState} onSave={onSave} className="flex-none px-4" />
    </div>
  );
}
