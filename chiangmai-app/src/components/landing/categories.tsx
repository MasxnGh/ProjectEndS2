"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PlaceImage } from "@/components/place-image";
import { SectionHeading } from "@/components/section-heading";
import { Reveal, RevealGroup, revealItemVariants } from "@/components/reveal";
import { useLocale } from "@/components/providers/locale-provider";
import { motion } from "motion/react";
import type { PlaceCategory } from "@/data/types";

const categoryList: { category: PlaceCategory; seed: number }[] = [
  { category: "temple", seed: 1 },
  { category: "nature", seed: 3 },
  { category: "village", seed: 2 },
  { category: "cafe", seed: 4 },
  { category: "market", seed: 5 },
  { category: "activity", seed: 6 },
];

export function Categories() {
  const { locale, dict } = useLocale();

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
        <Reveal>
          <SectionHeading kicker={dict.home.categories.kicker} title={dict.home.categories.title} />
        </Reveal>
        <Reveal delay={0.1}>
          <Link
            href={`/${locale}/explore`}
            className="flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
          >
            {dict.home.categories.viewAll}
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>

      <RevealGroup className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
        {categoryList.map(({ category, seed }) => (
          <motion.div key={category} variants={revealItemVariants}>
            <Link
              href={`/${locale}/explore?category=${category}`}
              className="group relative block aspect-square overflow-hidden rounded-lg"
            >
              <PlaceImage
                category={category}
                paletteSeed={seed}
                className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 flex items-end p-5">
                <span className="font-serif-display text-xl text-background sm:text-2xl">
                  {dict.common.categories[category]}
                </span>
              </div>
              <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-background/80 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Link>
          </motion.div>
        ))}
      </RevealGroup>
    </section>
  );
}
