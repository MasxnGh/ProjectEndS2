import type { NextRequest } from "next/server";
import { getWeatherProvider, withRetry } from "@/lib/weather/providers";

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!latParam || !lngParam || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "lat and lng query params are required" }, { status: 400 });
  }

  try {
    const data = await withRetry(() => getWeatherProvider().getWeather(lat, lng));
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" },
    });
  } catch (err) {
    console.error("Weather fetch failed", err);
    return Response.json({ error: "Weather data is temporarily unavailable" }, { status: 502 });
  }
}
