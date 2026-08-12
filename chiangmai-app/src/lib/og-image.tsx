import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const OG_SIZE = { width: 1200, height: 630 };

const CREAM = "#f3efe4";
const GOLD = "#c9a24b";
const INK = "#171613";

const THAI_PATTERN = /[฀-๿]/;

async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer | null> {
  if (!text) return null;
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${family}&text=${encodeURIComponent(text)}`;
    const css = await (await fetch(cssUrl)).text();
    const match = css.match(/src: url\(([^)]+)\) format\('(?:opentype|truetype)'\)/);
    if (!match) return null;
    const fontRes = await fetch(match[1]);
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch {
    return null;
  }
}

async function loadLocalPhoto(photoPath: string | undefined): Promise<string | undefined> {
  if (!photoPath) return undefined;
  try {
    const bytes = await readFile(join(process.cwd(), "public", photoPath.replace(/^\//, "")));
    return `data:image/jpeg;base64,${bytes.toString("base64")}`;
  } catch {
    return undefined;
  }
}

export async function renderOgImage({
  title,
  kicker,
  photoPath,
}: {
  title: string;
  kicker: string;
  photoPath: string | undefined;
}) {
  const needsThai = THAI_PATTERN.test(title) || THAI_PATTERN.test(kicker);

  // "Chiangmai Journey" is always plain ASCII, so this fetch reliably succeeds
  // and guarantees satori always has at least one usable font (it throws if the
  // fonts array ends up empty, which happened before when the title/kicker
  // was Thai text with zero coverage in the Latin-only Fraunces font).
  const [bgSrc, brandFont, displayFont] = await Promise.all([
    loadLocalPhoto(photoPath),
    loadGoogleFont("Fraunces:wght@600", "Chiangmai Journey"),
    needsThai
      ? loadGoogleFont("Noto+Serif+Thai:wght@600", `${title}${kicker}`)
      : loadGoogleFont("Fraunces:wght@600", `${title}${kicker}`),
  ]);

  const fonts: { name: string; data: ArrayBuffer; style: "normal"; weight: 600 }[] = [];
  if (brandFont) fonts.push({ name: "Brand", data: brandFont, style: "normal", weight: 600 });
  if (displayFont) fonts.push({ name: "Display", data: displayFont, style: "normal", weight: 600 });

  const displayFamily = fonts.some((f) => f.name === "Display") ? "Display" : "Brand";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: INK,
        }}
      >
        {bgSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- ImageResponse (satori) requires a plain <img>, not next/image
          <img
            src={bgSrc}
            alt=""
            width={OG_SIZE.width}
            height={OG_SIZE.height}
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            background:
              "linear-gradient(to top, rgba(23,22,19,0.92) 10%, rgba(23,22,19,0.35) 55%, rgba(23,22,19,0.5) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 48,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 20px",
            borderRadius: 999,
            background: "rgba(23,22,19,0.55)",
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              display: "flex",
              transform: "rotate(45deg)",
              border: `2px solid ${GOLD}`,
              borderRadius: 4,
            }}
          />
          <span style={{ fontFamily: "Brand", fontSize: 26, color: CREAM, letterSpacing: 1 }}>Chiangmai Journey</span>
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 60,
            left: 64,
            right: 64,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <span
            style={{
              fontFamily: displayFamily,
              display: "flex",
              alignSelf: "flex-start",
              padding: "6px 16px",
              borderRadius: 999,
              background: "rgba(23,22,19,0.72)",
              fontSize: 18,
              color: GOLD,
              letterSpacing: 3,
              textTransform: "uppercase",
            }}
          >
            {kicker}
          </span>
          <span
            style={{
              fontFamily: displayFamily,
              fontSize: 58,
              lineHeight: 1.15,
              color: CREAM,
              display: "flex",
              maxWidth: 1000,
            }}
          >
            {title}
          </span>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts,
    }
  );
}
