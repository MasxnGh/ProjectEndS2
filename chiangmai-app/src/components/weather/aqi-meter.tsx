"use client";

import { motion } from "motion/react";
import type { AqiLevel } from "@/lib/weather/types";
import { AQI_COLORS, AQI_LABELS } from "@/lib/weather/aqi";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

export function AqiDot({ level, className }: { level: AqiLevel; className?: string }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", className)}
      style={{ backgroundColor: AQI_COLORS[level].bg }}
      aria-hidden
    />
  );
}

export function AqiMeter({
  usAqi,
  level,
  pm25,
  compact = false,
}: {
  usAqi: number;
  level: AqiLevel;
  pm25?: number;
  compact?: boolean;
}) {
  const { locale, dict } = useLocale();
  const pct = Math.min(100, (usAqi / 300) * 100);
  const color = AQI_COLORS[level].bg;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="inline-flex items-center gap-1.5 font-medium" style={{ color }}>
          <AqiDot level={level} />
          {AQI_LABELS[level][locale]}
        </span>
        <span className="whitespace-nowrap text-foreground/60">
          {dict.weather.aqiIndex} {usAqi}
          {typeof pm25 === "number" && !compact ? ` · ${dict.weather.pm25} ${pm25}` : null}
        </span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
