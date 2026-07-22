import type { WeatherCondition, WeatherIconKey } from "@/lib/weather/types";

interface WmoGroup {
  icon: WeatherIconKey;
  nightIcon?: WeatherIconKey;
  en: string;
  th: string;
}

// WMO weather interpretation codes (used by Open-Meteo), grouped.
// https://open-meteo.com/en/docs — "WMO Weather interpretation codes"
const WMO_GROUPS: Record<number, WmoGroup> = {
  0: { icon: "clear-day", nightIcon: "clear-night", en: "Clear sky", th: "ท้องฟ้าแจ่มใส" },
  1: { icon: "clear-day", nightIcon: "clear-night", en: "Mostly clear", th: "ท้องฟ้าโปร่ง" },
  2: { icon: "partly-cloudy-day", nightIcon: "partly-cloudy-night", en: "Partly cloudy", th: "มีเมฆบางส่วน" },
  3: { icon: "cloudy", en: "Overcast", th: "เมฆมาก" },
  45: { icon: "fog", en: "Fog", th: "หมอก" },
  48: { icon: "fog", en: "Fog with frost", th: "หมอกน้ำแข็ง" },
  51: { icon: "drizzle", en: "Light drizzle", th: "ฝนปรอยเบา" },
  53: { icon: "drizzle", en: "Drizzle", th: "ฝนปรอย" },
  55: { icon: "drizzle", en: "Dense drizzle", th: "ฝนปรอยหนัก" },
  56: { icon: "drizzle", en: "Freezing drizzle", th: "ฝนปรอยเยือกแข็ง" },
  57: { icon: "drizzle", en: "Dense freezing drizzle", th: "ฝนปรอยเยือกแข็งหนัก" },
  61: { icon: "rain", en: "Light rain", th: "ฝนตกเบา" },
  63: { icon: "rain", en: "Rain", th: "ฝนตก" },
  65: { icon: "rain-heavy", en: "Heavy rain", th: "ฝนตกหนัก" },
  66: { icon: "rain", en: "Freezing rain", th: "ฝนเยือกแข็ง" },
  67: { icon: "rain-heavy", en: "Heavy freezing rain", th: "ฝนเยือกแข็งหนัก" },
  71: { icon: "snow", en: "Light snow", th: "หิมะตกเบา" },
  73: { icon: "snow", en: "Snow", th: "หิมะตก" },
  75: { icon: "snow", en: "Heavy snow", th: "หิมะตกหนัก" },
  77: { icon: "snow", en: "Snow grains", th: "เกล็ดหิมะ" },
  80: { icon: "rain", en: "Light showers", th: "ฝนซู่เบา" },
  81: { icon: "rain", en: "Showers", th: "ฝนซู่" },
  82: { icon: "rain-heavy", en: "Violent showers", th: "ฝนซู่หนักมาก" },
  85: { icon: "snow", en: "Snow showers", th: "หิมะซู่" },
  86: { icon: "snow", en: "Heavy snow showers", th: "หิมะซู่หนัก" },
  95: { icon: "thunderstorm", en: "Thunderstorm", th: "พายุฝนฟ้าคะนอง" },
  96: { icon: "thunderstorm", en: "Thunderstorm with hail", th: "พายุฝนฟ้าคะนองมีลูกเห็บ" },
  99: { icon: "thunderstorm", en: "Severe thunderstorm with hail", th: "พายุฝนฟ้าคะนองรุนแรงมีลูกเห็บ" },
};

const FALLBACK: WmoGroup = { icon: "cloudy", en: "Overcast", th: "เมฆมาก" };

export function getWeatherCondition(code: number, isDay: boolean): WeatherCondition {
  const group = WMO_GROUPS[code] ?? FALLBACK;
  const icon = !isDay && group.nightIcon ? group.nightIcon : group.icon;
  return { code, icon, label: { en: group.en, th: group.th } };
}

export function isRainyCode(code: number): boolean {
  return [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(code);
}
