"use client";

import { useEffect, useRef, type ComponentPropsWithoutRef } from "react";
import { animate } from "motion/react";
import { cx } from "@/components/brand/cx";
import { EASE } from "@/lib/motion";
import { useReveal } from "./reveal";

/*
 * Magic UI's NumberTicker (installed with `npx shadcn@latest add @magicui/number-ticker`),
 * changed in four ways:
 *
 * - The server renders the real number. The original rendered `startValue`
 *   (0) until JavaScript ran, so a page without scripts, a crawler or a
 *   screen reader that arrived early read "฿0". Here the figure is only
 *   wound back to the start once it is known to be off screen (reveal.tsx),
 *   and counts up when it comes into view.
 * - A timed tween on the site curve instead of the original spring. That
 *   spring is heavily damped, so its tail crawls: measured on the home page,
 *   the budget sat at "746" for over a second before reaching 750, which
 *   reads as a wrong figure. A tween lands exactly when it says it will.
 * - No colour or tracking of its own: it inherits the text it sits in.
 * - Screen readers get the final value through aria-label, never the
 *   numbers in between.
 */

export function NumberTicker({
  value,
  startValue = 0,
  delay = 0,
  duration = 1.4,
  decimalPlaces = 0,
  locale = "en-US",
  revealWith,
  className,
  ...props
}: {
  value: number;
  startValue?: number;
  /** Seconds after it comes into view. */
  delay?: number;
  /** Seconds the count takes. */
  duration?: number;
  decimalPlaces?: number;
  /** Number format; the site writes baht amounts in en-US grouping. */
  locale?: string;
  /** Start with an ancestor's reveal (a selector) rather than its own, so `delay` counts from that. */
  revealWith?: string;
} & Omit<ComponentPropsWithoutRef<"span">, "children">) {
  const ref = useRef<HTMLSpanElement>(null);
  const state = useReveal(ref, revealWith ? { closest: revealWith } : { rootMargin: "0px" });

  const format = (n: number) =>
    Intl.NumberFormat(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    }).format(Number(n.toFixed(decimalPlaces)));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (state === "hidden") el.textContent = format(startValue);
    if (state !== "shown") return;
    const controls = animate(startValue, value, {
      delay,
      duration,
      ease: EASE,
      onUpdate: (latest) => {
        el.textContent = format(latest);
      },
    });
    return () => controls.stop();
    // format is rebuilt each render from the same inputs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, value, startValue, delay, duration]);

  return (
    <span ref={ref} aria-label={format(value)} className={cx("inline-block tabular-nums", className)} {...props}>
      {format(value)}
    </span>
  );
}
