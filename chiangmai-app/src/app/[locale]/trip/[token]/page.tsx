import { Section } from "@/components/ui/section";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Eye, MapPin } from "lucide-react";
import { findSharedTripByToken } from "@/lib/db/shared-trip";
import { toSerializedTrip, type SerializedTrip } from "@/lib/db/types";
import { getPlaceBySlug } from "@/data/places";
import { OpenInMapsLink } from "@/components/planner/open-in-maps-link";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { CopySharedTripButton } from "@/components/trips/copy-shared-trip-button";
import { Reveal } from "@/components/reveal";

/**
 * A share link is a capability: holding the token is what grants access. So
 * this page is never indexed and never previewed — an OG card or a search
 * result would republish a link its owner only sent to specific people.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

function countPlaces(trip: SerializedTrip): number {
  return trip.days.reduce((total, day) => total + day.stops.length, 0);
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const dict = getDictionary(loc);
  const t = dict.sharedTrip;

  let trip: SerializedTrip | null = null;
  try {
    const doc = await findSharedTripByToken(token);
    trip = doc ? toSerializedTrip(doc) : null;
  } catch {
    // Treated the same as "no such link": a database outage must not render a
    // crash page to someone who just clicked a link a friend sent.
    trip = null;
  }

  if (!trip) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-24 text-center lg:px-10">
        <h1 className="font-serif-display text-3xl sm:text-4xl">{t.notFound.title}</h1>
        <p className="mt-4 leading-relaxed text-muted-foreground text-pretty">{t.notFound.body}</p>
        <Link
          href={`/${loc}/planner`}
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          {t.notFound.cta}
        </Link>
      </div>
    );
  }

  const places = countPlaces(trip);

  return (
    <Section as="div" width="default" rhythm="tight" className="lg:py-20">
      <Reveal as="div">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent-text">{t.kicker}</p>
      <h1 className="mt-3 font-serif-display text-4xl leading-tight sm:text-5xl">
        {trip.title || dict.myTrips.untitled}
      </h1>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarRange className="h-4 w-4 text-accent-text" aria-hidden="true" />
          {trip.days.length === 1
            ? dict.myTrips.dayCountOne
            : dict.myTrips.dayCount.replace("{count}", String(trip.days.length))}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-accent-text" aria-hidden="true" />
          {places === 1
            ? dict.myTrips.placeCountOne
            : dict.myTrips.placeCount.replace("{count}", String(places))}
        </span>
      </div>

      <p className="mt-6 flex items-start gap-2.5 rounded-lg border-l-4 border-accent bg-surface-muted p-4 text-sm">
        <Eye className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
        {t.readOnly}
      </p>

      <div className="mt-8">
        <CopySharedTripButton token={token} locale={loc} />
      </div>
      </Reveal>

      <ol className="mt-12 space-y-10">
        {trip.days.map((day, index) => (
          // Reveal sits inside the <li>, not around it: an <ol> may only have
          // <li> children, and a wrapper div there is invalid markup.
          <li key={index}>
          <Reveal as="div" delay={Math.min(index, 6) * 0.06}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
              <h2 className="font-serif-display text-2xl">
                {t.dayLabel.replace("{day}", String(index + 1))}
              </h2>
              {/* Whoever opens a shared link is usually the one about to drive
                  it, so this is the surface that most needs the way out to
                  navigation. Built from the stops that still resolve — a slug
                  whose place has left the catalogue is shown below but cannot
                  be routed to. */}
              <OpenInMapsLink
                places={day.stops
                  .map((stop) => getPlaceBySlug(stop.placeSlug))
                  .filter((place): place is NonNullable<typeof place> => Boolean(place))}
              />
            </div>
            <ol className="mt-4 space-y-3">
              {day.stops.map((stop) => {
                const place = getPlaceBySlug(stop.placeSlug);
                // A slug can outlive its catalogue entry if a place is ever
                // removed; showing the raw slug beats dropping the stop
                // silently and making the shared day look shorter than it is.
                return (
                  <li
                    key={stop.placeSlug}
                    className="flex items-baseline gap-4 rounded-lg border border-border p-4"
                  >
                    {stop.plannedArrival ? (
                      <span className="w-14 shrink-0 tabular-nums text-sm text-muted-foreground">
                        {stop.plannedArrival}
                      </span>
                    ) : null}
                    <div className="flex-1">
                      {place ? (
                        <>
                          <Link
                            href={`/${loc}/place/${place.slug}`}
                            className="font-medium hover:text-accent-text"
                          >
                            {place.name[loc]}
                          </Link>
                          <p className="mt-0.5 text-sm text-muted-foreground">
                            {dict.common.districts[place.district]}
                          </p>
                        </>
                      ) : (
                        <span className="font-medium text-muted-foreground">{stop.placeSlug}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Reveal>
          </li>
        ))}
      </ol>
    </Section>
  );
}
