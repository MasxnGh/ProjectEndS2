"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Search, X } from "lucide-react";
import { places } from "@/data/places";
import type { PlaceCategory } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useMediaQuery } from "@/lib/use-media-query";
import { PlacePickerCard } from "@/components/planner/place-picker-card";
import { cn } from "@/lib/utils";

const CATEGORIES: PlaceCategory[] = ["temple", "nature", "village", "cafe", "market", "activity"];
const TITLE_ID = "place-picker-title";

export function PlacePickerPanel({
  dayId,
  dayNumber,
  onClose,
  triggerRef,
}: {
  dayId: string | null;
  dayNumber: number | null;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
}) {
  const { locale, dict } = useLocale();
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const shouldReduceMotion = useReducedMotion();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PlaceCategory | null>(null);

  const open = Boolean(dayId && dayNumber);

  // Reset transient filters whenever the panel opens for a (possibly
  // different) day. Adjusted during render rather than in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevDayId, setPrevDayId] = useState(dayId);
  if (dayId !== prevDayId) {
    setPrevDayId(dayId);
    setQuery("");
    setCategory(null);
  }

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
    searchInputRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
    } else if (wasOpenRef.current) {
      wasOpenRef.current = false;
      triggerRef.current?.focus();
    }
  }, [open, triggerRef]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return places.filter((place) => {
      if (category && place.category !== category) return false;
      if (!q) return true;
      const haystack =
        `${place.name.en} ${place.name.th} ${place.shortDescription.en} ${place.shortDescription.th}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [query, category]);

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.div
            key="picker-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
            onClick={onClose}
            className="no-print fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
            aria-hidden
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {open && dayId && dayNumber ? (
          <motion.div
            key="picker-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={TITLE_ID}
            drag={!isDesktop && !shouldReduceMotion ? "y" : false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
            initial={shouldReduceMotion ? { opacity: 0 } : isDesktop ? { x: "100%" } : { y: "100%" }}
            animate={shouldReduceMotion ? { opacity: 1 } : { x: 0, y: 0 }}
            exit={shouldReduceMotion ? { opacity: 0 } : isDesktop ? { x: "100%" } : { y: "100%" }}
            transition={shouldReduceMotion ? { duration: 0.01 } : { type: "spring", stiffness: 340, damping: 34 }}
            className="no-print fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-2xl border-t border-border bg-background shadow-elevated sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:w-[480px] sm:max-h-none sm:rounded-none sm:border-l sm:border-t-0"
          >
            <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border-strong sm:hidden" aria-hidden />

            <div className="flex items-start justify-between gap-3 border-b border-border p-5 pb-4">
              <h2 id={TITLE_ID} className="font-serif-display text-xl leading-snug">
                {dict.planner.picker.title.replace("{day}", String(dayNumber))}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={dict.planner.picker.close}
                className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-surface-muted hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 border-b border-border p-5 pb-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={dict.planner.picker.searchPlaceholder}
                  aria-label={dict.planner.picker.searchAriaLabel}
                  className="w-full rounded-full border border-border bg-transparent py-2.5 pl-10 pr-4 text-sm outline-none transition-colors focus:border-accent"
                />
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setCategory(null)}
                  className={cn(
                    "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
                    category === null
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border text-foreground/80 hover:border-accent hover:text-accent-text"
                  )}
                >
                  {dict.planner.picker.allCategories}
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(category === c ? null : c)}
                    className={cn(
                      "shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors duration-200",
                      category === c
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border text-foreground/80 hover:border-accent hover:text-accent-text"
                    )}
                  >
                    {dict.common.categories[c]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-5">
              {filtered.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">{dict.planner.picker.noResults}</p>
              ) : (
                filtered.map((place) => (
                  <PlacePickerCard key={place.slug} place={place} dayId={dayId} dayNumber={dayNumber} />
                ))
              )}
            </div>

            <div className="border-t border-border p-4">
              <Link
                href={`/${locale}/explore?from=planner&day=${dayNumber}`}
                className="flex items-center justify-center gap-1.5 rounded-full border border-border-strong px-4 py-2.5 text-sm font-medium hover:border-accent hover:text-accent-text"
              >
                {dict.planner.picker.viewAll}
              </Link>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
