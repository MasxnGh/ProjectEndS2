"use client";

import { motion, useScroll } from "motion/react";
import { cx } from "@/components/brand/cx";

/*
 * Magic UI's ScrollProgress (installed with `npx shadcn@latest add @magicui/scroll-progress`):
 * a bar across the top of the window that fills as you read. Used on a guide,
 * where how far through you are is worth knowing.
 *
 * Changed from the original: the voice colour instead of a purple-to-pink
 * gradient (green on light, sand on dark), 3px so it reads on a phone, hidden
 * from screen readers and from print. It follows the reader's own scrolling,
 * so it stays under reduced motion: nothing moves that the reader did not move.
 *
 * It runs along the foot of the sticky header (72px plus its 1px rule), not
 * the top of the window. The top was tried and measured: the page sits in the
 * route wrapper (app/[locale]/template.tsx), whose opacity animation makes it
 * a stacking context below the header, so no z-index lets the bar rise above
 * the header from inside the page.
 */
export function ScrollProgress({ className }: { className?: string }) {
  const { scrollYProgress } = useScroll();
  return (
    <motion.div
      aria-hidden
      className={cx("no-print pointer-events-none fixed inset-x-0 top-[73px] z-40 h-[3px] origin-left bg-brand", className)}
      style={{ scaleX: scrollYProgress }}
    />
  );
}
