import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Clock, MapPin, Star, Wallet } from "lucide-react";
import { getPlaceBySlug, getRelatedPlaces, places } from "@/data/places";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { PlaceImage } from "@/components/place-image";
import { getPlacePhoto } from "@/data/photo-manifest";
import { PlaceCard } from "@/components/place-card";
import { CompareMap } from "@/components/map/compare-map";
import { AddToPlanButton } from "@/components/add-to-plan-button";
import { Reveal } from "@/components/reveal";
import { PlaceWeatherPanel } from "@/components/weather/place-weather-panel";
import { SeasonalSmogBanner } from "@/components/weather/seasonal-smog-banner";

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
  return {
    title: place.name[loc],
    description: place.shortDescription[loc],
    openGraph: { title: place.name[loc], description: place.shortDescription[loc] },
  };
}

function formatDuration(minutes: number, labels: { minutes: string; hours: string }) {
  if (minutes < 60) return `${minutes} ${labels.minutes}`;
  const hours = Math.round((minutes / 60) * 10) / 10;
  return `${hours} ${labels.hours}`;
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

  const related = getRelatedPlaces(place, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristAttraction",
    name: place.name[locale],
    description: place.shortDescription[locale],
    touristType: dict.common.categories[place.category],
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.coordinates.lat,
      longitude: place.coordinates.lng,
    },
    address: place.address[locale],
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: place.rating,
      bestRating: 5,
    },
  };

  return (
    <div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <section className="relative flex h-[60vh] min-h-[420px] items-end overflow-hidden">
        <PlaceImage
          category={place.category}
          paletteSeed={place.paletteSeed}
          label={place.name[locale]}
          photoSrc={getPlacePhoto(place.slug)}
          priority
          className="absolute inset-0 h-full w-full"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
        <div className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-12 lg:px-10">
          <span className="mb-3 inline-block w-fit rounded-full bg-background/85 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-foreground">
            {dict.common.categories[place.category]}
          </span>
          <h1 className="font-serif-display text-4xl leading-[1.02] text-[#f3efe4] sm:text-5xl md:text-6xl">
            {place.name[locale]}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#f3efe4]/85">
            <span className="flex items-center gap-1.5">
              <Star className="h-4 w-4 fill-accent text-accent-text" />
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
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-10 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <Reveal>
              <h2 className="font-serif-display text-2xl">{dict.place.overview}</h2>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
                {place.description[locale]}
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-10 rounded-lg border-l-4 border-accent bg-surface-muted p-6">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-text">
                {dict.place.localTip}
              </p>
              <p className="mt-3 text-lg leading-relaxed text-pretty">{place.localTip[locale]}</p>
            </Reveal>

            <Reveal delay={0.15} className="mt-12">
              <h2 className="font-serif-display text-2xl">{dict.place.gallery}</h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <PlaceImage
                  category={place.category}
                  paletteSeed={place.paletteSeed}
                  className="aspect-square rounded-lg"
                />
                <PlaceImage
                  category={place.category}
                  paletteSeed={place.paletteSeed + 2}
                  className="aspect-square rounded-lg"
                />
                <PlaceImage
                  category={place.category}
                  paletteSeed={place.paletteSeed + 4}
                  className="aspect-square rounded-lg"
                />
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.1} className="space-y-6">
            <div className="rounded-lg border border-border p-6">
              <h3 className="font-serif-display text-lg">{dict.place.practicalInfo}</h3>
              <dl className="mt-4 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
                  <div>
                    <dt className="text-muted-foreground">{dict.common.openingHours}</dt>
                    <dd>{place.openingHours[locale]}</dd>
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
              <AddToPlanButton slug={place.slug} className="mt-6 w-full justify-center" />
            </div>

            <PlaceWeatherPanel place={place} />

            {place.outdoor ? <SeasonalSmogBanner /> : null}

            <CompareMap place={place} />
          </Reveal>
        </div>

        {related.length > 0 ? (
          <div className="mt-20 border-t border-border pt-12">
            <h2 className="font-serif-display text-2xl">{dict.place.nearby}</h2>
            <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <PlaceCard key={p.slug} place={p} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
