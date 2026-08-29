import { Section } from "@/components/ui/section";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { allPhotoCredits } from "@/data/photo-credits";
import { getPlaceBySlug } from "@/data/places";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { Reveal } from "@/components/reveal";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return buildPageMetadata({
    locale,
    path: "/credits",
    title: dict.credits.title,
    description: dict.credits.intro,
  });
}

/**
 * One page listing every photograph and who took it.
 *
 * Most place photography here is CC BY / CC BY-SA from Wikimedia Commons,
 * where crediting the author and naming the licence is a condition of use.
 * Each photo also carries its credit inline, but a licence notice that only
 * exists on the page the photo happens to be on is easy to lose in a redesign;
 * this page is the durable copy.
 */
export default async function CreditsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const dict = getDictionary(loc);
  const t = dict.credits;
  const credits = allPhotoCredits();

  return (
    <Section as="div" width="prose" rhythm="tight" className="lg:py-20">
      <Reveal as="div">
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">{t.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">{t.intro}</p>
      </Reveal>

      <Reveal as="div" delay={0.08} className="mt-12">
        <h2 className="font-serif-display text-2xl">{t.photosTitle}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{t.photosBody}</p>

        {credits.length === 0 ? (
          <p className="mt-6 rounded-lg border border-dashed border-border-strong p-6 text-sm text-muted-foreground">
            {t.photosEmpty}
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-border rounded-lg border border-border">
            {credits.map((credit) => {
              const place = getPlaceBySlug(credit.slug);
              return (
                <li key={credit.slug} className="flex flex-wrap items-baseline gap-x-4 gap-y-1 px-5 py-4">
                  <span className="min-w-0 flex-1 text-sm">
                    {place ? (
                      <Link href={`/${loc}/place/${place.slug}`} className="hover:text-accent-text">
                        {place.name[loc]}
                      </Link>
                    ) : (
                      credit.slug
                    )}
                  </span>
                  <span className="text-sm text-muted-foreground">{credit.artist}</span>
                  <a
                    href={credit.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex shrink-0 items-center gap-1 text-xs text-accent-text hover:underline"
                  >
                    {credit.licence}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Reveal>

      <Reveal as="div" delay={0.12} className="mt-12">
        <h2 className="font-serif-display text-2xl">{t.dataTitle}</h2>
        <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">{t.dataBody}</p>
      </Reveal>

      <Reveal as="div" delay={0.16} className="mt-12">
        <h2 className="font-serif-display text-2xl">{t.illustratedTitle}</h2>
        <p className="mt-2 leading-relaxed text-muted-foreground text-pretty">{t.illustratedBody}</p>
      </Reveal>
    </Section>
  );
}
