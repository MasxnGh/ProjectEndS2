"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMotionTokens } from "@/lib/motion";
import { useLocale } from "@/components/providers/locale-provider";
import { useCountUp } from "@/lib/weather/use-count-up";
import { EXPLORE_SORTS, isSortAvailable, type ExploreSort } from "@/lib/explore/sort";
import { cn } from "@/lib/utils";

export interface ActiveFilterChip {
  id: string;
  label: string;
  onClear: () => void;
}

/**
 * The bar that answers "what am I looking at, and is there more of it".
 *
 * Explore grew to 193 places while still showing 24 at a time with the "load
 * more" button at the very bottom — sixteen screens down on a phone — and the
 * only sign that filters were on was a count badge on a collapsed panel. So
 * this pins the count, the sort, the filters that are actually applied, and
 * how far through the results you are, to the top of the list.
 */
export function ExploreResultsBar({
  total,
  shown,
  sort,
  onSortChange,
  hasReference,
  chips,
  viewToggle,
}: {
  total: number;
  shown: number;
  sort: ExploreSort;
  onSortChange: (sort: ExploreSort) => void;
  hasReference: boolean;
  chips: ActiveFilterChip[];
  viewToggle: ReactNode;
}) {
  const { dict } = useLocale();
  const t = dict.explore;
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  // Same sentinel trick the planner's summary bar uses — `position: sticky`
  // does not tell you when it has actually stuck.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      rootMargin: "-80px 0px 0px 0px",
      threshold: 0,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const m = useMotionTokens();
  const count = useCountUp(total);
  const isPartial = shown < total;

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      <div
        className={cn(
          "no-print sticky top-20 z-20 -mx-6 border-y border-border bg-background/95 px-6 py-3 backdrop-blur-md transition-shadow duration-300 lg:-mx-10 lg:px-10",
          stuck ? "shadow-card" : "shadow-none"
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <p aria-live="polite" className="text-sm">
              <span className="font-medium tabular-nums">{count}</span>{" "}
              <span className="text-muted-foreground">{t.filters.results}</span>
            </p>
            {/* Says there is more before you reach the bottom of the page, which
                is the whole problem with a load-more button sixteen screens down. */}
            {isPartial ? (
              <span className="text-xs tabular-nums text-muted-foreground">
                ·{" "}
                {t.progress
                  .replace("{shown}", String(shown))
                  .replace("{total}", String(total))}
              </span>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="hidden sm:inline">{t.sort.label}</span>
              <select
                value={sort}
                onChange={(e) => onSortChange(e.target.value as ExploreSort)}
                className="min-h-11 rounded-full border border-border bg-transparent px-3 text-xs text-foreground outline-none transition-colors focus:border-accent sm:min-h-0 sm:py-1.5"
              >
                {EXPLORE_SORTS.map((option) => (
                  <option
                    key={option}
                    value={option}
                    // "Nearest" needs somewhere to be near; offering it without
                    // a reference point would silently do nothing.
                    disabled={!isSortAvailable(option, hasReference ? { lat: 0, lng: 0 } : null)}
                  >
                    {t.sort[option]}
                  </option>
                ))}
              </select>
            </label>
            {viewToggle}
          </div>
        </div>

        {chips.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t.activeFilters}
            </span>
            <AnimatePresence initial={false} mode="popLayout">
              {chips.map((chip) => (
                <motion.button
                  key={chip.id}
                  type="button"
                  layout
                  initial={{ opacity: 0, scale: m.reduced ? 1 : 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: m.reduced ? 1 : 0.8 }}
                  transition={m.spring("press")}
                  onClick={chip.onClear}
                  aria-label={t.clearOne.replace("{filter}", chip.label)}
                  className="flex items-center gap-1 rounded-full border border-accent bg-accent/10 px-2.5 py-1 text-xs text-accent-text transition-colors hover:bg-accent/20"
                >
                  {chip.label}
                  <X className="h-3 w-3 shrink-0" aria-hidden="true" />
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
        ) : null}
      </div>
    </>
  );
}
