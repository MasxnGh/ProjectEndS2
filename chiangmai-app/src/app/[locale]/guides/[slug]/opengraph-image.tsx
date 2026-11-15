import { BookOpen } from "lucide-react";
import { getGuideBySlug } from "@/data/guides";
import { getPlaceBySlug } from "@/data/places";
import { guideArea, guideCoverIcon, guideCoverSlug } from "@/components/guides/guide-cover";
import { isLocale, getDictionary } from "@/i18n";
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
  const guide = getGuideBySlug(slug);

  if (!guide) {
    return renderOgImage({ locale, dict, title: dict.meta.siteName, line: dict.meta.tagline, art: BookOpen });
  }
  // The page's own cover: a credited place photo, or the sand art with where it goes.
  const cover = guideCoverSlug(guide);
  return renderOgImage({
    locale,
    dict,
    title: guide.title[locale],
    kicker: { label: dict.guides.title, icon: BookOpen },
    line: guideArea(guide, dict),
    photo: cover,
    photoOf: cover ? getPlaceBySlug(cover)?.name[locale] : undefined,
    art: guideCoverIcon(guide),
  });
}
