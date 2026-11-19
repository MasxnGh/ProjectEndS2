import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarRange, Eye, MapPin, Navigation, Share2 } from "lucide-react";
import { findSharedTripByToken } from "@/lib/db/shared-trip";
import { toSerializedTrip, type SerializedTrip } from "@/lib/db/types";
import { getPlaceBySlug } from "@/data/places";
import type { Place, TripStop } from "@/data/types";
import { isLocale, getDictionary, type Dictionary, type Locale } from "@/i18n";
import { Badge } from "@/components/brand/badge";
import { ButtonLink, buttonStyles } from "@/components/brand/button";
import { cx, focusRing } from "@/components/brand/cx";
import { categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { NoPhoto, PhotoCredit, PlacePhoto } from "@/components/brand/place-photo";
import { coverSlug, tripStopSlugs } from "@/lib/trip-cover";
import { fill, placeWhere } from "@/components/brand/place-text";
import { Wrap } from "@/components/brand/surface";
import { dayMapsLink } from "@/components/plan/maps-link";
import { TripCoverFigure } from "@/components/plan/trip-cover-image";
import { dayCountLabel, longDayDate, placeCountLabel, stopsLabel, tripRange } from "@/components/plan/plan-text";
import { CopySharedTripButton } from "@/components/trips/copy-shared-trip-button";
import { ThaiName } from "@/components/brand/thai-name";

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

/** The trip's dates on one line, from the days that have one. */
function datesLabel(trip: SerializedTrip, locale: Locale): string | null {
  const dates = trip.days.map((day) => day.date).filter((date): date is string => Boolean(date));
  if (dates.length === 0) return null;
  return tripRange(dates[0], dates[dates.length - 1], locale);
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
      <div data-brand className="bg-page font-brand text-ink">
        <Wrap className="grid max-w-[calc(640px+4rem)] justify-items-center gap-4 py-20 text-center sm:py-28">
          <span aria-hidden className="grid size-14 place-items-center rounded-full bg-well text-brand">
            <MapPin strokeWidth={ICON_STROKE} className="size-6" />
          </span>
          <h1 className="text-headline text-balance text-brand">{t.notFound.title}</h1>
          <p className="max-w-[48ch] text-body text-pretty text-ink-soft">{t.notFound.body}</p>
          <ButtonLink href={`/${loc}/planner`} arrow className="mt-4">
            {t.notFound.cta}
          </ButtonLink>
        </Wrap>
      </div>
    );
  }

  const placeTotal = countPlaces(trip);
  const dates = datesLabel(trip, loc);
  // The place photo is the cover, or what an uploaded cover falls back to.
  const cover = coverSlug(trip.cover, tripStopSlugs(trip.days));
  const coverPlace = cover ? getPlaceBySlug(cover) : undefined;
  const upload = trip.cover?.kind === "upload" ? trip.cover : null;

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-20">
      <Wrap className="max-w-[calc(880px+4rem)]">
        <header className="grid gap-4 pt-8 pb-10 sm:pt-12">
          {upload || cover ? (
            <TripCoverFigure
              upload={upload}
              placeSlug={cover}
              uploadAlt={dict.plan.cover.altUpload}
              placeAlt={coverPlace ? fill(dict.plan.cover.alt, { place: coverPlace.name[loc] }) : ""}
              sizes="(max-width: 960px) calc(100vw - 32px), 880px"
              grade="golden"
              eager
              className="mb-2 grid gap-2"
              frameClassName="relative aspect-[2/1] overflow-hidden rounded-lg bg-sand-fill sm:aspect-[5/2]"
              credit={cover ? <PhotoCredit slug={cover} dict={dict} placeName={coverPlace?.name[loc]} /> : null}
            />
          ) : null}
          {/* No kicker above the title (DESIGN.md): that it was shared is a badge beside the facts. */}
          <h1 className="text-[clamp(2rem,1.5rem+2.2vw,3.25rem)] leading-[1.25] font-semibold text-balance text-brand">
            {trip.title || dict.myTrips.untitled}
          </h1>
          <div className="flex flex-wrap gap-2">
            <Badge tone="leaf" icon={<Share2 aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}>
              {t.kicker}
            </Badge>
            <Badge icon={<CalendarRange aria-hidden strokeWidth={ICON_STROKE} className="size-4" />} className="tabular-nums">
              {dates ? `${dayCountLabel(trip.days.length, dict)} · ${dates}` : dayCountLabel(trip.days.length, dict)}
            </Badge>
            <Badge icon={<MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4" />} className="tabular-nums">
              {placeCountLabel(placeTotal, dict)}
            </Badge>
          </div>

          <div className="mt-2 flex items-start gap-3 rounded-lg bg-sand-fill p-4 text-body text-pretty">
            <Eye aria-hidden strokeWidth={ICON_STROKE} className="mt-1 size-5 flex-none text-brand" />
            <p>
              {t.readOnly} <span className="text-ink-soft">{t.timesNote}</span>
            </p>
          </div>

          <div className="pt-2">
            <CopySharedTripButton token={token} locale={loc} />
          </div>
        </header>

        <ol className="grid gap-10">
          {trip.days.map((day, index) => (
            <SharedDay key={index} dayNumber={index + 1} date={day.date} stops={day.stops} locale={loc} dict={dict} />
          ))}
        </ol>

        <p className="mt-12 border-t border-line pt-8 text-center">
          <ButtonLink href={`/${loc}/planner`} variant="ghost" arrow>
            {t.notFound.cta}
          </ButtonLink>
        </p>
      </Wrap>
    </div>
  );
}

function SharedDay({
  dayNumber,
  date,
  stops,
  locale,
  dict,
}: {
  dayNumber: number;
  date: string | null;
  stops: TripStop[];
  locale: Locale;
  dict: Dictionary;
}) {
  const t = dict.sharedTrip;
  const headingId = `shared-day-${dayNumber}`;
  // Whoever opens a shared link is usually the one about to drive it, so this
  // is the surface that most needs the way out to navigation. Built from the
  // stops that still resolve: a slug whose place has left the catalogue is
  // listed below but cannot be routed to.
  const places = stops.map((stop) => getPlaceBySlug(stop.placeSlug)).filter((place): place is Place => Boolean(place));
  const mapsLink = dayMapsLink(places, dict, dict.planner.route.openInGoogleMaps);

  return (
    <li>
      <section aria-labelledby={headingId}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
          <div className="grid gap-1">
            <h2 id={headingId} className="text-headline text-brand">
              {fill(t.dayLabel, { day: dayNumber })}
            </h2>
            <p className="text-small text-ink-soft tabular-nums">
              {/* An empty day says so in its own box below; "0 stops" here would say it twice. */}
              {[date ? longDayDate(date, locale) : null, stops.length > 0 ? stopsLabel(stops.length, dict) : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
          {mapsLink ? (
            <a
              href={mapsLink.href}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              <Navigation aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
              {mapsLink.label}
            </a>
          ) : null}
        </div>

        {stops.length === 0 ? (
          <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-body text-ink-soft">
            {t.dayEmpty}
          </p>
        ) : (
          <ol className="rounded-lg border border-line bg-panel shadow-float">
            {stops.map((stop, stopIndex) => (
              <SharedStop key={`${stop.placeSlug}-${stopIndex}`} stop={stop} order={stopIndex + 1} locale={locale} dict={dict} />
            ))}
          </ol>
        )}
      </section>
    </li>
  );
}

function SharedStop({ stop, order, locale, dict }: { stop: TripStop; order: number; locale: Locale; dict: Dictionary }) {
  const t = dict.sharedTrip;
  const place = getPlaceBySlug(stop.placeSlug);
  const Icon = place ? categoryIcon[place.category] : MapPin;

  return (
    <li className="grid grid-cols-[52px_minmax(0,1fr)] items-start gap-3 border-t border-line p-4 first:border-t-0 sm:grid-cols-[60px_64px_minmax(0,1fr)] sm:gap-4">
      {/* The time the owner saved. It is shown as saved, not worked out again
          here: the page reads someone else's plan, it does not re-plan it. */}
      <p className="pt-0.5 leading-[1.3] tabular-nums">
        {stop.plannedArrival ? (
          <span className="text-label font-semibold text-brand">{stop.plannedArrival}</span>
        ) : (
          <span className="text-credit text-ink-soft">{t.noTime}</span>
        )}
      </p>

      <div className="relative hidden size-16 overflow-hidden rounded-md sm:block">
        {place ? (
          <PlacePhoto
            slug={place.slug}
            alt=""
            sizes="64px"
            fallback={<NoPhoto icon={Icon} label={dict.common.categories[place.category]} size="sm" className="p-0" />}
          />
        ) : (
          <NoPhoto icon={Icon} label={t.missingPlace} size="sm" className="p-0" />
        )}
      </div>

      <div className="grid min-w-0 gap-1">
        <p className="flex min-w-0 items-start gap-2">
          <span
            aria-hidden
            className="mt-0.5 grid size-6 flex-none place-items-center rounded-full bg-brand text-credit font-semibold text-on-brand tabular-nums"
          >
            {order}
          </span>
          {place ? (
            <Link
              href={`/${locale}/place/${place.slug}`}
              className={cx("min-w-0 text-label leading-[1.4] text-ink hover:underline hover:underline-offset-2", focusRing)}
            >
              <span className="sr-only">{order}. </span>
              <ThaiName text={place.name[locale]} />
            </Link>
          ) : (
            // A slug can outlive its catalogue entry if a place is ever
            // removed; showing it beats dropping the stop silently and making
            // the shared day look shorter than it is.
            <span className="min-w-0 text-label leading-[1.4] break-words text-ink-soft">{stop.placeSlug}</span>
          )}
        </p>
        <p className="text-small text-pretty text-ink-soft">
          {place ? `${dict.common.categories[place.category]} · ${placeWhere(place, dict)}` : t.missingPlace}
        </p>
      </div>
    </li>
  );
}
