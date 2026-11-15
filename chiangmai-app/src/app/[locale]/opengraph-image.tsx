import { Mountain } from "lucide-react";
import { getPlaceBySlug, places } from "@/data/places";
import { HOME_HERO } from "@/data/home-hero";
import { isLocale, getDictionary } from "@/i18n";
import { fill } from "@/components/brand/place-text";
import { renderOgImage, OG_SIZE, OG_TYPE } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);

  // The home page's own hero and subtitle, so a shared link looks like the page.
  return renderOgImage({
    locale,
    dict,
    home: true,
    title: dict.meta.siteName,
    line: fill(dict.homepage.heroSub, { count: places.length }),
    photo: HOME_HERO.photo,
    photoOf: getPlaceBySlug(HOME_HERO.place)?.name[locale],
    art: Mountain,
    focus: { x: 0.5, y: 0.8 },
  });
}
