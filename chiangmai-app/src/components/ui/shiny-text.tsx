"use client";

import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A slow highlight that travels across text — adapted from React Bits'
 * Shiny Text (https://reactbits.dev/text-animations/shiny-text).
 *
 * Toned well down from the original: the sweep is the page's own accent gold
 * over the inherited text colour rather than a bright white gradient, and it
 * runs on a long cycle. On a site that reads like a printed guide a fast
 * chrome shimmer would look like an advert.
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
    <span
      className={cn("shiny-text bg-clip-text", className)}
      style={{ ["--shiny-duration" as string]: `${durationSeconds}s` }}
    >
      {children}
    </span>
  );
}
