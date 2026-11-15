import type { AqiLevel } from "@/lib/weather/types";

export function getAqiLevel(usAqi: number): AqiLevel {
  if (usAqi <= 50) return "good";
  if (usAqi <= 100) return "moderate";
  if (usAqi <= 150) return "unhealthy-sensitive";
  if (usAqi <= 200) return "unhealthy";
  if (usAqi <= 300) return "very-unhealthy";
  return "hazardous";
}

export const AQI_LABELS: Record<AqiLevel, { en: string; th: string }> = {
  good: { en: "Good", th: "ดี" },
  moderate: { en: "Moderate", th: "ปานกลาง" },
  "unhealthy-sensitive": { en: "Unhealthy for sensitive groups", th: "ไม่ดีต่อกลุ่มเสี่ยง" },
  unhealthy: { en: "Unhealthy", th: "ไม่ดีต่อสุขภาพ" },
  "very-unhealthy": { en: "Very unhealthy", th: "ไม่ดีต่อสุขภาพมาก" },
  hazardous: { en: "Hazardous", th: "อันตราย" },
};
