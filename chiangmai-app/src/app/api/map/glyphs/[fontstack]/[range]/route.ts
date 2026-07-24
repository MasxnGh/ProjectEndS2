import { getMapTilerKey, MAPTILER_FONTS_URL } from "@/lib/map/config";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fontstack: string; range: string }> }
) {
  const key = getMapTilerKey();
  if (!key) {
    return new Response(null, { status: 503 });
  }

  const { fontstack, range } = await params;

  try {
    const upstream = await fetch(
      `${MAPTILER_FONTS_URL}/${encodeURIComponent(fontstack)}/${range}?key=${key}`
    );
    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }
    const body = await upstream.arrayBuffer();
    return new Response(body, {
      headers: {
        "Content-Type": "application/x-protobuf",
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
      },
    });
  } catch (err) {
    console.error("Map glyph proxy failed", err);
    return new Response(null, { status: 502 });
  }
}
