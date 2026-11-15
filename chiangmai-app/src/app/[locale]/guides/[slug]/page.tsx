import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen, ChevronRight, MapPin } from "lucide-react";
import { guides, getGuideBySlug } from "@/data/guides";
import { getPlaceBySlug } from "@/data/places";
import type { Place } from "@/data/types";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { cx, focusRing } from "@/components/brand/cx";
import { FavoriteToggle } from "@/components/brand/favorite-toggle";
import { ICON_STROKE } from "@/components/brand/icons";
import { PlaceCardFor } from "@/components/brand/place-card";
import { fill } from "@/components/brand/place-text";
import { PlanToggle } from "@/components/brand/plan-toggle";
import { SectionHeading } from "@/components/brand/section-heading";
import { Wrap } from "@/components/brand/surface";
import { GuideCover, GuideCoverCredit, guideCoverPath, guideCoverSlug } from "@/components/guides/guide-cover";
import { placeCountLabel } from "@/components/plan/plan-text";

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

const mentionLink = cx(
  "rounded-xs font-medium text-brand underline decoration-[1.5px] underline-offset-4 hover:decoration-2",
  focusRing,
);

/**
 * Links each place the first time the text names it, so a reader can open the
 * place mid-sentence. Thai names are matched without their bracketed part
 * ("วัดศรีสุพรรณ (วัดพระธาตุเงิน)" is written "วัดศรีสุพรรณ" in prose).
 * `seen` carries across sections: a place is linked once per guide.
 */
function linkMentions(text: string, places: Place[], seen: Set<string>, locale: Locale): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  for (;;) {
    let next: { place: Place; index: number; name: string } | null = null;
    for (const place of places) {
      if (seen.has(place.slug)) continue;
      const name = place.name[locale].split(" (")[0];
      const index = rest.indexOf(name);
      if (index >= 0 && (!next || index < next.index)) next = { place, index, name };
    }
    if (!next) break;
    seen.add(next.place.slug);
    nodes.push(rest.slice(0, next.index));
    nodes.push(
      <Link key={next.place.slug} href={`/${locale}/place/${next.place.slug}`} className={mentionLink}>
        {next.name}
      </Link>,
    );
    rest = rest.slice(next.index + next.name.length);
  }
  nodes.push(rest);
  return nodes;
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

  const t = dict.guidesPage;
  const title = guide.title[locale];
  const places = guide.relatedPlaceSlugs
    .map((s) => getPlaceBySlug(s))
    .filter((p): p is Place => Boolean(p));
  const others = guides.filter((g) => g.slug !== guide.slug);

  const longDate = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(guide.publishedAt));

  const seen = new Set<string>();
  const sections = guide.sections.map((section) => ({
    heading: section.heading[locale],
    body: linkMentions(section.body[locale], places, seen, locale),
  }));

  const coverPath = guideCoverPath(guide);
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: guide.dek[locale],
    datePublished: guide.publishedAt,
    ...(coverPath ? { image: `${SITE_URL}${coverPath}` } : {}),
    author: { "@type": "Organization", name: "Chiangmai Journey" },
  };

  const crumbLink = cx(
    "inline-flex min-h-11 items-center rounded-sm text-ink-soft underline-offset-4 transition-colors duration-150 hover:text-brand hover:underline",
    focusRing,
  );

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <script {...jsonLdScriptProps(articleJsonLd)} />
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(locale, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.guides, path: "/guides" },
            { name: title, path: `/guides/${guide.slug}` },
          ]),
        )}
      />

      <Wrap>
        <nav aria-label={dict.placePage.crumbs} className="pt-2 text-small">
          <ol className="flex flex-wrap items-center gap-x-1.5">
            <li className="flex items-center gap-1.5">
              <Link href={`/${locale}`} className={crumbLink}>
                {dict.nav.home}
              </Link>
              <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-soft" />
            </li>
            <li>
              <Link href={`/${locale}/guides`} className={crumbLink}>
                {dict.nav.guides}
              </Link>
            </li>
          </ol>
        </nav>

        <article>
          <header className="grid max-w-[820px] gap-4 pt-2 pb-6 sm:pb-8">
            <h1 className="text-[clamp(2.25rem,1.6rem+2.8vw,3.75rem)] leading-[1.2] font-semibold text-balance text-brand">
              {title}
            </h1>
            <p className="text-[clamp(1.125rem,1rem+0.5vw,1.375rem)] leading-[1.6] text-pretty text-ink">
              {guide.dek[locale]}
            </p>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-small text-ink-soft tabular-nums">
              <span className="inline-flex items-center gap-1.5">
                <BookOpen aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                {fill(dict.homepage.readTime, { minutes: guide.readMinutes })}
              </span>
              <time dateTime={guide.publishedAt}>{longDate}</time>
              <span className="inline-flex items-center gap-1.5">
                <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                {placeCountLabel(places.length, dict)}
              </span>
            </p>
          </header>

          <figure>
            {/* Without a photograph there is nothing to look at, so the art takes
                less of the first screen than a photo would (as on a place page). */}
            <div
              className={cx(
                "relative overflow-hidden rounded-lg md:rounded-xl",
                guideCoverSlug(guide) ? "aspect-[4/3] sm:aspect-[21/9]" : "aspect-[16/9] sm:aspect-[4/1]",
              )}
            >
              <GuideCover
                guide={guide}
                locale={locale}
                dict={dict}
                sizes="(max-width: 1344px) calc(100vw - 32px), 1280px"
                eager
              />
            </div>
            <figcaption>
              <GuideCoverCredit guide={guide} locale={locale} dict={dict} className="mt-2" />
            </figcaption>
          </figure>

          <div className="grid gap-12 pt-10 sm:pt-12 lg:grid-cols-[minmax(0,68ch)_minmax(0,1fr)] lg:gap-16 lg:pt-14">
            <div className="grid content-start gap-10">
              {sections.map((section, i) => (
                <section key={i}>
                  <h2 className="mb-3 text-[1.5rem] leading-[1.4] font-semibold text-balance text-brand">
                    {section.heading}
                  </h2>
                  <p className="text-[1.125rem] leading-[1.8] text-pretty text-ink">{section.body}</p>
                </section>
              ))}
            </div>

            {places.length > 0 ? (
              <aside aria-labelledby="guide-places" className="lg:sticky lg:top-24 lg:self-start">
                <h2 id="guide-places" className="mb-4 text-title font-semibold text-brand">
                  {dict.guides.relatedPlaces}
                </h2>
                <ul className="grid gap-3">
                  {places.map((place) => (
                    <li key={place.slug}>
                      <PlaceCardFor
                        place={place}
                        locale={locale}
                        dict={dict}
                        headingLevel="h3"
                        favorite={<FavoriteToggle slug={place.slug} placeName={place.name[locale]} />}
                        footer={<PlanToggle slug={place.slug} placeName={place.name[locale]} />}
                      />
                    </li>
                  ))}
                </ul>
              </aside>
            ) : null}
          </div>
        </article>

        {others.length > 0 ? (
          <section aria-labelledby="guide-next" className="pt-16 sm:pt-24">
            <SectionHeading id="guide-next">{t.readNext}</SectionHeading>
            <ul className="grid gap-8 md:grid-cols-2 md:gap-6">
              {others.map((other) => (
                <li key={other.slug}>
                  <article className="group/guide relative grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] sm:items-center sm:gap-5">
                    <div className="relative aspect-[3/2] overflow-hidden rounded-lg">
                      <GuideCover guide={other} locale={locale} dict={dict} sizes="(max-width: 640px) calc(100vw - 32px), 260px" />
                    </div>
                    <div className="grid gap-2">
                      <h3 className="text-title text-pretty text-ink group-hover/guide:text-brand group-hover/guide:underline group-hover/guide:decoration-[1.5px] group-hover/guide:underline-offset-4">
                        <Link
                          href={`/${locale}/guides/${other.slug}`}
                          className="rounded-lg outline-none after:absolute after:inset-0 after:rounded-lg focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-brand"
                        >
                          {other.title[locale]}
                        </Link>
                      </h3>
                      <p className="text-small text-pretty text-ink-soft">{other.dek[locale]}</p>
                      <p className="flex items-center gap-1.5 text-small text-ink-soft tabular-nums">
                        <BookOpen aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                        {fill(dict.homepage.readTime, { minutes: other.readMinutes })}
                      </p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Wrap>
    </div>
  );
}
