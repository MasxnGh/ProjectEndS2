import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Camera, CloudSun, Compass, Heart, Map as MapIcon, MapPin, Mountain, Route, type LucideIcon } from "lucide-react";
import { getPlaceBySlug, places } from "@/data/places";
import { getPlacePhoto } from "@/data/photo-manifest";
import { isLocale, getDictionary } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { ButtonLink } from "@/components/brand/button";
import { Brush, CATEGORY_ORDER, ICON_STROKE } from "@/components/brand/icons";
import { BrandMark } from "@/components/brand/logo";
import { Phrases } from "@/components/brand/phrases";
import { PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";
import { fill } from "@/components/brand/place-text";
import { SectionHeading } from "@/components/brand/section-heading";
import { Box, Wrap } from "@/components/brand/surface";

/** The page's one photograph: a teak temple in the old city, credited below it. */
const HERO_PLACE = "wat-phan-tao";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  return buildPageMetadata({
    locale: loc,
    path: "/about",
    title: dict.aboutPage.title,
    description: dict.aboutPage.description,
  });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.aboutPage;

  // Counted, not typed in: the page states what the catalogue holds today.
  const placeCount = places.length;
  const photoCount = places.filter((place) => getPlacePhoto(place.slug)).length;
  const hero = getPlaceBySlug(HERO_PLACE);

  const values: { icon: LucideIcon; title: string; en: string; body: string }[] = [
    { icon: Mountain, title: t.values.authentic.title, en: "Local, authentic", body: fill(t.values.authentic.body, { count: placeCount }) },
    { icon: Compass, title: t.values.explore.title, en: "Easy to explore", body: t.values.explore.body },
    { icon: Heart, title: t.values.journey.title, en: "Inspiring journey", body: t.values.journey.body },
  ];

  const sources: { icon: LucideIcon; title: string; body: string }[] = [
    {
      icon: MapPin,
      title: t.sources.places.title,
      body: fill(t.sources.places.body, { count: placeCount, categories: CATEGORY_ORDER.length }),
    },
    { icon: Camera, title: t.sources.photos.title, body: fill(t.sources.photos.body, { count: photoCount }) },
    { icon: CloudSun, title: t.sources.weather.title, body: t.sources.weather.body },
    { icon: MapIcon, title: t.sources.map.title, body: t.sources.map.body },
    { icon: Route, title: t.sources.route.title, body: t.sources.route.body },
  ];

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(locale, [
            { name: dict.nav.home, path: "" },
            { name: t.title, path: "/about" },
          ]),
        )}
      />
      <Wrap>
        <section className="grid items-center gap-10 pt-10 pb-12 sm:pt-14 md:grid-cols-2 md:gap-12 lg:pb-16">
          <div className="grid justify-items-center gap-3 text-center text-brand">
            <BrandMark className="w-[120px] sm:w-[150px]" />
            <h1 className="grid">
              <span className="sr-only">{t.title} — </span>
              <span lang="en" className="text-[clamp(2.5rem,2rem+2.4vw,3.75rem)] leading-[1.05] font-semibold">
                Chiangmai
                <br />
                Journey
              </span>
            </h1>
            <p lang="en" className="text-label font-medium tracking-[0.12em] text-ink uppercase">
              Explore • Experience • Enjoy
            </p>
            <hr aria-hidden className="my-2 h-[1.5px] w-14 border-0 bg-line-strong" />
            <p className="text-title leading-[1.6] text-ink">
              <Phrases text={t.tagline} />
            </p>
            <Brush />
          </div>

          {hero ? (
            <figure className="mx-auto w-full max-w-[520px]">
              <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
                <PlacePhoto
                  slug={hero.slug}
                  alt={fill(t.photoAlt, { place: hero.name[locale] })}
                  sizes="(max-width: 768px) calc(100vw - 32px), 520px"
                  eager
                />
              </div>
              <figcaption>
                <PhotoCredit slug={hero.slug} dict={dict} placeName={hero.name[locale]} className="mt-2" />
              </figcaption>
            </figure>
          ) : null}
        </section>

        <section aria-labelledby="about-idea" className="grid max-w-[760px] gap-4 py-12 sm:py-16">
          <h2 id="about-idea" className="text-headline text-balance text-brand">
            {t.ideaTitle}
          </h2>
          <p className="text-[1.125rem] leading-[1.8] text-pretty">{t.ideaBody}</p>
        </section>

        <section aria-labelledby="about-values" className="pt-4">
          <SectionHeading id="about-values">{t.valuesTitle}</SectionHeading>
          <ul className="grid gap-5 md:grid-cols-3">
            {values.map(({ icon: Icon, title, en, body }) => (
              <li key={en}>
                <Box className="grid h-full content-start justify-items-start gap-3 px-5 py-6 sm:px-6">
                  <Icon aria-hidden strokeWidth={1.5} className="size-9 text-brand" />
                  <h3 className="text-title font-semibold text-brand">{title}</h3>
                  {/* The board's own words for the value, under the Thai; English pages already read them. */}
                  {locale === "th" ? (
                    <p lang="en" className="-mt-2 text-small tracking-[0.04em] text-ink-soft">
                      {en}
                    </p>
                  ) : null}
                  <p className="text-body text-pretty text-ink-soft">{body}</p>
                </Box>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="about-sources" className="pt-16 sm:pt-24">
          <SectionHeading id="about-sources">{t.sourcesTitle}</SectionHeading>
          <ul className="max-w-[820px]">
            {sources.map(({ icon: Icon, title, body }) => (
              <li key={title} className="grid grid-cols-[44px_1fr] items-start gap-4 border-b border-line py-4 first:pt-0">
                <span aria-hidden className="grid size-11 place-items-center rounded-full bg-well text-brand">
                  <Icon strokeWidth={ICON_STROKE} className="size-5" />
                </span>
                <div className="grid gap-0.5 pt-1">
                  <h3 className="text-label font-semibold text-ink">{title}</h3>
                  <p className="text-body text-pretty text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ul>
          {/* Under the list, not beside the title: the long label squeezed the title onto three lines on a phone. */}
          <ButtonLink href={`/${locale}/credits`} variant="ghost" size="sm" arrow className="mt-4 -ml-3">
            {t.creditsLink}
          </ButtonLink>
        </section>

        <section aria-labelledby="about-maker" className="mt-16 grid gap-2 rounded-xl bg-sand-fill p-6 sm:mt-24 sm:p-8">
          <h2 id="about-maker" className="text-title font-semibold text-brand">
            {t.makerTitle}
          </h2>
          <p className="text-body text-ink">{dict.shell.madeAt}</p>
        </section>
      </Wrap>
    </div>
  );
}
