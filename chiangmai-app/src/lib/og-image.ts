import { join } from "node:path";
import sharp from "sharp";
import type { LucideIcon } from "lucide-react";
import type { Dictionary, Locale } from "@/i18n";
import { getPlacePhoto } from "@/data/photo-manifest";
import { creditSourceName, getPhotoCredit } from "@/data/photo-credits";
import { fill } from "@/components/brand/place-text";
import { thaiNamePieces } from "@/components/brand/thai-name";
import { MARK_SPARKLE, MARK_STROKES } from "@/components/brand/mark";
import { iconNode } from "./icon-node";

/*
 * The share card, in the brand board's colours (DESIGN.md).
 *
 * A card with a photo is the home hero in miniature: the photo in the shared
 * warm grade, the deep-green scrim from the left, paper words, a sand chip and
 * the credit on its own scrim. A card without one is the site's no-photo tile:
 * sand, the category's icon in a ring and the faint ridge along the foot.
 *
 * Drawn with sharp rather than next/og: satori places Thai marks without the
 * font's mark positioning, so "ที่" came out as "ที" and "สิ่ง" as "สีง". sharp
 * sets text with Pango and HarfBuzz, which stack them as the browser does. The
 * Prompt files in assets/fonts are the ones the site loads from Google Fonts.
 * Thai is never letter-spaced.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_TYPE = "image/jpeg";

const W = OG_SIZE.width;
const H = OG_SIZE.height;

const GREEN = "#1d3835";
const DEEP = "#142a27";
const SAND = "#efd3b1";
const SUNSET = "#eb9d56";
const PAPER = "#f9f3f0";

const PAD = 64;
const COLUMN = 620;
const FOOT = 72;

/** The ridge from brand.css `.cmj-ridge`, on its 200×60 grid. */
const RIDGE = "M0 60 L0 44 L34 22 L58 36 L92 8 L128 34 L150 24 L200 46 L200 60 Z";

/** The site's warm grade (brand.css `.cmj-grade-warm`): 10% sepia, a little more colour. */
const WARM: [[number, number, number], [number, number, number], [number, number, number]] = [
  [0.9393, 0.0769, 0.0189],
  [0.0349, 0.9686, 0.0168],
  [0.0272, 0.0534, 0.9131],
];

// Written out in full so the build's file tracing sees each path.
const FONTS = {
  400: { family: "Prompt", file: join(process.cwd(), "assets/fonts/Prompt-Regular.ttf") },
  500: { family: "Prompt Medium", file: join(process.cwd(), "assets/fonts/Prompt-Medium.ttf") },
  600: { family: "Prompt SemiBold", file: join(process.cwd(), "assets/fonts/Prompt-SemiBold.ttf") },
} as const;

type Weight = keyof typeof FONTS;

/** An image of text, cropped by sharp to the ink, so gaps between blocks are measured ink to ink. */
type Block = { input: Buffer; width: number; height: number };

function markup(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Pango markup for `text` in one weight and size (px at the 72 dpi used here). */
function run(text: string, weight: Weight, size: number): string {
  return `<span font_desc="${FONTS[weight].family}, ${size}">${markup(text)}</span>`;
}

/**
 * sharp registers a font file the first time a text call names it. Registering
 * all three up front lets one block mix weights (the wordmark) whatever order
 * the cards' text calls finish in.
 */
let registered: Promise<unknown> | null = null;
function registerFonts() {
  registered ??= (async () => {
    for (const { file } of Object.values(FONTS)) {
      await sharp({ text: { text: "a", fontfile: file, dpi: 72 } }).png().toBuffer();
    }
  })();
  return registered;
}

/**
 * A block of text as a transparent image, wrapped to `width`. `lineHeight` is
 * a multiple of the size: Pango here takes line height only in absolute units
 * (1/1024 pt), and Prompt's own is about 1.54, too open for a title.
 */
async function setText(
  text: string,
  {
    size,
    weight,
    color,
    width,
    lineHeight,
    align = "left",
    raw = false,
  }: {
    size: number;
    weight: Weight;
    color: string;
    width: number;
    lineHeight?: number;
    align?: "left" | "right";
    /** `text` is already Pango markup. */
    raw?: boolean;
  },
): Promise<Block> {
  await registerFonts();
  const leading = lineHeight ? ` line_height="${Math.round(size * lineHeight * 1024)}"` : "";
  const span = `<span foreground="${color}"${leading}>${raw ? text : markup(text)}</span>`;
  const { data, info } = await sharp({
    text: {
      text: span,
      // "Family, size": the comma keeps "SemiBold" part of the family name.
      font: `${FONTS[weight].family}, ${size}`,
      fontfile: FONTS[weight].file,
      width,
      dpi: 72,
      rgba: true,
      wrap: "word",
      align,
    },
  })
    .png()
    .toBuffer({ resolveWithObject: true });
  return { input: data, width: info.width, height: info.height };
}

const THAI = /[฀-๿]/;
/** Thai vowel and tone marks sit on a consonant and take no width of their own. */
const THAI_MARKS = /[ัิ-ฺ็-๎]/gu;
const visible = (s: string) => s.replace(THAI_MARKS, "").length;
const thaiWords = new Intl.Segmenter("th", { granularity: "word" });

/**
 * Marks where Thai may break with zero-width spaces, since Pango here has no
 * Thai dictionary. A name is split the way <ThaiName> splits it on the site;
 * a piece still longer than `longest` letters falls back to word breaks.
 */
function breakable(text: string, longest = 12): string {
  if (!THAI.test(text)) return text;
  return thaiNamePieces(text)
    .flatMap((piece) =>
      THAI.test(piece) && visible(piece) > longest ? [...thaiWords.segment(piece)].map((s) => s.segment) : [piece],
    )
    .join("​");
}

/** Longer names step down in size so they keep to two or three lines. */
function titleSize(title: string): number {
  const width = visible(title);
  return width <= 14 ? 80 : width <= 22 ? 68 : width <= 32 ? 58 : 52;
}

/** The photo cropped to the card around `focus` (0–1 across and down), in the warm grade. */
async function photoBase(path: string, focus: { x: number; y: number }): Promise<Buffer | null> {
  try {
    const file = join(process.cwd(), "public", path.replace(/^\//, ""));
    const { width = W, height = H } = await sharp(file).metadata();
    const scale = Math.max(W / width, H / height);
    const rw = Math.ceil(width * scale);
    const rh = Math.ceil(height * scale);
    return await sharp(file)
      .rotate()
      .resize(rw, rh)
      .extract({ left: Math.round((rw - W) * focus.x), top: Math.round((rh - H) * focus.y), width: W, height: H })
      .recomb(WARM)
      .modulate({ saturation: 1.05 })
      .png({ compressionLevel: 0 }) // lossless between steps; the card is encoded once
      .toBuffer();
  } catch {
    return null;
  }
}

function markSvg(x: number, y: number, width: number, color: string): string {
  const strokes = MARK_STROKES.map(
    ({ d, width: w }) =>
      `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`,
  ).join("");
  return `<g transform="translate(${x} ${y}) scale(${width / 64})"><path d="${MARK_SPARKLE}" fill="${SUNSET}"/>${strokes}</g>`;
}

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function iconSvg(icon: LucideIcon, x: number, y: number, size: number, color: string, stroke: number): string {
  const node = iconNode(icon);
  if (!node) return "";
  const parts = node
    .map(([tag, attrs]) => {
      const list = Object.entries(attrs)
        .filter(([name]) => name !== "key")
        .map(([name, value]) => `${kebab(name)}="${String(value).replace(/"/g, "&quot;")}"`)
        .join(" ");
      return `<${tag} ${list}/>`;
    })
    .join("");
  return `<g transform="translate(${x} ${y}) scale(${size / 24})" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">${parts}</g>`;
}

export type OgCard = {
  locale: Locale;
  dict: Dictionary;
  /** The page's name. On the home card the wordmark stands in its place. */
  title: string;
  home?: boolean;
  /** What kind of page this is: the category, or "Guides". */
  kicker?: { label: string; icon: LucideIcon };
  /** One line under the title: where the place is, what the site is. */
  line?: string;
  /** A photo-manifest slug. Without a credited photo the card is the sand tile. */
  photo?: string | null;
  /** Where the photo isn't of the place in the title (home, a guide), the place it shows, for the credit. */
  photoOf?: string;
  /** The icon in the sand tile's ring. */
  art: LucideIcon;
  /** Where to crop the photo, 0–1 across and down. Centre by default. */
  focus?: { x: number; y: number };
};

/**
 * The card as a response for an opengraph-image route. Next 16 accepts only a
 * Response from these routes, whatever its docs say about buffers; the cache
 * header is the one next/og's ImageResponse sent.
 */
export async function renderOgImage(card: OgCard): Promise<Response> {
  const jpeg = await drawOgCard(card);
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": OG_TYPE,
      "Cache-Control":
        process.env.NODE_ENV === "development" ? "no-cache, no-store" : "public, immutable, no-transform, max-age=31536000",
    },
  });
}

/** The card as JPEG bytes. */
export async function drawOgCard(card: OgCard): Promise<Buffer> {
  const { dict, title, home, kicker, line, photo, photoOf, art, focus = { x: 0.5, y: 0.5 } } = card;

  const credit = photo ? getPhotoCredit(photo) : undefined;
  const path = photo ? getPlacePhoto(photo) : undefined;
  // A credit is the condition for showing a photo at all.
  const base = credit && path ? await photoBase(path, focus) : null;
  const onPhoto = Boolean(base);
  const ink = onPhoto ? PAPER : GREEN;

  // Pango markup. The licence and the source stay whole ("CC BY-SA 4.0" broke
  // at its hyphen); the place and the photographer's name may wrap.
  const whole = (s: string) => `<span allow_breaks="false">${markup(s)}</span>`;
  const creditLine =
    onPhoto && credit
      ? `${photoOf ? `${markup(photoOf)} — ` : ""}${fill(markup(dict.ui.photoCredit), {
          artist: markup(credit.artist),
          licence: whole(credit.licence),
        })} · ${whole(creditSourceName(credit.sourceUrl))}`
      : "";

  const [wordmark, label, name, sub, by] = await Promise.all([
    // The site's wordmark: two lines, the second a weight lighter.
    home
      ? null
      : setText(`${run("Chiangmai", 600, 24)}\n${run("Journey", 500, 24)}`, {
          size: 24,
          weight: 600,
          color: ink,
          width: 300,
          lineHeight: 1.05,
          raw: true,
        }),
    kicker ? setText(kicker.label, { size: 23, weight: 500, color: onPhoto ? GREEN : PAPER, width: 500 }) : null,
    home
      ? setText("Chiangmai\nJourney", { size: 108, weight: 600, color: ink, width: 900, lineHeight: 1.0 })
      : setText(breakable(title), { size: titleSize(title), weight: 600, color: ink, width: COLUMN, lineHeight: 1.18 }),
    line ? setText(breakable(line, 30), { size: 28, weight: 400, color: ink, width: COLUMN, lineHeight: 1.45 }) : null,
    creditLine
      ? setText(creditLine, { size: 17, weight: 400, color: PAPER, width: 440, lineHeight: 1.45, align: "right", raw: true })
      : null,
  ]);

  // Stacked from the foot up, ink to ink: line, title, chip.
  const layers: sharp.OverlayOptions[] = [];
  let y = H - FOOT;
  if (sub) {
    y -= sub.height;
    layers.push({ input: sub.input, left: PAD, top: Math.round(y) });
    y -= home ? 26 : 18;
  }
  y -= name.height;
  layers.push({ input: name.input, left: PAD - (home ? 4 : 2), top: Math.round(y) });

  const svg: string[] = [];
  if (onPhoto) {
    svg.push(
      `<defs><linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">` +
        `<stop offset="0" stop-color="${DEEP}" stop-opacity="0.94"/>` +
        `<stop offset="0.44" stop-color="${DEEP}" stop-opacity="0.86"/>` +
        `<stop offset="0.64" stop-color="${DEEP}" stop-opacity="0.5"/>` +
        `<stop offset="0.86" stop-color="${DEEP}" stop-opacity="0"/>` +
        `</linearGradient></defs>`,
      `<rect width="${W}" height="${H}" fill="url(#scrim)"/>`,
    );
  } else {
    svg.push(
      `<svg x="0" y="${H - 250}" width="${W}" height="250" viewBox="0 0 200 60" preserveAspectRatio="none"><path d="${RIDGE}" fill="${GREEN}" fill-opacity="0.07"/></svg>`,
      `<circle cx="${W - 260}" cy="${H / 2}" r="150" fill="#fffcfa" fill-opacity="0.7"/>`,
      iconSvg(art, W - 260 - 66, H / 2 - 66, 132, GREEN, 1.5),
    );
  }

  if (label && kicker) {
    const chipH = 46;
    const chipW = 16 + 26 + 10 + label.width + 20;
    y -= 22 + chipH;
    svg.push(
      `<rect x="${PAD}" y="${y}" width="${chipW}" height="${chipH}" rx="${chipH / 2}" fill="${onPhoto ? SAND : GREEN}"/>`,
      iconSvg(kicker.icon, PAD + 16, y + (chipH - 26) / 2, 26, onPhoto ? GREEN : PAPER, 1.75),
    );
    layers.push({ input: label.input, left: PAD + 16 + 26 + 10, top: Math.round(y + (chipH - label.height) / 2) });
  }

  // The logo, top left. On the home card the wordmark is the title, so the mark stands alone.
  if (home) {
    svg.push(markSvg(PAD, 56, 92, ink));
  } else if (wordmark) {
    const markH = (58 * 44) / 64;
    svg.push(markSvg(PAD, 54, 58, ink));
    layers.push({ input: wordmark.input, left: PAD + 58 + 14, top: Math.round(54 + markH / 2 - wordmark.height / 2) });
  }

  // The credit, bottom right, on its own scrim as on the home hero.
  if (by) {
    const px = 14;
    const py = 9;
    const right = W - 28;
    const bottom = H - 28;
    svg.push(
      `<rect x="${right - by.width - px * 2}" y="${bottom - by.height - py * 2}" width="${by.width + px * 2}" height="${by.height + py * 2}" rx="10" fill="${DEEP}" fill-opacity="0.7"/>`,
    );
    layers.push({ input: by.input, left: right - px - by.width, top: bottom - py - by.height });
  }

  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${svg.join("")}</svg>`);
  const canvas = base
    ? sharp(base)
    : sharp({ create: { width: W, height: H, channels: 3, background: SAND } });

  return canvas
    .composite([{ input: overlay, left: 0, top: 0 }, ...layers])
    .jpeg({ quality: 86, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toBuffer();
}
