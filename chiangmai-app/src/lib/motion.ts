"use client";

import { useReducedMotion, type Transition, type Variants } from "motion/react";

/**
 * The site's motion vocabulary, in one place.
 *
 * Every value here was lifted from what the codebase was already doing rather
 * than invented: the curve below had been hand-copied into seven files, and
 * durations had drifted across 0.2, 0.3, 0.7, 0.9, 1.1, 1.8, 3 and 4.5 with no
 * scale behind them. Centralising them is the point — the aim is for movement
 * to feel like one system, not to change how anything already feels.
 */

/** The site's signature curve — a soft expo-out. Was duplicated in reveal, split-text, nav-bar, modal, the plan progress bar and explore. */
export const EASE = [0.16, 1, 0.3, 1] as const;

export const DURATION = {
  /** Colour and opacity changes, hover states. */
  fast: 0.2,
  /** The default for entrances, layout shifts and most transitions. */
  base: 0.45,
  /** Scroll reveals and counting numbers — long enough to notice. */
  slow: 0.7,
  /** Hero and display type, where the pacing is part of the tone. */
  editorial: 0.9,
} as const;

export const SPRING = {
  /**
   * Buttons under a finger: quick, barely overshoots. A press that wobbles
   * reads as a toy rather than a response.
   */
  press: { type: "spring", stiffness: 500, damping: 30, mass: 0.6 },
  /** Cards and cursor-following elements — the value MagneticButton already used. */
  soft: { type: "spring", stiffness: 300, damping: 20, mass: 0.5 },
} as const satisfies Record<string, Transition>;

/** Standard entrance shapes. Pair with `staggerContainer` for lists. */
export const VARIANTS = {
  fadeUp: {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0 },
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.96 },
    visible: { opacity: 1, scale: 1 },
  },
} satisfies Record<string, Variants>;

/**
 * Motion values already adjusted for the visitor's motion preference.
 *
 * Components used to each write their own `duration: shouldReduceMotion ? 0.01
 * : 0.7`, which meant three slightly different definitions of "off". Reading
 * timings from here instead makes reduced motion a property of the system.
 *
 * Note this is belt-and-braces: `globals.css` also clamps every animation and
 * transition duration under `prefers-reduced-motion`. This hook matters for
 * the cases CSS cannot reach — spring physics and JS-driven values.
 */
export function useMotionTokens() {
  // `useReducedMotion` reports null until it has read the media query, which
  // is the server render. Treating that as "animate" matches what every
  // component here already did with a plain falsy check, and means the first
  // paint is not stripped of motion for everyone.
  const reduced = Boolean(useReducedMotion());

  return {
    reduced,
    /** A duration from the scale, or 0 when motion is unwelcome. */
    duration(key: keyof typeof DURATION = "base"): number {
      return reduced ? 0 : DURATION[key];
    },
    /** A spring, or an instant transition when motion is unwelcome. */
    spring(key: keyof typeof SPRING = "soft"): Transition {
      return reduced ? { duration: 0 } : SPRING[key];
    },
    /** A tween using the site curve. */
    tween(key: keyof typeof DURATION = "base"): Transition {
      return { duration: reduced ? 0 : DURATION[key], ease: EASE };
    },
    /** Stagger delay between children, or none. */
    stagger(seconds = 0.06): number {
      return reduced ? 0 : seconds;
    },
    /** Drops y/scale offsets so nothing travels when motion is unwelcome. */
    variants(key: keyof typeof VARIANTS): Variants {
      if (!reduced) return VARIANTS[key];
      return { hidden: { opacity: 0 }, visible: { opacity: 1 } };
    },
  };
}
