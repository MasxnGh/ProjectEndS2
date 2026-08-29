"use client";

import { InfoHint } from "@/components/ui/info-hint";
import { useEffect, useRef, useState } from "react";
import { CalendarDays, Clock, MapPin, Wallet } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useCountUp } from "@/lib/weather/use-count-up";
import { formatMinutes } from "@/lib/trip-calculations";
import { cn } from "@/lib/utils";

export interface TripSummaryStats {
  days: number;
  places: number;
  minutes: number;
  /** System estimate (entry + transport + food + assumed meals + stay) — not the budget the traveller typed in. */
  estimatedCostThb: number;
}

/**
 * The four running totals, pinned under the nav so they stay in view while
 * the traveller works further down the page.
 *
 * Every number animates through `useCountUp` — the same hook the weather
 * widgets use. That is not decoration: switching travel mode in Summary →
 * Transport can move the estimated cost by hundreds of baht, and until now it
 * changed silently in a stat the traveller had already scrolled past.
 */
export function TripSummaryBar({ stats }: { stats: TripSummaryStats }) {
  const { dict } = useLocale();
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [condensed, setCondensed] = useState(false);

  const days = useCountUp(stats.days);
  const places = useCountUp(stats.places);
  const minutes = useCountUp(stats.minutes);
  const cost = useCountUp(stats.estimatedCostThb);

  // A zero-height sentinel above the bar tells us when the bar has actually
  // stuck, which is not something `position: sticky` reports on its own.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCondensed(!entry.isIntersecting),
      { rootMargin: "-80px 0px 0px 0px", threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const items = [
    { key: "days", Icon: CalendarDays, label: dict.planner.totalDays, value: String(days) },
    { key: "places", Icon: MapPin, label: dict.planner.totalPlaces, value: String(places) },
    { key: "time", Icon: Clock, label: dict.planner.totalTime, value: formatMinutes(minutes) },
    {
      key: "cost",
      Icon: Wallet,
      label: dict.planner.estimatedCost,
      value: `~฿${cost.toLocaleString("en-US")}`,
    },
  ];

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <div
        className={cn(
          "no-print sticky top-20 z-20 rounded-lg border border-border bg-surface/95 backdrop-blur transition-shadow duration-300",
          condensed ? "shadow-elevated" : "shadow-none"
        )}
      >
        <dl
          className={cn(
            "grid grid-cols-2 gap-x-4 transition-all duration-300 sm:grid-cols-4",
            condensed ? "gap-y-1 p-3" : "gap-y-3 p-4 sm:p-5"
          )}
        >
          {items.map(({ key, Icon, label, value }) => (
            <div
              key={key}
              className={cn(
                "flex min-w-0 items-center gap-2.5",
                // Condensed drops to a single inline row; expanded stacks the
                // label over a display-face number.
                condensed ? "" : "sm:items-start"
              )}
            >
              <Icon
                className={cn("shrink-0 text-accent-text", condensed ? "h-4 w-4" : "h-4 w-4 sm:mt-1")}
                aria-hidden="true"
              />
              <div className={cn("min-w-0", condensed ? "flex items-baseline gap-2" : "")}>
                <dt className="flex items-center gap-1 truncate text-xs uppercase tracking-wide text-muted-foreground">
                  {label}
                  {key === "cost" ? (
                    <InfoHint
                      align="end"
                      label={dict.common.hints.estimatedCost.label}
                      text={dict.common.hints.estimatedCost.text}
                    />
                  ) : null}
                </dt>
                <dd
                  className={cn(
                    "truncate font-serif-display tabular-nums",
                    condensed ? "text-base" : "mt-0.5 text-xl"
                  )}
                >
                  {value}
                </dd>
              </div>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
