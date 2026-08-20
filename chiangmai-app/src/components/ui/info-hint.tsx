"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Info } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMotionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/**
 * A small "what does this mean?" marker.
 *
 * This site is full of vocabulary a visitor has no reason to know — pace
 * bands, golden hour, an AQI number, ฿฿ price levels, an "estimated cost"
 * that quietly includes meals nobody has chosen yet. None of it was explained
 * anywhere: the codebase had no tooltip of any kind, only ten bare `title`
 * attributes, which do not open on touch and cannot be styled.
 *
 * So this opens on click and on keyboard focus rather than on hover alone,
 * which is the whole reason `title` was not good enough. The hint is bound to
 * whatever it explains with `aria-describedby`, so a screen reader reads the
 * explanation as part of the thing rather than as a stray button.
 */
export function InfoHint({
  label,
  text,
  className,
  align = "start",
}: {
  /** Names the term for assistive tech, e.g. "What 'pace' means". */
  label: string;
  text: string;
  className?: string;
  align?: "start" | "end";
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const m = useMotionTokens();
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={cn("no-print relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        // The icon reads at 14px, but the hit area is padded out to 24px:
        // this exists to be tapped on a phone, and a 16px target is below
        // WCAG 2.2's minimum and awkward with a thumb. `-m-1` keeps the extra
        // padding from pushing the surrounding text around.
        className="-m-1 inline-flex h-6 w-6 items-center justify-center rounded-full p-1 text-muted-foreground transition-colors hover:text-accent-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      >
        <Info className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.span
            id={id}
            role="tooltip"
            initial={{ opacity: 0, y: m.reduced ? 0 : 4, scale: m.reduced ? 1 : 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: m.reduced ? 0 : 4, scale: m.reduced ? 1 : 0.96 }}
            transition={m.tween("fast")}
            className={cn(
              "absolute bottom-full z-30 mb-2 w-56 rounded-md border border-border bg-background p-2.5 text-left text-xs font-normal leading-snug text-foreground shadow-elevated",
              align === "end" ? "right-0" : "left-0"
            )}
          >
            {text}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
