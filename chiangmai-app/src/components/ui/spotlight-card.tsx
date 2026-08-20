"use client";

import { useRef, type ReactNode } from "react";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * A card that lights up softly under the cursor — adapted from React Bits'
 * Spotlight Card (https://reactbits.dev/components/spotlight-card).
 *
 * Two deliberate departures from the original:
 *
 * 1. The glow is `--color-accent`, the site's own gold, rather than the
 *    original's purple. Everything else on this site is warm paper and gold.
 * 2. It tracks `mousemove` only, and never calls `setPointerCapture`. Day
 *    cards are dnd-kit drop targets, and capturing pointer events here would
 *    swallow the drag. Touch devices get no spotlight at all, which is right:
 *    there is no cursor to follow.
 */
export function SpotlightCard({
  children,
  className,
  /** 0–1. Kept low by default — this is a paper-and-ink site, not a neon one. */
  intensity = 0.1,
  radius = 420,
  ...rest
}: {
  children: ReactNode;
  className?: string;
  intensity?: number;
  radius?: number;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "children">) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  function handleMouseMove(event: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
    ref.current.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
    ref.current.style.setProperty("--spotlight-opacity", "1");
  }

  function handleMouseLeave() {
    ref.current?.style.setProperty("--spotlight-opacity", "0");
  }

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative isolate", className)}
      style={
        {
          "--spotlight-opacity": "0",
          "--spotlight-radius": `${radius}px`,
          "--spotlight-intensity": String(intensity),
        } as React.CSSProperties
      }
      {...rest}
    >
      {/* Purely decorative, and pointer-transparent so it never intercepts a
          drag, a click, or a hover on anything underneath it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-[var(--spotlight-opacity)] transition-opacity duration-500"
        style={{
          background:
            "radial-gradient(var(--spotlight-radius) circle at var(--spotlight-x) var(--spotlight-y), color-mix(in srgb, var(--color-accent) calc(var(--spotlight-intensity) * 100%), transparent), transparent 70%)",
        }}
      />
      {children}
    </div>
  );
}
