export type WeatherIconKey =
  | "clear-day"
  | "clear-night"
  | "partly-cloudy-day"
  | "partly-cloudy-night"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "rain-heavy"
  | "thunderstorm"
  | "snow";

export interface WeatherCondition {
  code: number;
  icon: WeatherIconKey;
  label: { en: string; th: string };
}

export interface CurrentWeather {
  temperatureC: number;
  apparentTemperatureC: number;
  humidity: number;
  windSpeedKph: number;
  isDay: boolean;
  condition: WeatherCondition;
}

export interface DailyForecastEntry {
  date: string;
  condition: WeatherCondition;
  maxTempC: number;
  minTempC: number;
  precipitationProbability: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherResponse {
  fetchedAt: string;
  current: CurrentWeather;
  daily: DailyForecastEntry[];
}

export type AqiLevel =
  | "good"
  | "moderate"
  | "unhealthy-sensitive"
  | "unhealthy"
  | "very-unhealthy"
  | "hazardous";

export interface AirQualityResponse {
  fetchedAt: string;
  pm2_5: number;
  pm10: number;
  usAqi: number;
  level: AqiLevel;
}

export interface WeatherProvider {
  getWeather(lat: number, lng: number): Promise<WeatherResponse>;
  getAirQuality(lat: number, lng: number): Promise<AirQualityResponse>;
}
