"use client";

import { RefreshCw } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useWeatherBundle } from "@/lib/weather/use-weather";
import { useUnitStore, formatTemp } from "@/lib/weather/unit-store";
import { useCountUp } from "@/lib/weather/use-count-up";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { AqiMeter } from "@/components/weather/aqi-meter";
import type { Place } from "@/data/types";
import type { DailyForecastEntry } from "@/lib/weather/types";

function pickBestTimeKey(
  place: Place,
  entry: DailyForecastEntry | undefined
): "bestTimeMorning" | "bestTimeAfternoon" | "bestTimeEvening" {
  const prefersMorning = place.bestTime.includes("morning");
  const prefersEvening = place.bestTime.includes("evening");
  const hot = entry ? entry.maxTempC >= 33 : false;
  const rainy = entry ? entry.precipitationProbability >= 50 : false;

  if ((hot || rainy) && prefersMorning) return "bestTimeMorning";
  if (hot && prefersEvening) return "bestTimeEvening";
  if (rainy) return "bestTimeMorning";
  if (prefersEvening && !prefersMorning && !place.bestTime.includes("afternoon")) return "bestTimeEvening";
  if (prefersMorning) return "bestTimeMorning";
  return "bestTimeAfternoon";
}

export function PlaceWeatherPanel({ place }: { place: Place }) {
  const { locale, dict } = useLocale();
  const { unit } = useUnitStore();
  const bundle = useWeatherBundle(place.coordinates.lat, place.coordinates.lng);
  const displayTemp = useCountUp(
    bundle.weather ? formatTemp(bundle.weather.current.temperatureC, unit) : undefined
  );

  if (bundle.status === "error") {
    return (
      <div className="rounded-lg border border-border p-6">
        <h3 className="font-serif-display text-lg">{dict.weather.place.forecastTitle}</h3>
        <p className="mt-3 text-sm text-foreground/70">{dict.weather.error}</p>
        <button
          type="button"
          onClick={bundle.retry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-text"
        >
          <RefreshCw className="h-3 w-3" />
          {dict.weather.retry}
        </button>
      </div>
    );
  }

  if (bundle.status === "loading" || !bundle.weather || !bundle.airQuality) {
    return (
      <div className="rounded-lg border border-border p-6">
        <h3 className="font-serif-display text-lg">{dict.weather.place.forecastTitle}</h3>
        <div className="mt-4 space-y-3">
          <div className="h-9 w-28 animate-pulse rounded-full bg-surface-muted" />
          <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
          <div className="h-12 w-full animate-pulse rounded-lg bg-surface-muted" />
        </div>
      </div>
    );
  }

  const todayEntry = bundle.weather.daily[0];
  const bestTimeKey = pickBestTimeKey(place, todayEntry);

  return (
    <div className="rounded-lg border border-border p-6">
      <h3 className="font-serif-display text-lg">{dict.weather.place.forecastTitle}</h3>

      <div className="mt-4 flex items-center gap-3">
        <WeatherIcon icon={bundle.weather.current.condition.icon} size={28} className="text-accent-text" />
        <span className="font-serif-display text-3xl tabular-nums leading-none">
          {displayTemp}°{unit}
        </span>
        <span className="text-sm text-foreground/60">{bundle.weather.current.condition.label[locale]}</span>
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <AqiMeter usAqi={bundle.airQuality.usAqi} level={bundle.airQuality.level} pm25={bundle.airQuality.pm2_5} compact />
      </div>

      <div className="mt-4 flex gap-1.5">
        {bundle.weather.daily.slice(0, 5).map((day) => (
          <div key={day.date} className="flex flex-1 flex-col items-center gap-1 rounded-md bg-surface-muted/50 py-2">
            <span className="text-[0.6rem] text-foreground/50">
              {new Date(`${day.date}T00:00:00`).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                weekday: "short",
              })}
            </span>
            <WeatherIcon icon={day.condition.icon} size={14} className="text-accent-text" />
            <span className="text-[0.65rem] tabular-nums text-foreground/80">{formatTemp(day.maxTempC, unit)}°</span>
          </div>
        ))}
      </div>

      <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent-text">
        {dict.weather.place.bestTimeTitle}: {dict.weather.place[bestTimeKey]}
      </div>

      {bundle.status === "stale" ? (
        <p className="mt-3 inline-flex items-center gap-1 text-[0.65rem] text-foreground/40">
          <RefreshCw className="h-2.5 w-2.5 animate-spin" />
          {dict.weather.refreshing}
        </p>
      ) : null}
    </div>
  );
}
