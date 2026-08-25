"use client";

import { MotionConfig } from "motion/react";

/**
 * Makes `prefers-reduced-motion: reduce` apply to every animation on the site,
 * not just the ones that remembered to ask.
 *
 * The CSS block in globals.css clamps CSS animations and transitions, but
 * motion/react animates with inline styles and the Web Animations API, which
 * that block cannot reach. Each component was therefore responsible for calling
 * `useReducedMotion()` itself, and the shared `revealItemVariants` — the
 * entrance used by every card grid on the site — never did: RevealGroup zeroed
 * the stagger between items while each item still slid 24px over 0.7s.
 *
 * `reducedMotion="user"` makes motion drop transform and layout animations for
 * anyone who has asked for that, everywhere, and keeps opacity — so content
 * still fades in rather than appearing without explanation.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
