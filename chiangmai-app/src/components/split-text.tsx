"use client";

import { motion, useReducedMotion } from "motion/react";

export function SplitText({
  text,
  className,
  delay = 0,
  as = "span",
}: {
  text: string;
  className?: string;
  delay?: number;
  as?: "span" | "h1" | "div";
}) {
  const shouldReduceMotion = useReducedMotion();
  const words = text.split(" ");
  const Tag = motion[as];

  return (
    <Tag className={className} aria-label={text}>
      {words.map((word, i) => (
        <span key={i} className="inline-block overflow-hidden pb-1 align-top" aria-hidden>
          <motion.span
            className="inline-block"
            initial={{ y: shouldReduceMotion ? 0 : "110%" }}
            animate={{ y: 0 }}
            transition={{
              duration: shouldReduceMotion ? 0.01 : 0.9,
              delay: shouldReduceMotion ? 0 : delay + i * 0.07,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {word}
            {i < words.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
