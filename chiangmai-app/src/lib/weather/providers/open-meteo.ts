import { getWeatherCondition } from "@/lib/weather/wmo-codes";
import { getAqiLevel } from "@/lib/weather/aqi";
import type {
  AirQualityResponse,
  SeasonalAverageResponse,
  WeatherProvider,
  WeatherResponse,
} from "@/lib/weather/types";

const WEATHER_BASE = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";
const ARCHIVE_BASE = "https://archive-api.open-meteo.com/v1/archive";
const REVALIDATE_SECONDS = 900;
/** Historical records don't change, so cache aggressively. */
const ARCHIVE_REVALIDATE_SECONDS = 60 * 60 * 24 * 30;
const SEASONAL_SAMPLE_YEARS_BACK = [1, 2, 3];

interface OpenMeteoWeatherRaw {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    is_day: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

interface OpenMeteoAirQualityRaw {
  current: {
    pm2_5: number;
    pm10: number;
    us_aqi: number;
  };
}

interface OpenMeteoArchiveRaw {
  daily: {
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_sum: (number | null)[];
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } });
  if (!res.ok) {
    throw new Error(`Upstream request failed (${res.status})`);
  }
  return res.json();
}

export const openMeteoProvider: WeatherProvider = {
  async getWeather(lat, lng) {
    const url = new URL(WEATHER_BASE);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set(
      "current",
      "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day"
    );
    url.searchParams.set(
      "daily",
      "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset"
    );
    url.searchParams.set("timezone", "Asia/Bangkok");
    // 16 days is Open-Meteo's actual daily-forecast limit — a trip date
    // beyond that falls back to getSeasonalAverage() (historical archive)
    // instead of a forecast that doesn't exist yet.
    url.searchParams.set("forecast_days", "16");

    const raw = await fetchJson<OpenMeteoWeatherRaw>(url.toString());
    const isDay = raw.current.is_day === 1;

    const response: WeatherResponse = {
      fetchedAt: new Date().toISOString(),
      current: {
        temperatureC: raw.current.temperature_2m,
        apparentTemperatureC: raw.current.apparent_temperature,
        humidity: raw.current.relative_humidity_2m,
        windSpeedKph: raw.current.wind_speed_10m,
        isDay,
        condition: getWeatherCondition(raw.current.weather_code, isDay),
      },
      daily: raw.daily.time.map((date, i) => ({
        date,
        condition: getWeatherCondition(raw.daily.weather_code[i], true),
        maxTempC: raw.daily.temperature_2m_max[i],
        minTempC: raw.daily.temperature_2m_min[i],
        precipitationProbability: raw.daily.precipitation_probability_max[i],
        sunrise: raw.daily.sunrise[i],
        sunset: raw.daily.sunset[i],
      })),
    };

    return response;
  },

  async getAirQuality(lat, lng) {
    const url = new URL(AIR_QUALITY_BASE);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lng));
    url.searchParams.set("current", "pm2_5,pm10,us_aqi");
    url.searchParams.set("timezone", "Asia/Bangkok");

    const raw = await fetchJson<OpenMeteoAirQualityRaw>(url.toString());
    const usAqi = Math.round(raw.current.us_aqi);

    const response: AirQualityResponse = {
      fetchedAt: new Date().toISOString(),
      pm2_5: raw.current.pm2_5,
      pm10: raw.current.pm10,
      usAqi,
      level: getAqiLevel(usAqi),
    };

    return response;
  },
};

/**
 * Historical average for one calendar date, sampled from the same
 * month/day across a few recent past years via Open-Meteo's free Archive
 * API — used when a trip day falls beyond getWeather's 16-day forecast
 * window. Genuinely measured records, not a guess; returns null only when
 * every sample year's request failed (e.g. a Feb 29 target date lining up
 * with non-leap sample years, or a transient outage).
 */
export async function getSeasonalAverage(
  lat: number,
  lng: number,
  targetIsoDate: string
): Promise<SeasonalAverageResponse | null> {
  const [, month, day] = targetIsoDate.split("-");
  const currentYear = new Date().getUTCFullYear();
  const sampleYears = SEASONAL_SAMPLE_YEARS_BACK.map((yearsBack) => currentYear - yearsBack);

  const samples = await Promise.all(
    sampleYears.map(async (year) => {
      const sampleDate = `${year}-${month}-${day}`;
      const url = new URL(ARCHIVE_BASE);
      url.searchParams.set("latitude", String(lat));
      url.searchParams.set("longitude", String(lng));
      url.searchParams.set("start_date", sampleDate);
      url.searchParams.set("end_date", sampleDate);
      url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
      url.searchParams.set("timezone", "Asia/Bangkok");

      try {
        const res = await fetch(url.toString(), { next: { revalidate: ARCHIVE_REVALIDATE_SECONDS } });
        if (!res.ok) return null;
        const raw: OpenMeteoArchiveRaw = await res.json();
        const max = raw.daily.temperature_2m_max[0];
        const min = raw.daily.temperature_2m_min[0];
        if (max == null || min == null) return null;
        return { year, max, min, precip: raw.daily.precipitation_sum[0] ?? 0 };
      } catch {
        return null;
      }
    })
  );

  const valid = samples.filter((s): s is NonNullable<typeof s> => s !== null);
  if (valid.length === 0) return null;

  const average = (pick: (s: (typeof valid)[number]) => number) =>
    valid.reduce((sum, s) => sum + pick(s), 0) / valid.length;

  return {
    isoDate: targetIsoDate,
    sampledYears: valid.map((s) => s.year),
    maxTempC: average((s) => s.max),
    minTempC: average((s) => s.min),
    precipitationMm: average((s) => s.precip),
  };
}
