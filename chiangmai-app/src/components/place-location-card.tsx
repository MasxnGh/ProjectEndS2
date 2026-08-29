import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CitySquareMap } from "@/components/landing/city-square-map";
import { locateInSquare } from "@/lib/city-square";
import { places } from "@/data/places";
import type { Place } from "@/data/types";
import { getDictionary, type Locale } from "@/i18n";

/**
 * Where this place sits relative to the old city wall.
 *
 * The page already says which district a place is in, but a district name is
 * only useful to someone who has learnt the districts. This says the thing a
 * visitor can act on before they know the city at all — inside the walls, or
 * west of the moat toward Doi Suthep — and draws it, using the same plan the
 * landing page uses, so the mark in the header means something by the time
 * anyone reaches here.
 *
 * A server component: the placement and the zone count are computed from the
 * catalogue at build time, and only the drawing crosses into the client.
 */
export function PlaceLocationCard({ place, locale }: { place: Place; locale: Locale }) {
  const dict = getDictionary(locale);
  const t = dict.square;
  const placement = locateInSquare(place.coordinates);

  const zoneCount = places.filter(
    (candidate) => locateInSquare(candidate.coordinates).bucket === placement.bucket
  ).length;

  return (
    <div className="rounded-lg border border-border p-6">
      <h3 className="font-serif-display text-lg">{t.placeTitle}</h3>

      {placement.point ? (
        <div className="mx-auto mt-4 w-full max-w-[15rem]">
          <CitySquareMap
            points={[{ x: placement.point.x, y: placement.point.y, bucket: placement.bucket }]}
            title={t.zones[placement.bucket]}
            active={null}
          />
        </div>
      ) : null}

      <p className="mt-4 text-sm font-medium">{t.zones[placement.bucket]}</p>
      <p className="mt-1 font-mono text-sm tabular-nums text-muted-foreground">
        {t.fromCentre.replace("{km}", placement.km.toFixed(1))}
      </p>

      <Link
        href={`/${locale}/explore?zone=${placement.bucket}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline"
      >
        {t.seeAll.replace("{count}", String(zoneCount))}
        <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
