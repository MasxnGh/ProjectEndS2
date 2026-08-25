import { ImageResponse } from "next/og";

export const runtime = "nodejs";

/** Matches apple-icon.tsx and the site's mark: the plan of the old city. */
const INK = "#10171e";
const CELADON = "#8fbfa8";
const MOAT = "#516470";

const VALID_SIZES = new Set(["192", "512"]);

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size } = await context.params;
  if (!VALID_SIZES.has(size)) {
    return new Response(null, { status: 404 });
  }
  const px = Number(size);
  const moat = Math.round(px * 0.62);
  const wall = Math.round(px * 0.44);
  const stroke = Math.max(2, Math.round(px * 0.022));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
        }}
      >
        <div
          style={{
            width: moat,
            height: moat,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: `${stroke}px solid ${MOAT}`,
            borderRadius: Math.round(px * 0.045),
          }}
        >
          <div
            style={{
              width: wall,
              height: wall,
              display: "flex",
              border: `${stroke * 2}px solid ${CELADON}`,
              borderRadius: Math.round(px * 0.022),
            }}
          />
        </div>
      </div>
    ),
    { width: px, height: px }
  );
}
