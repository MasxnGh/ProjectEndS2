"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

const DURATION_MS = 700;

/** Matches the ease-out curve used across the site's motion. */
function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Counts a number up (or down) to its new value instead of swapping it.
 *
 * Driven by requestAnimationFrame rather than motion's `animate()`. The
 * earlier implementation called `animate(fromNumber, toNumber, …)`, which
 * emits no frames in motion 12 — so the hook returned whatever `useState`
 * had captured on mount and never moved again. That looked fine in the
 * weather widgets, where the value is set once and rarely changes, but in the
 * planner it meant the estimated cost showed the figure for the travel mode
 * before last: correct prop in, stale number out.
 */
export function useCountUp(target: number | undefined): number {
  const [display, setDisplay] = useState(target ?? 0);
  const valueRef = useRef(target ?? 0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (target === undefined) return;

    if (reduced) {
      valueRef.current = target;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reduced-motion needs an immediate (non-animated) value swap
      setDisplay(target);
      return;
    }

    const from = valueRef.current;
    if (from === target) return;

    // A hidden tab throttles requestAnimationFrame to nothing, so an animated
    // count would simply never arrive and the old number would sit there. Being
    // right matters more than counting: jump straight to the value.
    if (typeof document !== "undefined" && document.hidden) {
      valueRef.current = target;
      setDisplay(target);
      return;
    }

    let frame = 0;
    const start = performance.now();

    function step(now: number) {
      const progress = Math.min(1, (now - start) / DURATION_MS);
      const value = from + (target! - from) * easeOut(progress);
      valueRef.current = value;
      setDisplay(value);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        // Land exactly on the target rather than near it, so the number on
        // screen always matches the number that was passed in.
        valueRef.current = target!;
        setDisplay(target!);
      }
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, reduced]);

  return Math.round(display);
}
