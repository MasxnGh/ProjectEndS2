import { Section } from "@/components/ui/section";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Clock } from "lucide-react";
import { guides, getGuideBySlug } from "@/data/guides";
import { getPlaceBySlug } from "@/data/places";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { getPlaceBlurDataURL } from "@/data/blur-manifest";
import { PlaceCard } from "@/components/place-card";
import { Reveal } from "@/components/reveal";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";

export function generateStaticParams() {
  return guides.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const guide = getGuideBySlug(slug);
  if (!guide) return {};
  return buildPageMetadata({
    locale: loc,
    path: `/guides/${slug}`,
    title: guide.title[loc],
    description: guide.dek[loc],
  });
}

export default async function GuideDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const relatedPlaces = guide.relatedPlaceSlugs
    .map((s) => getPlaceBySlug(s))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const publishedDate = new Date(guide.publishedAt).toLocaleDateString(
    locale === "th" ? "th-TH" : "en-US",
    { year: "numeric", month: "long", day: "numeric" }
  );

  const photoPath = getPlacePhoto(guide.slug);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title[locale],
    description: guide.dek[locale],
    datePublished: guide.publishedAt,
    ...(photoPath ? { image: `${SITE_URL}${photoPath}` } : {}),
    author: { "@type": "Organization", name: "Chiangmai Journey" },
  };

  return (
    <article>
      <script {...jsonLdScriptProps(articleJsonLd)} />
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(locale, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.guides, path: "/guides" },
            { name: guide.title[locale], path: `/guides/${guide.slug}` },
          ])
        )}
      />
      <section className="relative flex h-[50vh] min-h-[360px] items-end overflow-hidden">
        <PlaceImage
          category="cafe"
          paletteSeed={guide.coverSeed}
          label={guide.title[locale]}
          photoSrc={getPlacePhoto(guide.slug)}
          priority
          sizes="100vw"
          placeholder={getPlaceBlurDataURL(guide.slug) ? "blur" : undefined}
          blurDataURL={getPlaceBlurDataURL(guide.slug)}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-12 lg:px-10">
          <div className="flex items-center gap-4 text-xs uppercase tracking-wide text-band-muted">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              {guide.readMinutes} {dict.guides.readTime}
            </span>
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5" />
              {publishedDate}
            </span>
          </div>
          <h1 className="mt-3 font-serif-display text-4xl text-band-foreground sm:text-5xl">
            {guide.title[locale]}
          </h1>
          <p className="mt-3 max-w-xl text-lg text-band-muted">{guide.dek[locale]}</p>
        </div>
      </section>

      <Section as="div" width="prose" rhythm="tight" className="lg:py-20">
        <div className="space-y-12">
          {guide.sections.map((section, i) => (
            <Reveal key={i} delay={i * 0.05}>
              <h2 className="font-serif-display text-2xl">{section.heading[locale]}</h2>
              <p
                className={`mt-4 text-lg leading-relaxed text-muted-foreground text-pretty ${
                  /* A drop cap is a Latin device and does not survive the
                     journey: ::first-letter takes one character, which in Thai
                     is usually a leading vowel — เ, แ, โ, ไ, ใ — that means
                     nothing on its own, and at leading 0.85 any tone mark above
                     it is clipped. English only. */
                  i === 0 && locale === "en"
                    ? "first-letter:float-left first-letter:mr-3 first-letter:font-serif-display first-letter:text-6xl first-letter:leading-[0.85] first-letter:text-accent-text"
                    : ""
                }`}
              >
                {section.body[locale]}
              </p>
            </Reveal>
          ))}
        </div>

        {relatedPlaces.length > 0 ? (
          <div className="mt-20 border-t border-border pt-12">
            <h2 className="font-serif-display text-2xl">{dict.guides.relatedPlaces}</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedPlaces.map((place) => (
                <PlaceCard key={place.slug} place={place} />
              ))}
            </div>
          </div>
        ) : null}
      </Section>
    </article>
  );
}
