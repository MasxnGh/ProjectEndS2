import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { BookOpen } from "lucide-react";
import { getDictionary } from "@/i18n";
import { categoryIcon } from "@/components/brand/icons";
import { OG_SIZE, drawOgCard } from "./og-image";

const th = getDictionary("th");

async function shape(buffer: Buffer) {
  const { format, width, height } = await sharp(buffer).metadata();
  return { format, width, height };
}

describe("drawOgCard", () => {
  it("draws a place with a credited photo as a 1200×630 JPEG", async () => {
    const card = await drawOgCard({
      locale: "th",
      dict: th,
      title: "วัดเจดีย์หลวง",
      kicker: { label: th.common.categories.temple, icon: categoryIcon.temple },
      line: "เมืองเก่า",
      photo: "wat-chedi-luang",
      art: categoryIcon.temple,
    });
    expect(await shape(card)).toEqual({ format: "jpeg", ...OG_SIZE });
  });

  it("draws the sand card when there is no photo, with a long Thai name", async () => {
    const card = await drawOgCard({
      locale: "th",
      dict: th,
      title: "พิพิธภัณฑ์แมลงโลกและสิ่งมหัศจรรย์ธรรมชาติ",
      kicker: { label: th.common.categories.museum, icon: categoryIcon.museum },
      art: categoryIcon.museum,
    });
    expect(await shape(card)).toEqual({ format: "jpeg", ...OG_SIZE });
    // Sand, not a photo: the top right corner is the board's Lanna Sand.
    const { data } = await sharp(card).extract({ left: 1150, top: 10, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    const [r, g, b] = data;
    expect(Math.abs(r - 0xef) + Math.abs(g - 0xd3) + Math.abs(b - 0xb1)).toBeLessThan(12);
  });

  it("falls back to the sand card for a photo slug with no credit", async () => {
    const card = await drawOgCard({ locale: "en", dict: getDictionary("en"), title: "Guides", photo: "no-such-photo", art: BookOpen });
    const { data } = await sharp(card).extract({ left: 1150, top: 10, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(0xe0);
  });
});
