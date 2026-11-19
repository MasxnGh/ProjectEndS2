import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { guides } from "@/data/guides";
import { getPlaceBySlug } from "@/data/places";
import type { Place } from "@/data/types";
import { isLocale, getDictionary } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { Badge } from "@/components/brand/badge";
import { ButtonLink } from "@/components/brand/button";
import { cx, focusRing } from "@/components/brand/cx";
import { Brush, categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { fill } from "@/components/brand/place-text";
import { Wrap } from "@/components/brand/surface";
import { GuideCover, GuideCoverCredit } from "@/components/guides/guide-cover";
import { BlurFade } from "@/components/magicui/blur-fade";

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
    path: "/guides",
    title: dict.guides.title,
    description: dict.guidesPage.intro,
  });
}

export default async function GuidesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const t = dict.guidesPage;
  const date = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  // Newest first: each entry shows its date, and in data order they read
  // 14 Jan, 2 Feb, 28 Jan. ISO dates sort as text.
  const newestFirst = [...guides].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(locale, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.guides, path: "/guides" },
          ]),
        )}
      />
      <Wrap>
        <header className="grid max-w-[720px] gap-3 pt-10 pb-10 sm:pt-14 sm:pb-14">
          <h1 className="cmj-arrive text-[clamp(2.25rem,1.7rem+2.4vw,3.5rem)] leading-[1.2] font-semibold text-brand">
            {dict.nav.guides}
          </h1>
          <Brush />
          <p className="cmj-arrive text-[1.125rem] leading-[1.6] text-pretty text-ink-soft [--cmj-delay:120ms]">{t.intro}</p>
        </header>

        <ol className="grid gap-14 sm:gap-20">
          {newestFirst.map((guide, index) => {
            const href = `/${locale}/guides/${guide.slug}`;
            const title = guide.title[locale];
            const places = guide.relatedPlaceSlugs
              .map((slug) => getPlaceBySlug(slug))
              .filter((place): place is Place => Boolean(place));
            return (
              // Each guide arrives as you scroll to it; the first is already on screen.
              <BlurFade as="li" key={guide.slug}>
                <article className="grid items-center gap-5 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
                  {/* Alternate sides on desktop so three long rows don't read as one column. */}
                  <div className={cx("min-w-0", index % 2 === 1 && "lg:order-2")}>
                    {/* The picture is a second way to the same guide: out of the
                        tab order and hidden from screen readers, which get the title link. */}
                    <Link
                      href={href}
                      tabIndex={-1}
                      aria-hidden
                      className="relative block aspect-[16/10] overflow-hidden rounded-lg sm:rounded-xl"
                    >
                      <GuideCover
                        guide={guide}
                        locale={locale}
                        dict={dict}
                        sizes="(max-width: 1024px) calc(100vw - 48px), 660px"
                        eager={index === 0}
                      />
                    </Link>
                    <GuideCoverCredit guide={guide} locale={locale} dict={dict} className="mt-2" />
                  </div>

                  <div className="grid max-w-[52ch] min-w-0 content-center gap-3">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-small text-ink-soft tabular-nums">
                      <BookOpen aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                      {fill(dict.homepage.readTime, { minutes: guide.readMinutes })}
                      <span aria-hidden>·</span>
                      <time dateTime={guide.publishedAt}>{date.format(new Date(guide.publishedAt))}</time>
                    </p>
                    <h2 className="text-[clamp(1.625rem,1.3rem+1.2vw,2.25rem)] leading-[1.3] font-semibold text-balance text-brand">
                      <Link
                        href={href}
                        className={cx("rounded-sm hover:underline hover:decoration-[1.5px] hover:underline-offset-4", focusRing)}
                      >
                        {title}
                      </Link>
                    </h2>
                    <p className="text-body text-pretty text-ink-soft">{guide.dek[locale]}</p>
                    {places.length > 0 ? (
                      <ul aria-label={fill(t.placesLabel, { title })} className="flex flex-wrap gap-2 pt-1">
                        {places.map((place) => {
                          const Icon = categoryIcon[place.category];
                          return (
                            <li key={place.slug}>
                              <Badge
                                href={`/${locale}/place/${place.slug}`}
                                icon={<Icon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
                                className="min-h-11"
                              >
                                {place.name[locale]}
                              </Badge>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                    <div className="pt-2">
                      <ButtonLink href={href} variant="secondary" size="sm" arrow>
                        {t.read}
                        <span className="sr-only">: {title}</span>
                      </ButtonLink>
                    </div>
                  </div>
                </article>
              </BlurFade>
            );
          })}
        </ol>
      </Wrap>
    </div>
  );
}
