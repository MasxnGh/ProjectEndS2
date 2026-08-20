"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Reveals a paragraph word by word as it passes through the viewport —
 * adapted from React Bits' Scroll Reveal
 * (https://reactbits.dev/text-animations/scroll-reveal).
 *
 * Deliberately narrow in scope. The project already has `Reveal`, which fades
 * a whole block in once on entry, and that remains the right tool nearly
 * everywhere. This one ties the reveal to scroll *position* rather than to a
 * single trigger, which suits one long editorial paragraph and would be
 * exhausting applied to a page of them.
 */
export function ScrollReveal({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 0.85", "end 0.4"],
  });

  const words = text.split(" ");

  if (reduced) return <p className={className}>{text}</p>;

  return (
    <p ref={ref} className={cn("flex flex-wrap", className)}>
      {words.map((word, i) => (
        <Word key={i} progress={scrollYProgress} range={[i / words.length, (i + 1) / words.length]}>
          {word}
        </Word>
      ))}
    </p>
  );
}

function Word({
  children,
  progress,
  range,
}: {
  children: string;
  progress: ReturnType<typeof useScroll>["scrollYProgress"];
  range: [number, number];
}) {
  // Dim rather than invisible: the paragraph stays readable at any scroll
  // position, which matters because someone may land mid-page from a link.
  const opacity = useTransform(progress, range, [0.25, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.25em] inline-block">
      {children}
    </motion.span>
  );
}
