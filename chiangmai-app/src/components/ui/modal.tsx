"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic accessible dialog: focus trap, Escape to close, body-scroll lock,
 * focus returns to whatever triggered it on close, respects reduced motion.
 * Extracted from the same pattern already used in PlacePickerPanel, but as
 * a centered confirmation-style dialog rather than a slide-in side panel —
 * used for anything that needs a "stop and ask" moment (sign-in prompts,
 * destructive confirmations) rather than a browsing surface.
 */
export function Modal({
  open,
  onClose,
  titleId,
  closeLabel,
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  titleId: string;
  closeLabel: string;
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const triggerElRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (open && !wasOpenRef.current) {
      triggerElRef.current = document.activeElement as HTMLElement | null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    focusables?.[0]?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerElRef.current?.focus();
    }
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-[1px]"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>
      <AnimatePresence>
        {open ? (
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <motion.div
              key="modal-panel"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
              transition={shouldReduceMotion ? { duration: 0.01 } : { duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className={cn(
                "relative w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-elevated",
                className
              )}
            >
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel}
                className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
              {children}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
