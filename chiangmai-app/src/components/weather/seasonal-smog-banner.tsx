"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Info, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { isBurningSeasonDate } from "@/lib/weather/day-forecast";

export function SeasonalSmogBanner({ referenceDate, className }: { referenceDate?: string; className?: string }) {
  const { dict } = useLocale();
  const [dismissed, setDismissed] = useState(false);
  const reduced = useReducedMotion();

  const today = new Date().toISOString().slice(0, 10);
  const show = (isBurningSeasonDate(referenceDate) || isBurningSeasonDate(today)) && !dismissed;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={reduced ? undefined : { opacity: 0, y: -8, height: 0 }}
          animate={reduced ? undefined : { opacity: 1, y: 0, height: "auto" }}
          exit={reduced ? undefined : { opacity: 0, y: -8, height: 0 }}
          className={`relative overflow-hidden rounded-lg border border-accent/30 bg-accent/8 p-5 ${className ?? ""}`}
        >
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label={dict.weather.seasonalBanner.dismiss}
            className="absolute right-3 top-3 rounded-full p-1 text-foreground/50 hover:bg-surface-muted"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-start gap-3 pr-6">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" />
            <div>
              <p className="font-serif-display text-base">{dict.weather.seasonalBanner.title}</p>
              <p className="text-xs text-foreground/50">{dict.weather.seasonalBanner.subtitle}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/80">{dict.weather.seasonalBanner.body}</p>
              <ul className="mt-3 space-y-1 text-xs text-foreground/70">
                <li>• {dict.weather.seasonalBanner.tip1}</li>
                <li>• {dict.weather.seasonalBanner.tip2}</li>
                <li>• {dict.weather.seasonalBanner.tip3}</li>
              </ul>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
