import { openMeteoProvider } from "@/lib/weather/providers/open-meteo";
import type { WeatherProvider } from "@/lib/weather/types";

// Swap the active provider here to change data sources (e.g. OpenWeatherMap,
// WeatherAPI.com) without touching any route handler or UI code — every
// provider implements the same WeatherProvider interface.
export function getWeatherProvider(): WeatherProvider {
  return openMeteoProvider;
}

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 400;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryable(error: unknown) {
  if (!(error instanceof Error)) return false;
  return /\b(429|502|503|504)\b/.test(error.message);
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt === MAX_RETRIES || !isRetryable(err)) throw err;
      await sleep(BASE_DELAY_MS * 2 ** attempt);
    }
  }
  throw lastError;
}
