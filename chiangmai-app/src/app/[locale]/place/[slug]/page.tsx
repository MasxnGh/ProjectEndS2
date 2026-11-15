import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Award as AwardIcon,
  CalendarCheck,
  ChevronRight,
  Clock,
  Compass,
  ExternalLink,
  Footprints,
  Info,
  MapPin,
  Moon,
  Mountain,
  Shirt,
  Sun,
  Sunrise,
  Sunset,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getPlaceBySlug, places } from "@/data/places";
import { getPlacePhoto } from "@/data/photo-manifest";
import type { Award, GoldenHourType, Place } from "@/data/types";
import { isLocale, getDictionary, type Dictionary, type Locale } from "@/i18n";
import { locateInSquare } from "@/lib/city-square";
import { findNearbyExcluding } from "@/lib/geo/nearby";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { toJsonLdOpeningHoursSpecification } from "@/lib/opening-hours";
import { Badge } from "@/components/brand/badge";
import { cx, focusRing } from "@/components/brand/cx";
import { FavoriteToggle } from "@/components/brand/favorite-toggle";
import { categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { PlaceCardFor } from "@/components/brand/place-card";
import { NoPhoto, PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";
import { fill, formatDistance, formatDuration, placeWhere, priceSymbol } from "@/components/brand/place-text";
import { PlanToggle } from "@/components/brand/plan-toggle";
import { SectionHeading } from "@/components/brand/section-heading";
import { Box, Tip, Wrap } from "@/components/brand/surface";
import { CompareMap } from "@/components/map/compare-map";
import { HazeNote } from "@/components/place/haze-note";
import { PlaceActions, PlaceDock } from "@/components/place/place-actions";
import { PlaceWeather } from "@/components/place/place-weather";
import { ThaiName } from "@/components/brand/thai-name";

export function generateStaticParams() {
  return places.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const loc: Locale = isLocale(locale) ? locale : "en";
  const place = getPlaceBySlug(slug);
  if (!place) return {};
  return buildPageMetadata({
    locale: loc,
    path: `/place/${slug}`,
    title: place.name[loc],
    description: place.shortDescription[loc],
  });
}

/**
 * Years are the least verifiable part of an award, so every combination has to
 * read correctly — including the common one where we know a place holds a
 * distinction but not since when. That case returns null and the status badge
 * stands alone rather than inventing a range.
 */
function formatAwardYears(
  award: { firstYear: number | null; lastYear: number | null },
  t: { awardSince: string; awardYears: string },
): string | null {
  if (award.firstYear === null) return award.lastYear === null ? null : String(award.lastYear);
  if (award.lastYear === null) return fill(t.awardSince, { year: award.firstYear });
  if (award.lastYear === award.firstYear) return String(award.firstYear);
  return fill(t.awardYears, { from: award.firstYear, to: award.lastYear });
}

const GOLDEN_ICON: Record<GoldenHourType, LucideIcon> = {
  sunrise: Sunrise,
  sunset: Sunset,
  blue_hour: Sunset,
  night: Moon,
};

/** Below this the air is hardly cooler than in town (which sits near 310 m), so the "bring a layer" hint would mislead. */
const COOLER_FROM_M = 1000;

type BeforeItem = { icon: LucideIcon; title: string; hint?: string };

/** What to know before going, built only from what the data actually records. */
function beforeYouGo(place: Place, locale: Locale, dict: Dictionary): BeforeItem[] {
  const t = dict.placePage;
  const items: BeforeItem[] = [];
  const dress = place.dressCode;
  if (dress && (dress.coverShoulders || dress.coverKnees)) {
    items.push({
      icon: Shirt,
      title: t.dress,
      hint:
        dress.coverShoulders && dress.coverKnees
          ? t.dressDetail.both
          : dress.coverShoulders
            ? t.dressDetail.shoulders
            : t.dressDetail.knees,
    });
  }
  if (dress?.removeShoes) items.push({ icon: Footprints, title: t.shoes, hint: t.shoesHint });
  if (dress?.note) items.push({ icon: Info, title: dress.note[locale] });
  if (place.requiresBooking) items.push({ icon: CalendarCheck, title: t.booking, hint: t.bookingHint });
  if (place.goldenHourType) {
    items.push({ icon: GOLDEN_ICON[place.goldenHourType], title: t.golden[place.goldenHourType], hint: t.goldenHint });
  }
  if (place.elevation) {
    items.push({
      icon: Mountain,
      title: fill(t.elevation, { m: place.elevation.toLocaleString(locale === "th" ? "th-TH" : "en-GB") }),
      hint: place.elevation >= COOLER_FROM_M ? t.elevationHint : undefined,
    });
  }
  for (const note of place.insiderNotes ?? []) items.push({ icon: Info, title: note[locale] });
  return items;
}

function ArticleHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 font-brand text-title text-balance text-brand sm:text-[1.5rem] sm:leading-[1.35]">{children}</h2>;
}

function Paragraphs({ text }: { text: string }) {
  return (
    <div className="grid max-w-[66ch] gap-4 text-body text-pretty text-ink">
      {text.split(/\n{2,}/).map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}

function AwardItem({ award, locale, dict }: { award: Award; locale: Locale; dict: Dictionary }) {
  const t = dict.place;
  const years = formatAwardYears(award, t);
  return (
    <li className="flex items-start gap-3.5 border-t border-line py-4 first:border-t-0 first:pt-0 last:pb-0">
      <span aria-hidden className="grid size-10 flex-none place-items-center rounded-full bg-leaf-fill text-brand">
        <AwardIcon strokeWidth={ICON_STROKE} className="size-5" />
      </span>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="font-medium text-ink">{award.name[locale]}</span>
          {/* A distinction that has lapsed is a different claim from one still
              held, so the two never look the same. */}
          <Badge tone={award.current ? "leaf" : "well"}>{award.current ? t.awardHeld : t.awardPast}</Badge>
          {years ? <span className="text-small text-ink-soft tabular-nums">{years}</span> : null}
        </div>
        {/* A claim about someone else's business has to be checkable by whoever
            reads it: a link when we have a page for it, the source named in
            plain text when we do not. */}
        {award.sourceUrl ? (
          <a
            href={award.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(
              "inline-flex min-h-11 items-center gap-1.5 justify-self-start rounded-sm text-small font-medium text-brand underline-offset-4 hover:underline",
              focusRing,
            )}
          >
            {fill(t.awardSourceLink, { source: award.sourceName ?? new URL(award.sourceUrl).hostname })}
            <ExternalLink aria-hidden strokeWidth={ICON_STROKE} className="size-3.5" />
          </a>
        ) : (
          <p className="text-small text-ink-soft">{fill(t.awardSourcePlain, { source: award.source })}</p>
        )}
      </div>
    </li>
  );
}

function Fact({ icon: Icon, term, children }: { icon: LucideIcon; term: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-x-3 gap-y-0.5">
      <Icon aria-hidden strokeWidth={ICON_STROKE} className="row-span-2 mt-0.5 size-5 text-brand" />
      <dt className="col-start-2 text-small text-ink-soft">{term}</dt>
      <dd className="col-start-2 font-medium text-ink">{children}</dd>
    </div>
  );
}

const NEARBY_RADIUS_KM = 25;
const NEARBY_LIMIT = 4;

export default async function PlaceDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);
  const place = getPlaceBySlug(slug);
  if (!place) notFound();

  const t = dict.placePage;
  const name = place.name[locale];
  const otherLocale: Locale = locale === "th" ? "en" : "th";
  const where = placeWhere(place, dict);
  const CategoryIcon = categoryIcon[place.category];
  const placement = locateInSquare(place.coordinates);
  const zoneCount = places.filter((p) => locateInSquare(p.coordinates).bucket === placement.bucket).length;
  const before = beforeYouGo(place, locale, dict);
  const nearby = findNearbyExcluding(
    place.coordinates,
    places,
    NEARBY_RADIUS_KM,
    (p) => p.coordinates,
    (p) => p.slug === place.slug,
  ).slice(0, NEARBY_LIMIT);
  const dateFormat = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const photoPath = getPlacePhoto(place.slug);
  const openingHoursSpecification = toJsonLdOpeningHoursSpecification(place.openingHours, place.closedOnDays);
  // No aggregateRating: the catalogue's `rating` is an editorial figure, not
  // anyone's reviews, and search engines would show it as if it were.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name,
    description: place.shortDescription[locale],
    touristType: dict.common.categories[place.category],
    ...(photoPath ? { image: `${SITE_URL}${photoPath}` } : {}),
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.coordinates.lat,
      longitude: place.coordinates.lng,
    },
    address: place.address[locale],
    ...(openingHoursSpecification ? { openingHoursSpecification } : {}),
  };

  const crumbLink = cx(
    "inline-flex min-h-11 items-center rounded-sm text-ink-soft underline-offset-4 transition-colors duration-150 hover:text-brand hover:underline",
    focusRing,
  );

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-20">
      <script {...jsonLdScriptProps(jsonLd)} />
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(locale, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.explore, path: "/explore" },
            { name, path: `/place/${place.slug}` },
          ]),
        )}
      />

      <Wrap>
        <nav aria-label={t.crumbs} className="pt-2 text-small">
          <ol className="flex flex-wrap items-center gap-x-1.5">
            <li className="flex items-center gap-1.5">
              <Link href={`/${locale}`} className={crumbLink}>
                {dict.nav.home}
              </Link>
              <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-soft" />
            </li>
            <li className="flex items-center gap-1.5">
              <Link href={`/${locale}/explore`} className={crumbLink}>
                {dict.nav.explore}
              </Link>
              <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-4 text-ink-soft" />
            </li>
            <li>
              <Link href={`/${locale}/explore?category=${place.category}`} className={crumbLink}>
                {dict.common.categories[place.category]}
              </Link>
            </li>
          </ol>
        </nav>

        <header className="grid gap-5 pt-2 pb-6 lg:grid-cols-[1fr_auto] lg:items-end lg:gap-8">
          <div className="grid gap-3">
            <h1 className="text-[clamp(2rem,1.5rem+2.2vw,3.25rem)] leading-[1.25] font-semibold text-balance text-brand">
              <ThaiName text={name} />
            </h1>
            <p lang={otherLocale} className="text-body text-ink-soft">
              {place.name[otherLocale]}
            </p>
            <p className="max-w-[52ch] text-[1.125rem] leading-[1.6] text-pretty text-ink">
              {place.shortDescription[locale]}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge
                tone="leaf"
                href={`/${locale}/explore?category=${place.category}`}
                icon={<CategoryIcon aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
              >
                {dict.common.categories[place.category]}
              </Badge>
              <Badge icon={<MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>{where}</Badge>
              <Badge icon={<Clock aria-hidden strokeWidth={ICON_STROKE} className="size-4" />} className="tabular-nums">
                {fill(dict.ui.stay, { duration: formatDuration(place.durationMinutes, dict) })}
              </Badge>
              <Badge>
                <span aria-hidden>{priceSymbol(place.priceLevel)}</span>
                <span className="sr-only">{t.costValue[place.priceLevel]}</span>
              </Badge>
            </div>
          </div>
          <PlaceActions slug={place.slug} name={name} coordinates={place.coordinates} />
        </header>

        <figure>
          {/* Without a photograph there is nothing to look at, so the art takes
              less of the first screen than a photo would. */}
          <div
            className={cx(
              "overflow-hidden rounded-lg md:rounded-xl",
              photoPath ? "aspect-[4/3] md:aspect-[21/9]" : "aspect-[16/9] md:aspect-[32/9]",
            )}
          >
            <PlacePhoto
              slug={place.slug}
              alt={name}
              sizes="(min-width: 1344px) 1280px, calc(100vw - 2rem)"
              grade="golden"
              eager
              fallback={
                <NoPhoto
                  icon={CategoryIcon}
                  caption={where}
                  size="lg"
                  label={fill(dict.ui.noPhotoLabel, { category: dict.common.categories[place.category], where })}
                />
              }
            />
          </div>
          <figcaption className="mt-2">
            {photoPath ? (
              <PhotoCredit slug={place.slug} dict={dict} />
            ) : (
              <span className="text-credit text-ink-soft">{t.noPhoto}</span>
            )}
          </figcaption>
        </figure>

        <div className="grid gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14 lg:pt-12">
          <article className="grid content-start gap-10">
            <section>
              <ArticleHeading>{t.about}</ArticleHeading>
              <Paragraphs text={place.description[locale]} />
            </section>

            <Tip title={dict.place.localTip}>{place.localTip[locale]}</Tip>

            {place.story ? (
              <section>
                <ArticleHeading>{dict.place.story}</ArticleHeading>
                <Paragraphs text={place.story[locale]} />
              </section>
            ) : null}

            {place.signatureDishes && place.signatureDishes.length > 0 ? (
              <section>
                <ArticleHeading>{dict.place.signatureDishes}</ArticleHeading>
                {/* Numbered because the order is the recommendation. */}
                <ol className="grid max-w-[66ch]">
                  {place.signatureDishes.map((dish, index) => (
                    <li key={dish.name.en} className="flex gap-4 border-t border-line py-4 first:border-t-0 first:pt-1">
                      <span
                        aria-hidden
                        className="grid size-8 flex-none place-items-center rounded-full bg-sand-fill text-small font-semibold text-brand tabular-nums"
                      >
                        {index + 1}
                      </span>
                      <div className="grid min-w-0 flex-1 gap-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="font-medium text-ink">{dish.name[locale]}</p>
                          {/* Only a price someone confirmed. A missing figure beats a stale one. */}
                          {dish.priceThb !== null ? (
                            <span className="text-small font-medium text-brand tabular-nums">
                              ฿{dish.priceThb.toLocaleString("en-US")}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-small text-pretty text-ink-soft">{dish.note[locale]}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {place.awards && place.awards.length > 0 ? (
              <section>
                <ArticleHeading>{dict.place.awards}</ArticleHeading>
                <p className="mb-5 max-w-[66ch] text-small text-pretty text-ink-soft">{dict.place.awardSourceNote}</p>
                <ul className="grid max-w-[66ch]">
                  {place.awards.map((award) => (
                    <AwardItem key={award.name.en} award={award} locale={locale} dict={dict} />
                  ))}
                </ul>
              </section>
            ) : null}

            {before.length > 0 ? (
              <section>
                <ArticleHeading>{t.before}</ArticleHeading>
                <ul className="grid max-w-[66ch] gap-4">
                  {before.map((item) => (
                    <li key={item.title} className="flex items-start gap-3">
                      <span aria-hidden className="grid size-10 flex-none place-items-center rounded-full bg-well text-brand">
                        <item.icon strokeWidth={ICON_STROKE} className="size-5" />
                      </span>
                      {item.hint ? (
                        <p className="grid gap-0.5 pt-0.5">
                          <span className="font-medium text-ink">{item.title}</span>
                          <span className="text-small text-ink-soft">{item.hint}</span>
                        </p>
                      ) : (
                        <p className="pt-2 text-pretty text-ink">{item.title}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <aside aria-label={dict.place.practicalInfo} className="grid content-start gap-4 lg:sticky lg:top-24 lg:self-start">
            <Box className="grid gap-5 p-5">
              <dl className="grid gap-4">
                <Fact icon={Clock} term={t.hours}>
                  {place.openingHoursText[locale]}
                  <span className="block text-small font-normal text-ink-soft">
                    {place.dataLastVerified
                      ? fill(t.verified, { date: dateFormat.format(new Date(`${place.dataLastVerified}T00:00:00`)) })
                      : t.hoursHint}
                  </span>
                </Fact>
                <Fact icon={Sun} term={t.bestTime}>
                  {place.bestTime.map((b) => dict.common.bestTime[b]).join(" · ")}
                </Fact>
                <Fact icon={Wallet} term={t.cost}>
                  <span className="tabular-nums">
                    {priceSymbol(place.priceLevel)} · {t.costValue[place.priceLevel]}
                  </span>
                </Fact>
                <Fact icon={MapPin} term={t.address}>
                  <span className="font-normal">{place.address[locale]}</span>
                </Fact>
                <Fact icon={Compass} term={t.where}>
                  {dict.square.zones[placement.bucket]}
                  <span className="block text-small font-normal text-ink-soft tabular-nums">
                    {fill(t.fromCentre, { km: placement.km.toFixed(1) })}
                  </span>
                  <Link
                    href={`/${locale}/explore?zone=${placement.bucket}`}
                    className={cx(
                      "inline-flex min-h-11 items-center gap-1 rounded-sm text-small font-medium text-brand underline-offset-4 hover:underline",
                      focusRing,
                    )}
                  >
                    {fill(t.zoneAll, { count: zoneCount })}
                    <ArrowRight aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                  </Link>
                </Fact>
              </dl>
              <CompareMap place={place} />
              <PlanToggle slug={place.slug} placeName={name} variant="button" className="w-full" />
            </Box>

            <PlaceWeather place={place} />

            {place.outdoor ? <HazeNote /> : null}
          </aside>
        </div>

        {nearby.length > 0 ? (
          <section aria-labelledby="nearby-heading" className="pt-16 lg:pt-20">
            <SectionHeading id="nearby-heading" className="mb-2 sm:mb-3">
              {t.nearby}
            </SectionHeading>
            <p className="mb-6 text-small text-ink-soft sm:mb-8">{t.nearbyLead}</p>
            <ul role="list" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {nearby.map(({ item, distanceKm }) => (
                <li key={item.slug}>
                  <PlaceCardFor
                    place={item}
                    locale={locale}
                    dict={dict}
                    layout="auto"
                    sizes="(max-width: 640px) 34vw, (max-width: 1280px) 45vw, 300px"
                    className="h-full"
                    favorite={<FavoriteToggle slug={item.slug} placeName={item.name[locale]} />}
                    note={formatDistance(distanceKm, dict)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Wrap>

      <PlaceDock slug={place.slug} name={name} coordinates={place.coordinates} />
    </div>
  );
}
