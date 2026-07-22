import type { AirQualityResponse, AqiLevel, DailyForecastEntry } from "@/lib/weather/types";

export function resolveDayDate(travelDate: string, dayNumber: number): string | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(travelDate);
  if (!match) return undefined;
  const [, y, m, d] = match;
  const utcMs = Date.UTC(Number(y), Number(m) - 1, Number(d) + (dayNumber - 1));
  return new Date(utcMs).toISOString().slice(0, 10);
}

export function findDailyForecast(
  daily: DailyForecastEntry[] | undefined,
  date: string | undefined
): DailyForecastEntry | undefined {
  if (!daily || !date) return undefined;
  return daily.find((d) => d.date === date);
}

export function isBadWeatherDay(entry: DailyForecastEntry | undefined): boolean {
  if (!entry) return false;
  return (
    entry.precipitationProbability >= 60 ||
    entry.condition.icon === "thunderstorm" ||
    entry.condition.icon === "rain-heavy"
  );
}

export function isBurningSeasonDate(date: string | undefined): boolean {
  if (!date) return false;
  const month = Number(date.slice(5, 7));
  return month >= 2 && month <= 4;
}

export type SuggestionKey = "badAir" | "rainy" | "hazySeason" | "hotMidday" | "goodAir" | "clearSunset";

const BAD_AQI_LEVELS = new Set<AqiLevel>(["unhealthy", "very-unhealthy", "hazardous"]);

export function pickDaySuggestion({
  date,
  entry,
  isToday,
  airQuality,
}: {
  date: string | undefined;
  entry: DailyForecastEntry | undefined;
  isToday: boolean;
  airQuality: AirQualityResponse | undefined;
}): SuggestionKey | undefined {
  if (isToday && airQuality && BAD_AQI_LEVELS.has(airQuality.level)) return "badAir";
  if (isBadWeatherDay(entry)) return "rainy";
  if (isBurningSeasonDate(date)) return "hazySeason";
  if (entry && entry.maxTempC >= 34) return "hotMidday";
  if (isToday && airQuality && airQuality.level === "good") return "goodAir";
  if (entry && entry.precipitationProbability <= 20 && entry.condition.icon.startsWith("clear")) {
    return "clearSunset";
  }
  return undefined;
}
