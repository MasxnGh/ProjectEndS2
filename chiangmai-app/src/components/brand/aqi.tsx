import type { Dictionary, Locale } from "@/i18n";
import { AQI_LABELS } from "@/lib/weather/aqi";
import type { AirQualityResponse, AqiLevel } from "@/lib/weather/types";
import { cx } from "./cx";
import { fill } from "./place-text";

/**
 * The usual air-quality scale, green to maroon, toned to sit with the board.
 * The dot never stands alone: the level is always written beside it.
 */
export const AQI_DOT: Record<AqiLevel, string> = {
  good: "#5f8f4e",
  moderate: "#d9a92e",
  "unhealthy-sensitive": "#e0883f",
  unhealthy: "#c4513b",
  "very-unhealthy": "#8a4a8c",
  hazardous: "#6e2a2a",
};

export function AqiDot({ level, className }: { level: AqiLevel; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("inline-block size-2.5 flex-none rounded-full", className)}
      style={{ backgroundColor: AQI_DOT[level] }}
    />
  );
}

/** "PM2.5 23 · ปานกลาง" with its dot. */
export function AqiNote({
  reading,
  locale,
  dict,
  className,
}: {
  reading: AirQualityResponse;
  locale: Locale;
  dict: Dictionary;
  className?: string;
}) {
  return (
    <span className={cx("inline-flex items-center gap-1.5", className)}>
      <AqiDot level={reading.level} />
      {fill(dict.browse.aqi, { value: Math.round(reading.pm2_5), label: AQI_LABELS[reading.level][locale] })}
    </span>
  );
}
