"use client";

import { Check, Plus } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore, useTripStoreHydrated } from "@/lib/trip-store";
import { useMotionTokens } from "@/lib/motion";
import { cn } from "@/lib/utils";

/** Long enough to register, short enough to be gone before you look away. */
const PULSE_SECONDS = 0.5;

export function AddToPlanButton({ slug, className }: { slug: string; className?: string }) {
  const { dict } = useLocale();
  // Held at the server's answer until the persisted trip has rehydrated — see
  // useTripStoreHydrated.
  const hydrated = useTripStoreHydrated();
  const isPlanned = useTripStore((s) => s.isPlanned(slug)) && hydrated;
  const addPlace = useTripStore((s) => s.addPlace);
  const removeFromPlan = useTripStore((s) => s.removeFromPlan);
  const m = useMotionTokens();

  return (
    <motion.button
      type="button"
      onClick={() => (isPlanned ? removeFromPlan(slug) : addPlace(slug))}
      aria-pressed={isPlanned}
      whileTap={{ scale: m.reduced ? 1 : 0.96 }}
      transition={m.spring("press")}
      className={cn(
        "relative flex items-center gap-2 rounded-full border px-6 py-3 text-sm font-medium transition-colors duration-200",
        isPlanned
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border-strong hover:border-accent hover:text-accent-text",
        className
      )}
    >
      {/* One ring, expanding outward the moment the place lands in the plan.
          Keyed on the state so it fires once per change rather than looping. */}
      <AnimatePresence>
        {isPlanned && !m.reduced ? (
          <motion.span
            key="pulse"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border border-accent"
            initial={{ opacity: 0.7, scale: 1 }}
            animate={{ opacity: 0, scale: 1.35 }}
            transition={{ duration: PULSE_SECONDS, ease: "easeOut" }}
          />
        ) : null}
      </AnimatePresence>

      {/* The icon is the state. Swapping it with a spring makes the button feel
          like it answered, where a straight swap read as nothing happening. */}
      <span className="relative flex h-4 w-4 items-center justify-center">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={isPlanned ? "check" : "plus"}
            initial={{ opacity: 0, scale: m.reduced ? 1 : 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: m.reduced ? 1 : 0.4 }}
            transition={m.spring("press")}
            className="absolute inset-0 flex items-center justify-center"
          >
            {isPlanned ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </motion.span>
        </AnimatePresence>
      </span>

      {isPlanned ? dict.common.addedToPlan : dict.place.addToPlan}
    </motion.button>
  );
}

