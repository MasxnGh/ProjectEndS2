"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Cards that stack and settle as you scroll past them — adapted from React
 * Bits' Scroll Stack (https://reactbits.dev/components/scroll-stack).
 *
 * **Used with a caveat.** Stacking shows one card at a time, which is the
 * opposite of what an index page is for: the guides page exists so someone
 * can compare three guides and pick one. So this is applied as presentation
 * only — the caller keeps a plain, fully-visible list as the real way to
 * choose — and `prefers-reduced-motion` drops the effect entirely rather than
 * offering a degraded version of it.
 */
export function ScrollStack({
  children,
  className,
}: {
  children: ReactNode[];
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  if (reduced) {
    return <div className={cn("grid gap-6 md:grid-cols-3", className)}>{children}</div>;
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      {children.map((child, i) => (
        <StackCard key={i} progress={scrollYProgress} index={i} total={children.length}>
          {child}
        </StackCard>
      ))}
    </div>
  );
}

function StackCard({
  children,
  progress,
  index,
  total,
}: {
  children: ReactNode;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  index: number;
  total: number;
}) {
  const start = index / total;
  const end = (index + 1) / total;

  // Earlier cards shrink slightly and drift back as later ones arrive, which
  // is what reads as a stack rather than a list.
  const scale = useTransform(progress, [start, end], [1, 0.94]);
  const opacity = useTransform(progress, [start, end], [1, 0.55]);

  return (
    <motion.div
      style={{ scale, opacity, zIndex: total - index }}
      className="sticky top-28 mb-8 origin-top"
    >
      {children}
    </motion.div>
  );
}
