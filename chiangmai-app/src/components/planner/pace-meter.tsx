"use client";

import { useLocale } from "@/components/providers/locale-provider";
import type { DayPace } from "@/lib/planner/pace";
import { cn } from "@/lib/utils";

const BAND_FILL_CLASS: Record<DayPace["band"], string> = {
  easygoing: "bg-accent/50",
  comfortable: "bg-accent/70",
  full: "bg-accent",
  ambitious: "bg-accent-hover",
};

export function PaceMeter({
  pace,
  easeLabel,
  onEase,
}: {
  pace: DayPace;
  easeLabel?: string;
  onEase?: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.planner.pace;

  if (pace.dominantFactor === null) return null;

  return (
    <div className="space-y-1.5 border-t border-border pt-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground">{t.label}</span>
        <span className="font-medium text-foreground">{t.bands[pace.band]}</span>
      </div>
      <div
        role="meter"
        aria-label={t.label}
        aria-valuenow={pace.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuetext={t.bands[pace.band]}
        className="h-1.5 w-full overflow-hidden rounded-full bg-surface-muted"
      >
        <div
          className={cn("h-full rounded-full transition-[width]", BAND_FILL_CLASS[pace.band])}
          style={{ width: `${pace.score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{t.bandDescriptions[pace.band]}</p>
      {onEase && easeLabel ? (
        <button
          type="button"
          onClick={onEase}
          className="mt-1 text-left text-xs font-medium text-accent-text underline-offset-2 hover:underline"
        >
          {easeLabel}
        </button>
      ) : null}
    </div>
  );
}
