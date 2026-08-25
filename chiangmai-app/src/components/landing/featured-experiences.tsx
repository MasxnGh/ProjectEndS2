"use client";

import Link from "next/link";
import { Star } from "lucide-react";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { SectionHeading } from "@/components/section-heading";
import { Reveal } from "@/components/reveal";
import { Section } from "@/components/ui/section";
import { useLocale } from "@/components/providers/locale-provider";
import { getPlaceBySlug } from "@/data/places";
import { cn } from "@/lib/utils";

/**
 * Every one of these has a photograph that has been verified to depict it.
 *
 * Four of the previous five did not: Mon Cham, Nimmanhaemin, Mae Kampong and
 * the coffee trail all lost their images in the photo audit, so the page led
 * with four gradient placeholders under the heading "Editors' selections". A
 * showcase of photography should be built from the photographs that exist.
 */
const featuredSlugs = [
  "wat-phra-that-doi-suthep",
  "wat-pha-lat",
  "mae-sa-waterfall",
  "wat-ban-den",
  "tha-phae-gate",
];

const spans = [
  "md:col-span-4 md:row-span-2",
  "md:col-span-2 md:row-span-1",
  "md:col-span-2 md:row-span-1",
  "md:col-span-3 md:row-span-1",
  "md:col-span-3 md:row-span-1",
];

// Matches each item's actual rendered width at the md:grid-cols-6 breakpoint above.
const imageSizes = [
  "(max-width: 768px) 100vw, 66vw",
  "(max-width: 768px) 100vw, 33vw",
  "(max-width: 768px) 100vw, 33vw",
  "(max-width: 768px) 100vw, 50vw",
  "(max-width: 768px) 100vw, 50vw",
];

export function FeaturedExperiences() {
  const { locale, dict } = useLocale();
  const items = featuredSlugs.map((slug) => getPlaceBySlug(slug)).filter(Boolean);

  return (
    <Section width="wide" rhythm="tight">
      <Reveal>
        <SectionHeading
          kicker={dict.home.featured.kicker}
          title={dict.home.featured.title}
          subtitle={dict.home.featured.subtitle}
        />
      </Reveal>

      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[220px] md:gap-5">
        {items.map((place, i) => {
          if (!place) return null;
          return (
            <Reveal key={place.slug} delay={i * 0.05} className={cn("group", spans[i])}>
              <Link
                href={`/${locale}/place/${place.slug}`}
                className="relative block h-full min-h-[280px] overflow-hidden rounded-lg md:min-h-0"
              >
                <PlaceImage
                  category={place.category}
                  paletteSeed={place.paletteSeed}
                  label={place.name[locale]}
                  photoSrc={getPlacePhoto(place.slug)}
                  sizes={imageSizes[i]}
                  quality={70}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 flex flex-col justify-end gap-2 bg-gradient-to-t from-black/70 via-black/10 to-transparent p-6">
                  <span className="w-fit rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground">
                    {dict.common.categories[place.category]}
                  </span>
                  <h3 className="font-serif-display text-2xl text-[#f3efe4] lg:text-3xl">
                    {place.name[locale]}
                  </h3>
                  <p className="line-clamp-2 max-w-md text-sm text-[#f3efe4]/80">
                    {place.shortDescription[locale]}
                  </p>
                  <span className="flex items-center gap-1 text-xs text-[#f3efe4]/80">
                    <Star className="h-3.5 w-3.5 fill-accent text-accent-text" />
                    {place.rating} · {dict.common.districts[place.district]}
                  </span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
