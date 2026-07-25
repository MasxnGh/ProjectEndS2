"use client";

import { History } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { AqiDot } from "@/components/weather/aqi-meter";
import { formatTemp, useUnitStore } from "@/lib/weather/unit-store";
import type { AirQualityResponse, DailyForecastEntry, SeasonalAverageResponse } from "@/lib/weather/types";

export function DayWeatherHeader({
  entry,
  isToday,
  airQuality,
  seasonalAverage,
}: {
  entry: DailyForecastEntry | undefined;
  isToday: boolean;
  airQuality: AirQualityResponse | undefined;
  seasonalAverage?: SeasonalAverageResponse;
}) {
  const { locale, dict } = useLocale();
  const { unit } = useUnitStore();
  const t = dict.weather.planner.seasonalAverage;

  if (!entry) {
    if (!seasonalAverage) return null;
    return (
      <div className="flex items-center gap-2 bg-surface-muted/40 px-4 py-2 text-xs">
        <History className="h-4 w-4 shrink-0 text-foreground/50" aria-hidden="true" />
        <span className="font-medium tabular-nums text-foreground">
          {formatTemp(seasonalAverage.maxTempC, unit)}° / {formatTemp(seasonalAverage.minTempC, unit)}°
        </span>
        <span className="text-foreground/50">
          {t.label} · {t.description.replace("{years}", String(seasonalAverage.sampledYears.length))}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-surface-muted/40 px-4 py-2 text-xs">
      <WeatherIcon
        icon={entry.condition.icon}
        size={16}
        className="shrink-0 text-accent-text"
        label={entry.condition.label[locale]}
      />
      <span className="font-medium tabular-nums text-foreground">
        {formatTemp(entry.maxTempC, unit)}° / {formatTemp(entry.minTempC, unit)}°
      </span>
      <span className="text-foreground/50">
        {entry.precipitationProbability}% {dict.weather.planner.rainChance}
      </span>
      {isToday && airQuality ? (
        <span className="ml-auto inline-flex items-center gap-1 text-foreground/60">
          <AqiDot level={airQuality.level} />
          {dict.weather.aqiIndex} {airQuality.usAqi}
        </span>
      ) : null}
    </div>
  );
}
