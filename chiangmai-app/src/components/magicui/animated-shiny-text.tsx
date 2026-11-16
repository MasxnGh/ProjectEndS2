import type { ComponentPropsWithoutRef, CSSProperties } from "react";
import { cx } from "@/components/brand/cx";

/*
 * Magic UI's AnimatedShinyText (installed with `npx shadcn@latest add @magicui/animated-shiny-text`):
 * a highlight that sweeps across a line of text. Used for loading labels, in
 * time with the light that sweeps across the skeletons (app/motion.css,
 * ".cmj-shiny").
 *
 * Changed from the original:
 * - Contrast never drops. The original fades the text to 70% and sweeps
 *   black or white across it. Here the label rests in Stone Ink (6.5:1) and
 *   the sweep runs towards the voice colour (green on light, sand on dark),
 *   so the moving part is always the darker or brighter one.
 * - Rhythm: one pass, then a rest, every 2.4s, like the skeletons — the
 *   original crossed once every 8s.
 * - In forced-colours mode and under reduced motion it is plain text.
 * - No layout of its own (the original added mx-auto and max-w-md).
 * - The CLI also wrote `@custom-variant dark (&:is(.dark *))` into the CSS,
 *   which would have replaced the site's own dark variant; that was removed.
 */
export function AnimatedShinyText({
  children,
  className,
  shimmerWidth = 120,
  style,
  ...props
}: ComponentPropsWithoutRef<"span"> & {
  /** Width of the highlight, in px. */
  shimmerWidth?: number;
}) {
  return (
    <span
      style={{ "--shiny-width": `${shimmerWidth}px`, ...style } as CSSProperties}
      className={cx("cmj-shiny", className)}
      {...props}
    >
      {children}
    </span>
  );
}
