import { getPlacePhoto } from "@/data/photo-manifest";
import { isLocale, getDictionary } from "@/i18n";
import { renderOgImage, OG_SIZE } from "@/lib/og-image";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const dict = getDictionary(locale);

  return renderOgImage({
    title: dict.meta.titleSuffix,
    kicker: dict.meta.tagline,
    photoPath: getPlacePhoto("wat-phra-that-doi-suthep"),
  });
}
