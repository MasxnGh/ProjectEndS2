import { getPlaceBySlug } from "@/data/places";
import { getPlacePhoto } from "@/data/photo-manifest";
import { isLocale, getDictionary } from "@/i18n";
import { renderOgImage, OG_SIZE } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);
  const place = getPlaceBySlug(slug);

  return renderOgImage({
    title: place?.name[locale] ?? dict.meta.siteName,
    kicker: place ? dict.common.categories[place.category] : dict.meta.tagline,
    photoPath: place ? getPlacePhoto(place.slug) : undefined,
  });
}
