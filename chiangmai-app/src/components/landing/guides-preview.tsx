"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, RevealGroup, revealItemVariants } from "@/components/reveal";
import { useLocale } from "@/components/providers/locale-provider";
import { guides } from "@/data/guides";
import { motion } from "motion/react";

export function GuidesPreview() {
  const { locale, dict } = useLocale();

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
      <Reveal>
        <SectionHeading kicker={dict.home.guidesPreview.kicker} title={dict.home.guidesPreview.title} />
      </Reveal>

      <RevealGroup className="mt-12 grid gap-6 md:grid-cols-3">
        {guides.map((guide) => (
          <motion.div key={guide.slug} variants={revealItemVariants}>
            <Link href={`/${locale}/guides/${guide.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <PlaceImage
                  category="cafe"
                  paletteSeed={guide.coverSeed}
                  label={guide.title[locale]}
                  photoSrc={getPlacePhoto(guide.slug)}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                {guide.readMinutes} {dict.guides.readTime}
              </p>
              <h3 className="mt-1 font-serif-display text-xl leading-snug group-hover:text-accent-text">
                {guide.title[locale]}
              </h3>
              <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{guide.dek[locale]}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-text">
                {dict.common.readMore}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </RevealGroup>
    </section>
  );
}
