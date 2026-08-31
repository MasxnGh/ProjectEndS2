"use client";

import Link from "next/link";
import { CalendarDays, MapPinned, Share2, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reveal";
import { Section, Container } from "@/components/ui/section";
import { PlaceImage } from "@/components/place-image";
import { useLocale } from "@/components/providers/locale-provider";
import type { PlaceCategory } from "@/data/types";

const mockDay1: { category: PlaceCategory; seed: number }[] = [
  { category: "temple", seed: 1 },
  { category: "cafe", seed: 4 },
];
const mockDay2: { category: PlaceCategory; seed: number }[] = [
  { category: "nature", seed: 3 },
  { category: "market", seed: 5 },
];

function MockChip({ category, seed }: { category: PlaceCategory; seed: number }) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-background p-2.5">
      <PlaceImage category={category} paletteSeed={seed} className="h-10 w-10 shrink-0 rounded" />
      <div className="h-2 w-24 rounded-full bg-border-strong" />
    </div>
  );
}

export function PlannerPreview() {
  const { locale, dict } = useLocale();

  const features = [
    { icon: CalendarDays, title: dict.home.plannerPreview.feature1Title, body: dict.home.plannerPreview.feature1Body },
    { icon: MapPinned, title: dict.home.plannerPreview.feature2Title, body: dict.home.plannerPreview.feature2Body },
    { icon: Share2, title: dict.home.plannerPreview.feature3Title, body: dict.home.plannerPreview.feature3Body },
  ];

  return (
    /*
     * The one full-bleed section on the page, and the only one that inverts.
     * A page of same-width sections on the same background reads as a single
     * sheet however well each one is set; this is the break, and it lands on
     * the planner because that is the page's actual purpose.
     */
    <Section
      as="section"
      width="full"
      rhythm="none"
      className="bg-band text-band-foreground"
    >
      <Container width="wide" className="grid gap-10 py-14 sm:gap-16 sm:py-24 lg:grid-cols-2 lg:items-center lg:py-32">
        <Reveal>
          <p className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.2em] text-band-accent">
            <span className="h-px w-8 bg-band-accent" aria-hidden />
            {dict.home.plannerPreview.kicker}
          </p>
          <h2 className="font-serif-display text-4xl tracking-tight sm:text-5xl">
            {dict.home.plannerPreview.title}
          </h2>
          <p className="mt-5 max-w-lg text-lg leading-relaxed text-band-muted text-pretty">
            {dict.home.plannerPreview.body}
          </p>

          <ul className="mt-10 space-y-6">
            {features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-band-accent/15 text-band-accent">
                  <f.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-band-muted">{f.body}</p>
                </div>
              </li>
            ))}
          </ul>

          <Link
            href={`/${locale}/planner`}
            className="mt-10 inline-flex items-center gap-2 rounded-full bg-band-accent px-7 py-3.5 text-sm font-medium text-band-accent-foreground transition-opacity hover:opacity-90"
          >
            {dict.home.plannerPreview.cta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>

        <Reveal delay={0.15} className="relative">
          <div className="rounded-xl border border-border bg-background p-6 shadow-elevated">
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {dict.planner.day} 1
                </p>
                <div className="space-y-2">
                  {mockDay1.map((m, i) => (
                    <MockChip key={i} {...m} />
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {dict.planner.day} 2
                </p>
                <div className="space-y-2">
                  {mockDay2.map((m, i) => (
                    <MockChip key={i} {...m} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-border pt-5 text-sm">
              <span className="text-muted-foreground">{dict.planner.estimatedBudget}</span>
              <span className="font-medium text-accent-text">฿฿ · ~2,400</span>
            </div>
          </div>
          <div
            className="absolute -right-6 -top-6 -z-10 hidden h-full w-full rounded-xl border border-band-accent/30 lg:block"
            aria-hidden
          />
        </Reveal>
      </Container>
    </Section>
  );
}
