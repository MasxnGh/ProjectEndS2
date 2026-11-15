"use client";

import { useSyncExternalStore } from "react";
import { CloudFog } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { isBurningSeasonDate } from "@/lib/weather/day-forecast";
import { ICON_STROKE } from "@/components/brand/icons";

const subscribe = () => () => {};

/**
 * For outdoor places, in the burning season only (late February to April): a
 * short note on haze with the old banner's three tips. The date is read in the
 * browser, because the page itself is built ahead of time.
 */
export function HazeNote() {
  const { dict } = useLocale();
  const inSeason = useSyncExternalStore(
    subscribe,
    () => isBurningSeasonDate(new Date().toISOString().slice(0, 10)),
    () => false,
  );
  if (!inSeason) return null;
  const b = dict.weather.seasonalBanner;
  return (
    <aside className="grid gap-2 rounded-lg bg-[color-mix(in_oklab,var(--cmj-sunset)_22%,var(--cmj-panel))] p-5 text-ink">
      <h2 className="flex items-center gap-2 text-label text-brand">
        <CloudFog aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        {dict.placePage.smogTitle} · {b.subtitle}
      </h2>
      <p className="text-small text-pretty">{b.body}</p>
      <ul className="grid list-disc gap-1 pl-5 text-small text-pretty">
        <li>{b.tip1}</li>
        <li>{b.tip2}</li>
        <li>{b.tip3}</li>
      </ul>
    </aside>
  );
}
