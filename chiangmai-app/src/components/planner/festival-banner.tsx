"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { PartyPopper, AlertTriangle, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { getFestivalsOverlapping } from "@/lib/festivals";
import { addDaysIso } from "@/lib/date-utils";

export function FestivalBanner({
  travelDate,
  dayCount,
  className,
}: {
  travelDate: string;
  dayCount: number;
  className?: string;
}) {
  const { locale, dict } = useLocale();
  const t = dict.planner.festival;
  const reduced = useReducedMotion();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const matches = useMemo(() => {
    if (!travelDate || dayCount < 1) return [];
    const endDate = addDaysIso(travelDate, dayCount - 1);
    return getFestivalsOverlapping(travelDate, endDate);
  }, [travelDate, dayCount]);

  const visible = matches.filter((m) => !dismissed.has(`${m.festival.id}-${m.occurrence.year}`));
  if (visible.length === 0) return null;

  return (
    <div className={className}>
      <AnimatePresence>
        {visible.map((match) => {
          const key = `${match.festival.id}-${match.occurrence.year}`;
          return (
            <motion.div
              key={key}
              initial={reduced ? undefined : { opacity: 0, y: -8, height: 0 }}
              animate={reduced ? undefined : { opacity: 1, y: 0, height: "auto" }}
              exit={reduced ? undefined : { opacity: 0, y: -8, height: 0 }}
              className="relative mb-3 overflow-hidden rounded-lg border border-accent/30 bg-accent/8 p-5"
            >
              <button
                type="button"
                onClick={() => setDismissed((prev) => new Set(prev).add(key))}
                aria-label={t.dismiss}
                className="absolute right-3 top-3 rounded-full p-1 text-foreground/50 hover:bg-surface-muted"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-start gap-3 pr-6">
                <PartyPopper className="mt-0.5 h-5 w-5 shrink-0 text-accent-text" />
                <div>
                  <p className="font-serif-display text-base">{match.festival.name[locale]}</p>
                  <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                    {match.festival.description[locale]}
                  </p>
                  <ul className="mt-3 space-y-1 text-xs text-foreground/70">
                    {match.festival.advice.map((tip, i) => (
                      <li key={i}>• {tip[locale]}</li>
                    ))}
                  </ul>
                  {!match.occurrence.verified ? (
                    <p className="mt-3 flex items-start gap-1.5 text-xs text-accent-text">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      {t.unverifiedDate}
                    </p>
                  ) : null}
                </div>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
