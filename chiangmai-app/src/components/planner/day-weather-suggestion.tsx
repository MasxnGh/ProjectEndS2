"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLocale } from "@/components/providers/locale-provider";
import type { SuggestionKey } from "@/lib/weather/day-forecast";

const TONE: Record<SuggestionKey, "caution" | "info" | "positive"> = {
  badAir: "caution",
  rainy: "caution",
  hazySeason: "info",
  hotMidday: "info",
  goodAir: "positive",
  clearSunset: "positive",
};

const TONE_STYLES = {
  caution: "border-l-2 border-l-[#8a3a2c] bg-[#8a3a2c]/8 text-foreground/85",
  info: "border-l-2 border-l-accent bg-accent/8 text-foreground/85",
  positive: "border-l-2 border-l-secondary bg-secondary/10 text-foreground/85",
} as const;

export function DayWeatherSuggestion({ suggestion }: { suggestion: SuggestionKey | undefined }) {
  const { dict } = useLocale();
  const reduced = useReducedMotion();

  if (!suggestion) return null;

  return (
    <motion.p
      initial={reduced ? undefined : { opacity: 0, height: 0 }}
      animate={reduced ? undefined : { opacity: 1, height: "auto" }}
      transition={{ duration: 0.3 }}
      className={`mx-3 mt-3 rounded-md px-3 py-2 text-xs leading-relaxed ${TONE_STYLES[TONE[suggestion]]}`}
    >
      {dict.weather.planner.suggestions[suggestion]}
    </motion.p>
  );
}
