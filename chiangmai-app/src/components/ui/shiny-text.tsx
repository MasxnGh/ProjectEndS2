"use client";

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A slow highlight that travels across text — adapted from React Bits'
 * Shiny Text (https://reactbits.dev/text-animations/shiny-text).
 *
 * Toned well down from the original: the sweep is the page's own accent gold
 * and runs on a long cycle, because on a site that reads like a printed guide
 * a fast chrome shimmer would look like an advert.
 *
 * **The text is rendered twice on purpose.** The shimmer works by clipping a
 * gradient to the glyphs, which needs `color: transparent` — and the first
 * version of this leaned on `currentColor` inside that gradient, so
 * `currentColor` resolved to the transparent colour it had just been given
 * and the label vanished completely. The visible layer below is real,
 * ordinary text; the sweep is a decorative overlay on top of it. If the
 * overlay fails for any reason the words are still there, which is the only
 * acceptable outcome for a button label.
 */
export function ShinyText({
  children,
  className,
  durationSeconds = 6,
}: {
  children: React.ReactNode;
  className?: string;
  durationSeconds?: number;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <span className={className}>{children}</span>;

  return (
    <span className={cn("relative inline-block", className)}>
      {children}
      <span
        aria-hidden="true"
        // select-none keeps the duplicate out of a copied selection; the
        // overlay is decorative and aria-hidden, so it should not travel with
        // the text a reader actually copies.
        className="shiny-text-sweep pointer-events-none absolute inset-0 select-none"
        style={{ ["--shiny-duration" as string]: `${durationSeconds}s` }}
      >
        {children}
      </span>
    </span>
  );
}
