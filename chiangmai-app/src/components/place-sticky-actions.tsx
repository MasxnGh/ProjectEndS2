"use client";

import { useEffect, useRef, useState } from "react";
import { AddToPlanButton } from "@/components/add-to-plan-button";
import { FavoriteButton } from "@/components/favorite-button";
import { cn } from "@/lib/utils";

/**
 * Keeps "add this to my plan" reachable while reading.
 *
 * A place page runs about five screens — overview, story, awards, dishes,
 * practical details, weather, nearby — and the only way to act on it sat in
 * the sidebar near the top. Once you had scrolled past that to actually read
 * about the place, deciding you wanted it meant scrolling back.
 *
 * It appears only after those original buttons have left the screen, so the
 * two never compete, and it never shows on a page the reader has not started.
 */
export function PlaceStickyActions({
  slug,
  placeName,
}: {
  slug: string;
  placeName: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0),
      { threshold: 0 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px" />
      {/* Mounted only while on screen. Keeping it mounted and translated away
          would leave a second "Add to plan" for the same place sitting in the
          tab order and in the screen-reader tree, and neither button takes a
          tabIndex to opt out of that. */}
      {visible ? (
        <div
          className={cn(
            "no-print fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 px-4 py-3 backdrop-blur-md sm:px-6",
            "animate-fade-up"
          )}
        >
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{placeName}</p>
            <FavoriteButton
              slug={slug}
              placeName={placeName}
              size="large"
              className="h-10 w-10 shrink-0"
            />
            <AddToPlanButton slug={slug} className="shrink-0 justify-center" />
          </div>
        </div>
      ) : null}
    </>
  );
}
