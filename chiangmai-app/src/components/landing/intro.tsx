"use client";

import { Reveal } from "@/components/reveal";
import { useLocale } from "@/components/providers/locale-provider";

export function Intro() {
  const { dict } = useLocale();

  return (
    <section className="mx-auto max-w-7xl px-6 py-24 lg:px-10 lg:py-32">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <Reveal>
          <p className="mb-3 flex items-center gap-3 text-xs font-medium uppercase tracking-[0.2em] text-accent-text">
            <span className="h-px w-8 bg-accent" aria-hidden />
            {dict.home.intro.kicker}
          </p>
          <h2 className="font-serif-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            {dict.home.intro.title}
          </h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p className="text-lg leading-relaxed text-muted-foreground text-pretty lg:text-xl">
            {dict.home.intro.body}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
