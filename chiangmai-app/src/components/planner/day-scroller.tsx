"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { GradualBlur } from "@/components/ui/gradual-blur";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

/**
 * The horizontal rail of day cards, with something on screen to say it
 * scrolls.
 *
 * Before this, the rail held 1,060px of cards in a 701px frame and gave no
 * hint at all that the extra 359px existed — days two and three were simply
 * invisible on a laptop. The faded edge, the arrows and the counter are three
 * different answers to the same question, because a traveller skimming the
 * page will only notice one of them.
 */
export function DayScroller({
  children,
  dayCount,
  className,
  id,
}: {
  children: ReactNode;
  dayCount: number;
  className?: string;
  id?: string;
}) {
  const { dict } = useLocale();
  const reduced = useReducedMotion();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });
  const [activeIndex, setActiveIndex] = useState(0);
  const t = dict.planner.scroller;

  const measure = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setEdges({
      atStart: el.scrollLeft <= 1,
      // 1px of slack: sub-pixel layout means scrollLeft rarely lands exactly on maxScroll.
      atEnd: el.scrollLeft >= maxScroll - 1,
    });
    const card = el.querySelector<HTMLElement>("[data-day-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth;
    setActiveIndex(Math.min(dayCount - 1, Math.round(el.scrollLeft / step)));
  }, [dayCount]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-day-card]");
    const step = card ? card.offsetWidth + 20 : el.clientWidth * 0.8;
    el.scrollBy({ left: direction * step, behavior: reduced ? "auto" : "smooth" });
  }

  const scrollable = !edges.atStart || !edges.atEnd;

  return (
    <div id={id} className={cn("relative", className)}>
      <div
        ref={scrollerRef}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4"
      >
        {children}
      </div>

      <GradualBlur edge="left" size="4rem" visible={!edges.atStart} className="bottom-4 rounded-l-lg" />
      <GradualBlur edge="right" size="4rem" visible={!edges.atEnd} className="bottom-4 rounded-r-lg" />

      {scrollable ? (
        <div className="no-print mt-1 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => scrollByCard(-1)}
            disabled={edges.atStart}
            aria-label={t.previous}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent-text disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
            {t.position
              .replace("{current}", String(activeIndex + 1))
              .replace("{total}", String(dayCount))}
          </p>
          <button
            type="button"
            onClick={() => scrollByCard(1)}
            disabled={edges.atEnd}
            aria-label={t.next}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-accent hover:text-accent-text disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </div>
  );
}
