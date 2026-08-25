"use client";

import { Section } from "@/components/ui/section";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { guides } from "@/data/guides";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, RevealGroup, revealItemVariants } from "@/components/reveal";
import { useLocale } from "@/components/providers/locale-provider";
import { motion } from "motion/react";

export function GuidesIndexClient() {
  const { locale, dict } = useLocale();

  return (
    <Section as="div" width="default" rhythm="tight" className="lg:py-20">
      <Reveal>
        <SectionHeading as="h1" kicker={dict.nav.guides} title={dict.guides.title} subtitle={dict.guides.subtitle} />
      </Reveal>

      {/*
        * One list, at every width.
        *
        * This page carried two full renderings of the same three guides: a grid
        * below md and a React Bits scroll-stack above it. The stack's own note
        * conceded the problem — it shows one card at a time, which is the wrong
        * shape for a page whose whole job is letting someone compare three
        * guides and pick one — and keeping both meant every copy change had to
        * be made twice. The row layout the desktop version used reads well at
        * any width, so it is the only one now.
        */}
      <RevealGroup className="mt-12 space-y-8">
        {guides.map((guide) => (
          <motion.article key={guide.slug} variants={revealItemVariants}>
            <Link
              href={`/${locale}/guides/${guide.slug}`}
              className="group grid gap-6 rounded-lg border border-border bg-surface p-5 transition-colors hover:border-border-strong sm:grid-cols-[1.1fr_1fr] sm:p-6"
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-md">
                <PlaceImage
                  category="cafe"
                  paletteSeed={guide.coverSeed}
                  label={guide.title[locale]}
                  photoSrc={getPlacePhoto(guide.slug)}
                  sizes="(max-width: 640px) 100vw, 40vw"
                  quality={70}
                  className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-105"
                />
              </div>
              <div className="flex flex-col justify-center">
                <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
                  {guide.readMinutes} {dict.guides.readTime}
                </p>
                <h2 className="mt-2 font-serif-display text-2xl leading-snug group-hover:text-accent-text sm:text-3xl">
                  {guide.title[locale]}
                </h2>
                <p className="mt-3 leading-relaxed text-muted-foreground text-pretty">
                  {guide.dek[locale]}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-text">
                  {dict.common.readMore}
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </motion.article>
        ))}
      </RevealGroup>
    </Section>
  );
}
