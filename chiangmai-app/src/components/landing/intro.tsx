"use client";

import { Reveal } from "@/components/reveal";
import { Section } from "@/components/ui/section";
import { ScrollReveal } from "@/components/ui/scroll-reveal";
import { useLocale } from "@/components/providers/locale-provider";

export function Intro() {
  const { dict } = useLocale();

  return (
    <Section width="default" rhythm="loose">
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
          {/* The one place on the site that reveals per word rather than per
              block — this is the paragraph that sets the tone, and it is long
              enough that tying it to scroll position reads as pacing rather
              than as a gimmick. */}
          <ScrollReveal
            text={dict.home.intro.body}
            className="text-lg leading-relaxed text-muted-foreground text-pretty lg:text-xl"
          />
        </Reveal>
      </div>
    </Section>
  );
}
