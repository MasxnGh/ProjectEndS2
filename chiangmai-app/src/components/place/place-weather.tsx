"use client";

import { RotateCw } from "lucide-react";
import type { Place } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useWeatherBundle } from "@/lib/weather/use-weather";
import { formatTemp, useUnitStore } from "@/lib/weather/unit-store";
import type { DailyForecastEntry } from "@/lib/weather/types";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { AqiNote } from "@/components/brand/aqi";
import { Button } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { Box } from "@/components/brand/surface";
import { Skeleton } from "@/components/brand/loaders";

/** Unchanged from the old weather panel: which part of today suits this place, given the forecast. */
function pickBestTimeKey(
  place: Place,
  entry: DailyForecastEntry | undefined,
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

/**
 * Live weather and air at the place, from the app's own Open-Meteo routes: now,
 * the next five days, and which part of today suits it. Every figure is a
 * reading; while loading it says so, and if the service is down it says that.
 */
export function PlaceWeather({ place }: { place: Place }) {
  const { locale, dict } = useLocale();
  const t = dict.placePage;
  const { unit } = useUnitStore();
  const bundle = useWeatherBundle(place.coordinates.lat, place.coordinates.lng);

  const heading = <h2 className="text-label text-ink-soft">{t.weatherTitle}</h2>;

  if (bundle.status === "error") {
    return (
      <Box className="grid gap-3 p-5">
        {heading}
        <p className="text-small text-ink">{t.weatherError}</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={bundle.retry}
          icon={<RotateCw aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
          className="justify-self-start"
        >
          {t.weatherRetry}
        </Button>
      </Box>
    );
  }

  if (bundle.status === "loading" || !bundle.weather) {
    return (
      <Box className="grid gap-3 p-5" aria-busy="true">
        {heading}
        <div className="flex items-center gap-3">
          <Skeleton className="size-11 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[72px] rounded-md" />
          ))}
        </div>
        <span className="sr-only">{dict.common.loading}</span>
      </Box>
    );
  }

  const { current, daily } = bundle.weather;
  const bestTimeKey = pickBestTimeKey(place, daily[0]);
  const dayName = (date: string) =>
    new Date(`${date}T00:00:00`).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", { weekday: "short" });

  return (
    <Box className="grid gap-4 p-5">
      {heading}
      <div className="flex items-center gap-4">
        <span aria-hidden className="grid size-12 flex-none place-items-center rounded-full bg-well text-brand">
          <WeatherIcon icon={current.condition.icon} size={26} />
        </span>
        <p className="grid">
          <span className="text-[1.75rem] leading-[1.2] font-semibold text-brand tabular-nums">
            {formatTemp(current.temperatureC, unit)}°{unit}
          </span>
          <span className="text-small text-ink">{current.condition.label[locale]}</span>
        </p>
      </div>
      {bundle.airQuality ? <AqiNote reading={bundle.airQuality} locale={locale} dict={dict} className="text-small" /> : null}
      <div>
        <h3 className="mb-2 text-small text-ink-soft">{t.forecast}</h3>
        <ul role="list" className="grid grid-cols-5 gap-1.5">
          {daily.slice(0, 5).map((day) => (
            <li key={day.date} className="grid justify-items-center gap-1 rounded-md bg-well py-2 text-center">
              <span className="text-credit text-ink-soft">{dayName(day.date)}</span>
              <WeatherIcon icon={day.condition.icon} size={18} className="text-brand" label={day.condition.label[locale]} />
              <span className="text-small font-medium tabular-nums">{formatTemp(day.maxTempC, unit)}°</span>
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-md bg-leaf-fill px-3 py-2 text-small text-brand">
        <span className="font-medium">{dict.weather.place.bestTimeTitle}:</span> {dict.weather.place[bestTimeKey]}
      </p>
      <p className="text-credit text-ink-soft">{t.weatherSource}</p>
    </Box>
  );
}
