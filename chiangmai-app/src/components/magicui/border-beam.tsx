"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cx } from "@/components/brand/cx";

/*
 * Magic UI's BorderBeam (installed with `npx shadcn@latest add @magicui/border-beam`):
 * a short light that runs along the edge of its parent. Same idea and the same
 * offset-path trick, changed so it can live on a calm page:
 *
 * - It only runs while it is on screen (an IntersectionObserver pauses it),
 *   and not at all under prefers-reduced-motion — the original looped
 *   forever wherever it was.
 * - It is a CSS animation (app/motion.css), not a motion loop, so a paused
 *   beam costs nothing.
 * - Where the browser cannot follow a rect() path the beam is not drawn,
 *   rather than parking a bright blob in the corner.
 * - Brand colours by default: sunset into sand, the evening light.
 * - `outside` runs the light just outside the parent's edge instead of on its
 *   border. A white card has no border to light up: sand on white measured
 *   invisible, so on the home page the light runs on the green band around
 *   the sample day instead.
 *
 * The parent needs `relative` and its own border radius.
 */
export function BorderBeam({
  size = 80,
  duration = 10,
  delay = 0,
  fadeInDelay = 0,
  colorFrom = "var(--cmj-sunset)",
  colorTo = "var(--cmj-sand)",
  borderWidth = 1.5,
  reverse = false,
  outside = false,
  className,
}: {
  /** Run just outside the parent's edge, on the ground around it. */
  outside?: boolean;
  /** Length of the light, in px. */
  size?: number;
  /** Seconds for one lap. */
  duration?: number;
  /** Seconds into the lap it starts. */
  delay?: number;
  /** Seconds after it comes into view before the light fades up. */
  fadeInDelay?: number;
  colorFrom?: string;
  colorTo?: string;
  borderWidth?: number;
  reverse?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      data-running={running || undefined}
      className={cx(
        "cmj-beam pointer-events-none absolute rounded-[inherit] border-(length:--beam-width) border-transparent",
        outside ? "-inset-(--beam-width)" : "inset-0",
        // Only the border band shows the light.
        "mask-[linear-gradient(transparent,transparent),linear-gradient(#000,#000)] mask-intersect [mask-clip:padding-box,border-box]",
        className,
      )}
      style={
        {
          "--beam-width": `${borderWidth}px`,
          "--beam-duration": `${duration}s`,
          "--beam-delay": `${-delay}s`,
          "--beam-fade-delay": `${fadeInDelay}s`,
        } as CSSProperties
      }
    >
      <span
        className="absolute block aspect-square bg-linear-to-l from-(--beam-from) via-(--beam-to) to-transparent"
        style={
          {
            width: size,
            offsetPath: `rect(0 auto auto 0 round ${size}px)`,
            animationDirection: reverse ? "reverse" : "normal",
            "--beam-from": colorFrom,
            "--beam-to": colorTo,
          } as CSSProperties
        }
      />
    </div>
  );
}
