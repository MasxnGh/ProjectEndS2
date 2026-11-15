import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { allPhotoCredits } from "@/data/photo-credits";
import { HOME_HERO } from "@/data/home-hero";
import { getPlaceBySlug } from "@/data/places";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { cx, focusRing } from "@/components/brand/cx";
import { ICON_STROKE } from "@/components/brand/icons";
import { PageHead } from "@/components/brand/page-head";
import { PlacePhoto } from "@/components/brand/place-photo";
import { Wrap } from "@/components/brand/surface";

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

  const textLink = cx(
    "rounded-xs underline-offset-4 hover:text-brand hover:underline hover:decoration-[1.5px]",
    focusRing,
  );

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap className="max-w-[calc(880px+4rem)]">
        <PageHead title={t.title} intro={t.intro} />

        <section aria-labelledby="credits-photos" className="grid gap-2">
          <h2 id="credits-photos" className="text-title font-semibold text-brand">
            {t.photosTitle}
          </h2>
          <p className="max-w-[68ch] text-body leading-[1.8] text-pretty text-ink-soft">{t.photosBody}</p>

          {credits.length === 0 ? (
            <p className="mt-4 rounded-lg bg-well p-6 text-body text-ink-soft">{t.photosEmpty}</p>
          ) : (
            <ul className="mt-4 divide-y divide-line rounded-lg border border-line bg-panel shadow-float">
              {credits.map((credit) => {
                const isHero = credit.slug === HOME_HERO.photo;
                const place = getPlaceBySlug(isHero ? HOME_HERO.place : credit.slug);
                const name = place ? (isHero ? `${place.name[loc]} · ${t.heroPhoto}` : place.name[loc]) : credit.slug;
                return (
                  <li
                    key={credit.slug}
                    className="grid grid-cols-[56px_minmax(0,1fr)] items-center gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[56px_minmax(0,1fr)_auto] sm:px-5"
                  >
                    {/* The photo itself, so a credit can be matched to the picture at a glance. */}
                    <div className="relative row-span-2 aspect-square overflow-hidden rounded-md bg-well sm:row-span-1">
                      <PlacePhoto slug={credit.slug} alt="" sizes="56px" />
                    </div>
                    <p className="grid min-w-0 gap-0.5">
                      <span className="text-body font-medium text-ink">
                        {place ? (
                          <Link href={`/${loc}/place/${place.slug}`} className={textLink}>
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                      </span>
                      <span className="text-small break-words text-ink-soft">{credit.artist}</span>
                    </p>
                    <a
                      href={credit.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cx(
                        "inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-sm text-small font-medium text-brand underline decoration-[1.5px] underline-offset-4 hover:decoration-2 sm:justify-self-end",
                        focusRing,
                      )}
                    >
                      {credit.licence}
                      <ExternalLink aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="credits-data" className="grid max-w-[68ch] gap-2 pt-14">
          <h2 id="credits-data" className="text-title font-semibold text-brand">
            {t.dataTitle}
          </h2>
          <p className="text-body leading-[1.8] text-pretty text-ink">{t.dataBody}</p>
        </section>

        <section aria-labelledby="credits-art" className="grid max-w-[68ch] gap-2 pt-10">
          <h2 id="credits-art" className="text-title font-semibold text-brand">
            {t.illustratedTitle}
          </h2>
          <p className="text-body leading-[1.8] text-pretty text-ink">{t.illustratedBody}</p>
        </section>
      </Wrap>
    </div>
  );
}
