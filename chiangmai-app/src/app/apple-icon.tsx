import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/**
 * The home-screen icon: the plan of the old city, matching the site's mark.
 *
 * It was a gold diamond, which belonged to the palette this site no longer uses
 * and to no place in particular. The moat and wall are the same shape the
 * header, the landing map and the zone filter all draw, so an icon on someone's
 * phone is recognisably the same thing they were reading.
 */
const INK = "#10171e";
const CELADON = "#8fbfa8";
const MOAT = "#516470";

export default function AppleIcon() {
  const moat = Math.round(size.width * 0.62);
  const wall = Math.round(size.width * 0.44);

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
            border: `4px solid ${MOAT}`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              width: wall,
              height: wall,
              display: "flex",
              border: `8px solid ${CELADON}`,
              borderRadius: 4,
            }}
          />
        </div>
      </div>
    ),
    { ...size }
  );
}
