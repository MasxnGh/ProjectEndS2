import type { NextRequest } from "next/server";
import { getSeasonalAverage } from "@/lib/weather/providers/open-meteo";
import { withRetry } from "@/lib/weather/providers";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const latParam = request.nextUrl.searchParams.get("lat");
  const lngParam = request.nextUrl.searchParams.get("lng");
  const date = request.nextUrl.searchParams.get("date");
  const lat = Number(latParam);
  const lng = Number(lngParam);

  if (!latParam || !lngParam || !Number.isFinite(lat) || !Number.isFinite(lng) || !date || !ISO_DATE_PATTERN.test(date)) {
    return Response.json({ error: "lat, lng, and date (YYYY-MM-DD) query params are required" }, { status: 400 });
  }

  try {
    const data = await withRetry(() => getSeasonalAverage(lat, lng, date));
    if (!data) {
      return Response.json({ error: "No historical records available for that date" }, { status: 502 });
    }
    return Response.json(data, {
      headers: { "Cache-Control": "public, s-maxage=2592000, stale-while-revalidate=5184000" },
    });
  } catch (err) {
    console.error("Seasonal average fetch failed", err);
    return Response.json({ error: "Seasonal average is temporarily unavailable" }, { status: 502 });
  }
}
