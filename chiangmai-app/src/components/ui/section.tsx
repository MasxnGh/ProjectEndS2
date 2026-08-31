import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * The page-layout primitive the site was missing.
 *
 * Every section on every page previously typed out
 * `mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32` by hand. Nobody chose for
 * the landing page to read as five identical slabs — it happened because
 * copying the same string is easier than deciding, and because 1280px was the
 * only width available whether the content was a paragraph or a map.
 *
 * Two axes, both deliberate at each call site:
 *
 *   width  — how much horizontal room the content has earned. Prose narrows for
 *            reading; wide exists so a grid or a map can use a large display
 *            instead of leaving a third of it as margin.
 *   rhythm — how much air surrounds it. Varying this is what gives a page pace;
 *            a run of `loose` sections is as monotonous as a run of identical
 *            ones.
 */

export type SectionWidth = "prose" | "default" | "wide" | "full";
export type SectionRhythm = "none" | "tight" | "default" | "loose";

/** Line length caps, not container caps: `prose` is measured in characters. */
const WIDTH: Record<SectionWidth, string> = {
  prose: "mx-auto w-full max-w-[68ch] px-6 lg:px-10",
  default: "mx-auto w-full max-w-[75rem] px-6 lg:px-10",
  wide: "mx-auto w-full max-w-[95rem] px-6 lg:px-10",
  // Full bleed deliberately has no padding: content that goes edge to edge —
  // a hero, a map — needs to control its own insets.
  full: "w-full",
};

/*
 * Rhythm compresses on a phone.
 *
 * The same air that gives a section room on a 1600px display is dead scroll on
 * a 375px one — 112px above and below a paragraph is most of a thumb swipe
 * spent on nothing. Each step keeps its desktop value from `sm` up.
 */
const RHYTHM: Record<SectionRhythm, string> = {
  none: "",
  tight: "py-8 sm:py-12 lg:py-16",
  default: "py-12 sm:py-20 lg:py-28",
  loose: "py-16 sm:py-28 lg:py-40",
};

export function Section({
  as: Tag = "section",
  width = "default",
  rhythm = "default",
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  width?: SectionWidth;
  rhythm?: SectionRhythm;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={cn(WIDTH[width], RHYTHM[rhythm], className)} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * The same horizontal measure without the vertical rhythm, for content that
 * sits inside a full-bleed section — a nav inside a coloured band, a caption
 * under an edge-to-edge image — and needs to line up with the rest of the page.
 */
export function Container({
  as: Tag = "div",
  width = "default",
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  width?: Exclude<SectionWidth, "full">;
  className?: string;
  children: ReactNode;
} & Omit<React.HTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag className={cn(WIDTH[width], className)} {...rest}>
      {children}
    </Tag>
  );
}
