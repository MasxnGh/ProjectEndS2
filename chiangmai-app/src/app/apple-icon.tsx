import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

const INK = "#171613";
const GOLD = "#c9a24b";

export default function AppleIcon() {
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
            width: Math.round(size.width * 0.42),
            height: Math.round(size.height * 0.42),
            display: "flex",
            background: GOLD,
            transform: "rotate(45deg)",
            borderRadius: Math.round(size.width * 0.06),
          }}
        />
      </div>
    ),
    { ...size }
  );
}
