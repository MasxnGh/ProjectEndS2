import { ImageResponse } from "next/og";

export const runtime = "nodejs";

const INK = "#171613";
const GOLD = "#c9a24b";

const VALID_SIZES = new Set(["192", "512"]);

export async function GET(_request: Request, context: { params: Promise<{ size: string }> }) {
  const { size } = await context.params;
  if (!VALID_SIZES.has(size)) {
    return new Response(null, { status: 404 });
  }
  const px = Number(size);
  const diamond = Math.round(px * 0.42);

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
            width: diamond,
            height: diamond,
            display: "flex",
            background: GOLD,
            transform: "rotate(45deg)",
            borderRadius: Math.round(px * 0.06),
          }}
        />
      </div>
    ),
    { width: px, height: px }
  );
}
