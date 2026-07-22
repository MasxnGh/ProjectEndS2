import { getWeatherCondition } from "@/lib/weather/wmo-codes";
import { getAqiLevel } from "@/lib/weather/aqi";
import type { AirQualityResponse, WeatherProvider, WeatherResponse } from "@/lib/weather/types";

const WEATHER_BASE = "https://api.open-meteo.com/v1/forecast";
const AIR_QUALITY_BASE = "https://air-quality-api.open-meteo.com/v1/air-quality";
const REVALIDATE_SECONDS = 900;

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
    url.searchParams.set("forecast_days", "7");

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
