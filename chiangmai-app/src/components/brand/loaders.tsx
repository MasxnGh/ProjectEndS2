import type { ReactNode } from "react";
import { AnimatedShinyText } from "@/components/magicui/animated-shiny-text";
import { cx } from "./cx";
import { MARK_SPARKLE, MARK_STROKES, MARK_VIEWBOX } from "./mark";

/*
 * How the site waits (DESIGN.md, "Motion" → "Loading"). Waiting is the light
 * passing over the valley, and the path being walked:
 *
 * - <Skeleton>: the shape of what is coming, with one soft band of evening
 *   light passing over every block on the screen at once.
 * - <MarkLoader>: the brand mark with a walker going over the ridge and
 *   back, and the sparkle breathing at the summit.
 * - <RouteDots>: three stops lighting one after another, for a button that
 *   is busy (instead of a spinning circle).
 * - <MapLoading>: a map's frame while MapLibre loads.
 *
 * All of it is CSS (app/motion.css), so none of it waits for scripts, and all
 * of it stands still under prefers-reduced-motion. These are decoration:
 * every place that uses them also says in words what it is waiting for.
 */

/** A placeholder block. Give it a size and a radius; `ground="map"` uses the map's paper colour. */
export function Skeleton({ className, ground = "well" }: { className?: string; ground?: "well" | "map" }) {
  return <div aria-hidden className={cx("cmj-skeleton", ground === "map" && "cmj-skeleton-map", className)} />;
}

/** The mark, walked. Sized by width (`className`, default 56px); coloured by `currentColor`. */
export function MarkLoader({ className }: { className?: string }) {
  const [ridge] = MARK_STROKES;
  return (
    <svg viewBox={MARK_VIEWBOX} aria-hidden="true" className={cx("cmj-walk h-auto w-14 flex-none overflow-visible", className)}>
      <path d={MARK_SPARKLE} data-sparkle className="fill-spark" />
      {MARK_STROKES.map(({ d, width }) => (
        <path key={d} d={d} data-base fill="none" stroke="currentColor" strokeWidth={width} strokeLinejoin="round" strokeLinecap="round" />
      ))}
      {/* The walker: a short stretch of the ridge line, travelling along it. */}
      <path
        d={ridge.d}
        data-walker
        pathLength={1}
        fill="none"
        stroke="currentColor"
        strokeWidth={ridge.width}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Three stops on a route, joined by a dashed leg, lighting in turn. The width
 * of an icon (20px), so it can take an icon's place in a button; `currentColor`.
 */
export function RouteDots({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 6" aria-hidden="true" className={cx("cmj-route-dots h-1.5 w-5 flex-none overflow-visible", className)}>
      <path d="M3 3h14" stroke="currentColor" strokeWidth="1" strokeDasharray="1.2 1.6" opacity="0.4" />
      <circle cx="3" cy="3" r="2.25" fill="currentColor" />
      <circle cx="10" cy="3" r="2.25" fill="currentColor" />
      <circle cx="17" cy="3" r="2.25" fill="currentColor" />
    </svg>
  );
}

/**
 * A label for a wait, with the light passing across it (Magic UI's
 * AnimatedShinyText). Use the words that say what is being waited for.
 */
export function LoadingLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <AnimatedShinyText className={cx("text-small", className)}>{children}</AnimatedShinyText>;
}

/**
 * A map's frame while it loads: the map's paper with the light passing, and,
 * if the wait runs past a moment, the walked mark and a label in the middle.
 */
export function MapLoading({ label, className }: { label: string; className?: string }) {
  return (
    <div className={cx("relative grid place-items-center overflow-hidden font-brand", className)}>
      <Skeleton ground="map" className="absolute inset-0" />
      <div className="cmj-arrive-fade relative grid justify-items-center gap-2 text-brand [--cmj-delay:400ms]">
        <MarkLoader className="w-12" />
        <LoadingLabel>{label}</LoadingLabel>
      </div>
    </div>
  );
}
