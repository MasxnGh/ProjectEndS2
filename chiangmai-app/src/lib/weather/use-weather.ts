"use client";

import useSWR from "swr";
import type { AirQualityResponse, WeatherResponse } from "@/lib/weather/types";

const REFRESH_MS = 15 * 60 * 1000;

async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${res.status})`);
  }
  return res.json();
}

export function useWeather(lat: number, lng: number) {
  return useSWR<WeatherResponse>(`/api/weather?lat=${lat}&lng=${lng}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: REFRESH_MS,
    dedupingInterval: 60_000,
  });
}

export function useAirQuality(lat: number, lng: number) {
  return useSWR<AirQualityResponse>(`/api/air-quality?lat=${lat}&lng=${lng}`, fetcher, {
    revalidateOnFocus: false,
    refreshInterval: REFRESH_MS,
    dedupingInterval: 60_000,
  });
}

export type WeatherStatus = "loading" | "success" | "error" | "stale";

export interface WeatherBundle {
  weather: WeatherResponse | undefined;
  airQuality: AirQualityResponse | undefined;
  status: WeatherStatus;
  errorMessage: string | null;
  fetchedAt: string | undefined;
  retry: () => void;
}

export function useWeatherBundle(lat: number, lng: number): WeatherBundle {
  const weatherQuery = useWeather(lat, lng);
  const airQuery = useAirQuality(lat, lng);

  const isLoading = weatherQuery.isLoading || airQuery.isLoading;
  const isValidating = weatherQuery.isValidating || airQuery.isValidating;
  const error = weatherQuery.error ?? airQuery.error;
  const hasData = Boolean(weatherQuery.data) && Boolean(airQuery.data);

  let status: WeatherStatus;
  if (isLoading) status = "loading";
  else if (error && !hasData) status = "error";
  else if (error && hasData) status = "stale";
  else if (isValidating) status = "stale";
  else status = "success";

  function retry() {
    weatherQuery.mutate();
    airQuery.mutate();
  }

  return {
    weather: weatherQuery.data,
    airQuality: airQuery.data,
    status,
    errorMessage: error instanceof Error ? error.message : null,
    fetchedAt: weatherQuery.data?.fetchedAt,
    retry,
  };
}
