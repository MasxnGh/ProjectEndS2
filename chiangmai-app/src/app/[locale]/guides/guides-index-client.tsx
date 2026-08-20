"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { guides } from "@/data/guides";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, RevealGroup, revealItemVariants } from "@/components/reveal";
import { ScrollStack } from "@/components/ui/scroll-stack";
import { useLocale } from "@/components/providers/locale-provider";
import { motion } from "motion/react";

export function GuidesIndexClient() {
  const { locale, dict } = useLocale();

  return (
    <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
      <Reveal>
        <SectionHeading kicker={dict.nav.guides} title={dict.guides.title} subtitle={dict.guides.subtitle} />
      </Reveal>

      {/* ScrollStack is presentation, not navigation: it shows one guide at a
          time, which is the wrong shape for choosing between them. It falls
          back to this plain grid under reduced motion, and the grid remains
          the layout on anything narrower than a desktop. */}
      <RevealGroup className="mt-12 grid gap-x-6 gap-y-12 md:hidden">
        {guides.map((guide) => (
          <motion.div key={guide.slug} variants={revealItemVariants}>
            <Link href={`/${locale}/guides/${guide.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
                <PlaceImage
                  category="cafe"
                  paletteSeed={guide.coverSeed}
                  label={guide.title[locale]}
                  photoSrc={getPlacePhoto(guide.slug)}
                  quality={70}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">
                {guide.readMinutes} {dict.guides.readTime}
              </p>
              <h2 className="mt-1 font-serif-display text-2xl leading-snug group-hover:text-accent-text">
                {guide.title[locale]}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">{guide.dek[locale]}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-accent-text">
                {dict.common.readMore}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </Link>
          </motion.div>
        ))}
      </RevealGroup>

      <ScrollStack className="mt-12 hidden md:block">
        {guides.map((guide) => (
          <article
            key={guide.slug}
            className="rounded-lg border border-border bg-surface p-6 shadow-card"
          >
            <Link href={`/${locale}/guides/${guide.slug}`} className="group grid gap-6 md:grid-cols-[1.2fr_1fr]">
              <div className="relative aspect-[16/9] overflow-hidden rounded-lg">
                <PlaceImage
                  category="cafe"
                  paletteSeed={guide.coverSeed}
                  label={guide.title[locale]}
                  photoSrc={getPlacePhoto(guide.slug)}
                  quality={70}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {guide.readMinutes} {dict.guides.readTime}
                </p>
                <h2 className="mt-2 font-serif-display text-3xl leading-snug group-hover:text-accent-text">
                  {guide.title[locale]}
                </h2>
                <p className="mt-3 text-muted-foreground">{guide.dek[locale]}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-text">
                  {dict.common.readMore}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </article>
        ))}
      </ScrollStack>
    </div>
  );
}
