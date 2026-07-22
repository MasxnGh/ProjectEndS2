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

export const AQI_COLORS: Record<AqiLevel, { bg: string; fg: string }> = {
  good: { bg: "var(--color-secondary)", fg: "var(--color-secondary-foreground)" },
  moderate: { bg: "var(--color-accent)", fg: "var(--color-accent-foreground)" },
  "unhealthy-sensitive": { bg: "var(--color-tertiary)", fg: "var(--color-tertiary-foreground)" },
  unhealthy: { bg: "#8a3a2c", fg: "#f7f4ef" },
  "very-unhealthy": { bg: "var(--color-destructive)", fg: "var(--color-destructive-foreground)" },
  hazardous: { bg: "#5c1913", fg: "#f7f4ef" },
};
