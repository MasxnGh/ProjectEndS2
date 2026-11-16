"use client";

import { useEffect, useRef, type CSSProperties, type ElementType, type ReactNode } from "react";
import { cx } from "@/components/brand/cx";
import { revealAttr, useReveal } from "./reveal";

/*
 * Magic UI's BlurFade (installed with `npx shadcn@latest add @magicui/blur-fade`),
 * kept to its props but rebuilt for this site:
 *
 * - It never starts hidden in the server's HTML. The original renders
 *   `initial="hidden"`, so content waited for JavaScript; here only what is
 *   still below the fold after hydration is hidden (see reveal.tsx), and the
 *   entrance is a CSS transition (app/motion.css).
 * - `stagger` animates each direct child in turn instead of the element
 *   itself, for a list that appears as a list. The delay is capped at the
 *   sixth item.
 * - Durations and the curve come from DESIGN.md ("Motion"): 800ms, expo-out.
 * - It is an inView fade only. The site has no use for a fade on mount; the
 *   things that arrive on load use CSS keyframes instead (.cmj-arrive).
 */

type Tag = "div" | "ul" | "ol" | "li" | "p" | "section" | "article" | "span";

export function BlurFade({
  as = "div",
  children,
  className,
  style,
  duration = 0.8,
  delay = 0,
  offset = 16,
  direction = "up",
  blur = "6px",
  stagger,
  ...rest
}: {
  as?: Tag;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Seconds. */
  duration?: number;
  /** Seconds before it starts, once in view. */
  delay?: number;
  /** How far it travels, in px. */
  offset?: number;
  /** The way it moves as it arrives. */
  direction?: "up" | "down" | "left" | "right";
  blur?: string;
  /** Seconds between children; animates each direct child instead of the element. */
  stagger?: number;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const state = useReveal(ref);

  // Each child learns its place in the list, for the stagger delay.
  useEffect(() => {
    const el = ref.current;
    if (!el || stagger === undefined) return;
    Array.from(el.children).forEach((child, i) => (child as HTMLElement).style.setProperty("--i", String(i)));
  }, [stagger, children]);

  const horizontal = direction === "left" || direction === "right";
  // "up" arrives from below, so it starts lower down; "left" arrives from the right.
  const distance = direction === "up" || direction === "left" ? offset : -offset;
  const vars = {
    "--bf-duration": `${duration * 1000}ms`,
    "--bf-delay": `${delay * 1000}ms`,
    "--bf-x": horizontal ? `${distance}px` : "0px",
    "--bf-y": horizontal ? "0px" : `${distance}px`,
    "--bf-blur": blur,
    ...(stagger !== undefined ? { "--bf-stagger": `${stagger * 1000}ms` } : {}),
    ...style,
  } as CSSProperties;

  const Tag = as as ElementType;
  return (
    <Tag
      ref={ref}
      className={cx(stagger !== undefined ? "cmj-stagger" : "cmj-blur-fade", className)}
      style={vars}
      data-reveal={revealAttr(state)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
