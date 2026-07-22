"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight } from "lucide-react";
import { HeroBackground } from "@/components/landing/hero-background";
import { SplitText } from "@/components/split-text";
import { MagneticButton } from "@/components/magnetic-button";
import { useLocale } from "@/components/providers/locale-provider";

export function Hero() {
  const { locale, dict } = useLocale();
  const shouldReduceMotion = useReducedMotion();
  const [line1, line2] = dict.home.hero.title;

  return (
    <section className="relative flex min-h-dvh flex-col justify-end overflow-hidden text-[#f3efe4]">
      <HeroBackground />

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 pb-20 pt-40 lg:px-10">
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.7 }}
          className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.3em] text-accent"
        >
          <span className="h-px w-10 bg-accent" aria-hidden />
          {dict.home.hero.kicker}
        </motion.p>

        <h1 className="font-serif-display text-6xl leading-[0.98] tracking-tight sm:text-7xl md:text-8xl lg:text-[7.5rem]">
          <SplitText text={line1} as="span" className="block" />
          <SplitText text={line2} as="span" delay={0.15} className="block text-accent" />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.8, delay: 0.6 }}
          className="max-w-lg text-lg text-[#f3efe4]/80 text-pretty"
        >
          {dict.home.hero.subtitle}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0.01 : 0.8, delay: 0.75 }}
          className="flex flex-wrap items-center gap-5 pt-4"
        >
          <MagneticButton>
            <Link
              href={`/${locale}/planner`}
              className="flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-accent-foreground shadow-elevated transition-transform"
            >
              {dict.home.hero.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </MagneticButton>
          <Link
            href={`/${locale}/explore`}
            className="text-sm font-medium tracking-wide text-[#f3efe4] underline decoration-accent/50 underline-offset-8 transition-colors hover:decoration-accent"
          >
            {dict.home.hero.secondaryCta}
          </Link>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: shouldReduceMotion ? 0.01 : 1, delay: 1.1 }}
        className="relative z-10 mx-auto mb-10 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-[#f3efe4]/60"
      >
        {dict.home.hero.scroll}
        <motion.span
          animate={shouldReduceMotion ? {} : { y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-4 w-4" />
        </motion.span>
      </motion.div>
    </section>
  );
}
