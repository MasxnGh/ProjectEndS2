"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";

/**
 * The home page's row of place types: it scrolls sideways and snaps to each
 * tile. On a phone you swipe; from a tablet up a round button nudges it along,
 * and goes quiet at the end so it never promises more than there is.
 *
 * The tiles are server-rendered and passed in as <li> children.
 */
export function CategoryRail({ nextLabel, children }: { nextLabel: string; children: ReactNode }) {
  const listRef = useRef<HTMLUListElement>(null);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    // Eight tiles always overflow the row at every width, so it starts not at
    // the end; only scrolling and resizing can change that.
    const update = () => setAtEnd(list.scrollLeft + list.clientWidth >= list.scrollWidth - 4);
    list.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      list.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  function next() {
    const list = listRef.current;
    if (!list) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollBy({ left: list.clientWidth * 0.6, behavior: reduce ? "auto" : "smooth" });
  }

  return (
    <div className="relative">
      <ul
        ref={listRef}
        className="cmj-scroll-row grid snap-x snap-mandatory auto-cols-[44%] grid-flow-col gap-4 overflow-x-auto pb-1 sm:auto-cols-[30%] lg:auto-cols-[calc((100%-4rem)/5.3)]"
      >
        {children}
      </ul>
      <IconButton
        label={nextLabel}
        onClick={next}
        disabled={atEnd}
        className="absolute top-1/2 -right-2.5 hidden -translate-y-1/2 bg-panel shadow-lift hover:bg-panel disabled:opacity-0 sm:inline-grid"
      >
        <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
      </IconButton>
    </div>
  );
}
