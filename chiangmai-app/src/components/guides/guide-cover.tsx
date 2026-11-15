import { BookOpen, Coffee, MapPin, type LucideIcon } from "lucide-react";
import type { Guide } from "@/data/types";
import { getPlaceBySlug } from "@/data/places";
import { getPlacePhoto } from "@/data/photo-manifest";
import type { Dictionary, Locale } from "@/i18n";
import { NoPhoto, PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";

/**
 * A guide's cover is a credited photograph of a place it visits when there is
 * one; otherwise the designed sand art with where it goes. The share image
 * (guides/[slug]/opengraph-image.tsx) uses the same photo through guideCoverPath.
 */
const GUIDE_COVER: Record<string, { photo: string } | { icon: LucideIcon }> = {
  "temples-of-the-old-city": { photo: "wat-chedi-luang" },
  "cafe-hopping-route": { icon: Coffee },
  "48-hours-in-nimman": { icon: MapPin },
};

/** The place whose photograph is the guide's cover, if it has one. */
export function guideCoverSlug(guide: Guide): string | null {
  const cover = GUIDE_COVER[guide.slug];
  return cover && "photo" in cover ? cover.photo : null;
}

/** Site path of the cover photograph, for JSON-LD; null when the cover is art. */
export function guideCoverPath(guide: Guide): string | null {
  const slug = guideCoverSlug(guide);
  return slug ? (getPlacePhoto(slug) ?? null) : null;
}

/** The art cover's icon, for a guide without a photo cover (BookOpen when none is set). */
export function guideCoverIcon(guide: Guide): LucideIcon {
  const cover = GUIDE_COVER[guide.slug];
  return cover && "icon" in cover ? cover.icon : BookOpen;
}

/** Where the guide goes, for the art cover's caption: the homepage's short area name. */
export function guideArea(guide: Guide, dict: Dictionary): string | undefined {
  const areas: Record<string, string> = dict.homepage.guideArea;
  return areas[guide.slug];
}

/** The cover itself, filling its (sized, rounded) parent. */
export function GuideCover({
  guide,
  locale,
  dict,
  sizes,
  eager,
}: {
  guide: Guide;
  locale: Locale;
  dict: Dictionary;
  sizes: string;
  eager?: boolean;
}) {
  const photo = guideCoverSlug(guide);
  if (photo) {
    const place = getPlaceBySlug(photo);
    return <PlacePhoto slug={photo} alt={place?.name[locale] ?? ""} sizes={sizes} eager={eager} />;
  }
  const area = guideArea(guide, dict);
  return <NoPhoto icon={guideCoverIcon(guide)} caption={area} label={area ?? guide.title[locale]} size="lg" />;
}

/** The credit line under a photo cover; nothing under art. */
export function GuideCoverCredit({
  guide,
  locale,
  dict,
  className,
}: {
  guide: Guide;
  locale: Locale;
  dict: Dictionary;
  className?: string;
}) {
  const slug = guideCoverSlug(guide);
  if (!slug) return null;
  return <PhotoCredit slug={slug} dict={dict} placeName={getPlaceBySlug(slug)?.name[locale]} className={className} />;
}
