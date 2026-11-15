"use client";

import { CloudRain, History } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { formatTemp, useUnitStore } from "@/lib/weather/unit-store";
import { pickDaySuggestion, type SuggestionKey } from "@/lib/weather/day-forecast";
import { useSeasonalAverage } from "@/lib/weather/use-weather";
import type { AirQualityResponse, DailyForecastEntry } from "@/lib/weather/types";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { AqiDot } from "@/components/brand/aqi";
import { Badge } from "@/components/brand/badge";
import { ICON_STROKE } from "@/components/brand/icons";
import { cx } from "@/components/brand/cx";

const CAUTION: SuggestionKey[] = ["badAir", "rainy"];

/**
 * A hook, not a component: it hands back two pieces for different spots in
 * the day head. The day's weather as badges beside the sun times: the forecast when the day
 * is within reach of one, otherwise the past years' average for that date
 * (and says so), plus today's air when the day is today. Then the one line of
 * advice the old column gave. Same sources and the same picking rules.
 */
export function useDayWeather({
  date,
  entry,
  isToday,
  airQuality,
}: {
  date: string | null;
  entry: DailyForecastEntry | undefined;
  isToday: boolean;
  airQuality: AirQualityResponse | undefined;
}) {
  const { locale, dict } = useLocale();
  const { unit } = useUnitStore();
  const t = dict.weather.planner;
  const needsAverage = Boolean(date) && !entry;
  const { data: average } = useSeasonalAverage(CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng, needsAverage ? date : null);
  const suggestion = pickDaySuggestion({ date: date ?? undefined, entry, isToday, airQuality });

  const badges = (
    <>
      {entry ? (
        <>
          <Badge icon={<WeatherIcon icon={entry.condition.icon} size={16} className="text-brand" label={entry.condition.label[locale]} />}>
            <span className="tabular-nums">
              {formatTemp(entry.maxTempC, unit)}° / {formatTemp(entry.minTempC, unit)}°
            </span>
          </Badge>
          <Badge icon={<CloudRain aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />}>
            <span className="tabular-nums">
              {entry.precipitationProbability}% {t.rainChance}
            </span>
          </Badge>
        </>
      ) : average ? (
        <Badge icon={<History aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-brand" />}>
          <span className="tabular-nums">
            {formatTemp(average.maxTempC, unit)}° / {formatTemp(average.minTempC, unit)}°
          </span>
          <span className="font-normal text-ink-soft">
            {t.seasonalAverage.label} · {t.seasonalAverage.description.replace("{years}", String(average.sampledYears.length))}
          </span>
        </Badge>
      ) : null}
      {isToday && airQuality ? (
        <Badge icon={<AqiDot level={airQuality.level} />}>
          <span className="tabular-nums">
            {dict.weather.aqiIndex} {airQuality.usAqi}
          </span>
        </Badge>
      ) : null}
    </>
  );

  return { badges, advice: suggestion ? <Advice suggestion={suggestion} /> : null };
}

function Advice({ suggestion }: { suggestion: SuggestionKey }) {
  const { dict } = useLocale();
  return (
    <p
      className={cx(
        "rounded-md px-4 py-3 text-small text-pretty text-ink",
        CAUTION.includes(suggestion) ? "bg-[color-mix(in_oklab,var(--cmj-sunset)_22%,var(--cmj-panel))]" : "bg-leaf-fill",
      )}
    >
      {dict.weather.planner.suggestions[suggestion]}
    </p>
  );
}
