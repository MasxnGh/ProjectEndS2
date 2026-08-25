import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Award, Clock, ExternalLink, Info, MapPin, Star, Wallet } from "lucide-react";
import { getPlaceBySlug, places } from "@/data/places";
import { cn } from "@/lib/utils";
import { findNearbyExcluding } from "@/lib/geo/nearby";
import { estimateTravelMinutes } from "@/lib/geo/travelTime";
import type { TerrainType } from "@/lib/geo/distance";
import type { Place } from "@/data/types";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { getPhotoCredit } from "@/data/photo-credits";
import { getPlaceBlurDataURL } from "@/data/blur-manifest";
import { PlaceCard } from "@/components/place-card";
import { CompareMap } from "@/components/map/compare-map";
import { PlaceLocationCard } from "@/components/place-location-card";
import { Section, Container } from "@/components/ui/section";
import { AddToPlanButton } from "@/components/add-to-plan-button";
import { FavoriteButton } from "@/components/favorite-button";
import { SplitText } from "@/components/split-text";
import { MagneticButton } from "@/components/magnetic-button";
import { PlaceStickyActions } from "@/components/place-sticky-actions";
import { Reveal } from "@/components/reveal";
import { Suspense } from "react";
import { PlaceWeatherPanel, WeatherPanelSkeleton } from "@/components/weather/place-weather-panel";
import { WeatherErrorBoundary } from "@/components/weather/weather-error-boundary";
import { SeasonalSmogBanner } from "@/components/weather/seasonal-smog-banner";
import { buildPageMetadata } from "@/lib/seo";
import { SITE_URL } from "@/lib/site";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { toJsonLdOpeningHoursSpecification } from "@/lib/opening-hours";

export function generateStaticParams() {
  return places.map((p) => ({ slug: p.slug }));
}

/**
 * Years are the least verifiable part of an award, so every combination has to
 * read correctly — including the common one where we know a place holds a
 * distinction but not since when. That case returns null and the UI shows the
 * status badge alone rather than inventing a range.
 */
function formatAwardYears(
  award: { firstYear: number | null; lastYear: number | null },
  t: { awardSince: string; awardYears: string }
): string | null {
  if (award.firstYear === null) return award.lastYear === null ? null : String(award.lastYear);
  if (award.lastYear === null) return t.awardSince.replace("{year}", String(award.firstYear));
  if (award.lastYear === award.firstYear) return String(award.firstYear);
  return t.awardYears.replace("{from}", String(award.firstYear)).replace("{to}", String(award.lastYear));
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

function formatDuration(minutes: number, labels: { minutes: string; hours: string }) {
  if (minutes < 60) return `${minutes} ${labels.minutes}`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${labels.hours}`;
}

const NEARBY_RADIUS_KM = 20;
const NEARBY_LIMIT = 3;

function terrainBetween(a: Place, b: Place): TerrainType {
  return a.elevation || b.elevation ? "mountain" : "urban";
}

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

  const nearby = findNearbyExcluding(
    place.coordinates,
    places,
    NEARBY_RADIUS_KM,
    (p) => p.coordinates,
    (p) => p.slug === place.slug
  ).slice(0, NEARBY_LIMIT);
  const photoPath = getPlacePhoto(place.slug);
  const photoCredit = getPhotoCredit(place.slug);
  const openingHoursSpecification = toJsonLdOpeningHoursSpecification(place.openingHours, place.closedOnDays);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name[locale],
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
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: place.rating,
      bestRating: 5,
    },
  };

  return (
    <div>
      <script {...jsonLdScriptProps(jsonLd)} />
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(locale, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.explore, path: "/explore" },
            { name: place.name[locale], path: `/place/${place.slug}` },
          ])
        )}
      />
      <section className="relative flex h-[60vh] min-h-[420px] items-end overflow-hidden">
        <PlaceImage
          category={place.category}
          paletteSeed={place.paletteSeed}
          label={place.name[locale]}
          photoSrc={getPlacePhoto(place.slug)}
          priority
          sizes="100vw"
          placeholder={getPlaceBlurDataURL(place.slug) ? "blur" : undefined}
          blurDataURL={getPlaceBlurDataURL(place.slug)}
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

        {/* Naming the photographer is a licence condition for the CC BY-SA
            images this site uses, not a courtesy — so it rides with the photo
            rather than living only on a credits page someone has to find.
            Quiet, but not hidden: at 10px and 55% white it was effectively
            unreadable, and a licence condition nobody can read is not met. */}
        {photoCredit ? (
          <p className="absolute bottom-2 right-3 z-10 text-xs leading-tight text-white/80 [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]">
            <a
              href={photoCredit.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white hover:underline"
            >
              {dict.place.photoBy
                .replace("{artist}", photoCredit.artist)
                .replace("{licence}", photoCredit.licence)}
            </a>
          </p>
        ) : null}
        <Container width="wide" className="relative z-10 pb-12">
          <span className="mb-3 inline-block w-fit rounded-full bg-background/85 px-3 py-1 text-xs font-medium uppercase tracking-wide text-foreground">
            {dict.common.categories[place.category]}
          </span>
          {/* The same treatment the home hero gets, on the other title people
              actually land on. SplitText splits on spaces, so a Thai name —
              which has none — rises as a single block rather than word by
              word; verified that the clip mask still clears Thai tone marks. */}
          <SplitText
            as="h1"
            text={place.name[locale]}
            className="font-serif-display text-4xl leading-[1.02] text-band-foreground sm:text-5xl md:text-6xl"
          />
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-band-muted">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-band-accent text-band-accent" />
              {place.rating}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" />
              {dict.common.districts[place.district]}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {formatDuration(place.durationMinutes, dict.common)}
            </span>
          </div>
        </Container>
      </section>

      <Section as="div" width="default" rhythm="tight" className="lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <Reveal>
              <h2 className="font-serif-display text-2xl">{dict.place.overview}</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
                {place.description[locale]}
              </p>
            </Reveal>

            {place.story ? (
              <Reveal delay={0.05} className="mt-10">
                <h2 className="font-serif-display text-2xl">{dict.place.story}</h2>
                <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
                  {place.story[locale]}
                </p>
              </Reveal>
            ) : null}

            {place.awards && place.awards.length > 0 ? (
              <Reveal delay={0.05} className="mt-10">
                <h2 className="font-serif-display text-2xl">{dict.place.awards}</h2>
                <p className="mt-2 text-sm text-muted-foreground text-pretty">
                  {dict.place.awardSourceNote}
                </p>
                <ul className="mt-5 space-y-4">
                  {place.awards.map((award) => (
                    <li
                      key={award.name.en}
                      className="rounded-lg border border-accent/35 bg-accent/[0.04] p-5"
                    >
                      <div className="flex items-start gap-3.5">
                        <span
                          aria-hidden="true"
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent-text"
                        >
                          <Award className="h-4.5 w-4.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                            <span className="font-serif-display text-lg leading-snug">
                              {award.name[locale]}
                            </span>
                            {/* A distinction that has lapsed is a different claim
                                from one still held, so the two never render the
                                same way. */}
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                                award.current
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-surface-muted text-muted-foreground"
                              )}
                            >
                              {award.current ? dict.place.awardHeld : dict.place.awardPast}
                            </span>
                            {formatAwardYears(award, dict.place) ? (
                              <span className="text-sm tabular-nums text-muted-foreground">
                                {formatAwardYears(award, dict.place)}
                              </span>
                            ) : null}
                          </div>

                          {/* The point of the section. A claim about someone
                              else's business should be checkable by whoever
                              reads it, so the source is a link when we have a
                              page for it, and named in plain text when we do
                              not — never left implicit. */}
                          {award.sourceUrl ? (
                            <a
                              href={award.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-accent-text underline-offset-4 hover:underline"
                            >
                              {dict.place.awardSourceLink.replace(
                                "{source}",
                                award.sourceName ?? new URL(award.sourceUrl).hostname
                              )}
                              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                            </a>
                          ) : (
                            <p className="mt-2.5 text-xs text-muted-foreground">
                              {dict.place.awardSourcePlain.replace("{source}", award.source)}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {place.signatureDishes && place.signatureDishes.length > 0 ? (
              <Reveal delay={0.05} className="mt-10">
                <h2 className="font-serif-display text-2xl">{dict.place.signatureDishes}</h2>
                <ol className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border">
                  {place.signatureDishes.map((dish, index) => (
                    <li key={dish.name.en} className="flex gap-4 p-5">
                      {/* Numbered because the order is the recommendation —
                          these are listed in the order we'd try them, and an
                          unnumbered list loses that entirely. */}
                      <span
                        aria-hidden="true"
                        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-accent/40 font-serif-display text-sm text-accent-text"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                          <p className="font-medium">{dish.name[locale]}</p>
                          {/* Only shown when a price was actually confirmed. A
                              missing figure is more useful than a stale one. */}
                          {dish.priceThb !== null ? (
                            <span className="shrink-0 rounded-full bg-accent/12 px-2.5 py-0.5 text-sm tabular-nums text-accent-text">
                              ฿{dish.priceThb.toLocaleString("en-US")}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 leading-relaxed text-muted-foreground text-pretty">
                          {dish.note[locale]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Reveal>
            ) : null}

            {place.insiderNotes && place.insiderNotes.length > 0 ? (
              <Reveal delay={0.05} className="mt-10">
                <h2 className="font-serif-display text-2xl">{dict.place.insiderNotes}</h2>
                <ul className="mt-4 space-y-2.5">
                  {place.insiderNotes.map((note) => (
                    <li key={note.en} className="flex items-start gap-3 leading-relaxed text-pretty">
                      <Info className="mt-1 h-4 w-4 shrink-0 text-accent-text" />
                      <span className="text-muted-foreground">{note[locale]}</span>
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            <Reveal delay={0.1} className="mt-10 rounded-lg border-l-4 border-accent bg-surface-muted p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-text">
                {dict.place.localTip}
              </p>
              <p className="mt-3 text-lg leading-relaxed text-pretty">{place.localTip[locale]}</p>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="space-y-6">
            <PlaceLocationCard place={place} locale={locale} />

            <div className="rounded-lg border border-border p-6">
              <h3 className="font-serif-display text-lg">{dict.place.practicalInfo}</h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                  <div>
                    <dt className="text-muted-foreground">{dict.common.openingHours}</dt>
                    <dd>{place.openingHoursText[locale]}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                  <div>
                    <dt className="text-muted-foreground">{dict.common.address}</dt>
                    <dd>{place.address[locale]}</dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                  <div>
                    <dt className="text-muted-foreground">{dict.explore.filters.price}</dt>
                    <dd>
                      {"฿".repeat(place.priceLevel)} · {dict.common.price[place.priceLevel]}
                    </dd>
                  </div>
                </div>
              </dl>
              <PlaceStickyActions slug={place.slug} placeName={place.name[locale]} />
              <div className="mt-6 flex items-center gap-2">
                {/* MagneticButton renders an inline-block wrapper, so it needs
                    the flex sizing that used to sit on the button itself —
                    otherwise the CTA collapses to its content width. */}
                <MagneticButton className="flex-1">
                  <AddToPlanButton slug={place.slug} className="w-full justify-center" />
                </MagneticButton>
                <FavoriteButton
                  slug={place.slug}
                  placeName={place.name[locale]}
                  size="large"
                  className="h-11 w-11 shrink-0"
                />
              </div>
            </div>

            <WeatherErrorBoundary
              fallback={
                <div className="rounded-lg border border-border p-6">
                  <h3 className="font-serif-display text-lg">{dict.weather.place.forecastTitle}</h3>
                  <p className="mt-3 text-sm text-foreground/70">{dict.weather.error}</p>
                </div>
              }
            >
              <Suspense fallback={<WeatherPanelSkeleton />}>
                <PlaceWeatherPanel place={place} />
              </Suspense>
            </WeatherErrorBoundary>

            {place.outdoor ? <SeasonalSmogBanner /> : null}

            <CompareMap place={place} />
          </Reveal>
        </div>

        {nearby.length > 0 ? (
          <div className="mt-20 border-t border-border pt-12">
            <h2 className="font-serif-display text-2xl">{dict.place.nearby}</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map(({ item: p, distanceKm }) => (
                <PlaceCard
                  key={p.slug}
                  place={p}
                  distanceKm={distanceKm}
                  travelMinutes={estimateTravelMinutes(place.coordinates, p.coordinates, terrainBetween(place, p))}
                />
              ))}
            </div>
          </div>
        ) : null}
      </Section>
    </div>
  );
}
