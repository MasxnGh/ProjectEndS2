import { MapPin } from "lucide-react";
import { getPlaceBySlug } from "@/data/places";
import { isLocale, getDictionary } from "@/i18n";
import { categoryIcon } from "@/components/brand/icons";
import { placeWhere } from "@/components/brand/place-text";
import { renderOgImage, OG_SIZE, OG_TYPE } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = OG_TYPE;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  const place = getPlaceBySlug(slug);

  if (!place) {
    return renderOgImage({ locale, dict, title: dict.meta.siteName, line: dict.meta.tagline, art: MapPin });
  }
  const icon = categoryIcon[place.category];
  return renderOgImage({
    locale,
    dict,
    title: place.name[locale],
    kicker: { label: dict.common.categories[place.category], icon },
    line: placeWhere(place, dict),
    photo: place.slug,
    art: icon,
  });
}
