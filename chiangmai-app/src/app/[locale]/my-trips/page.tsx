import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionState } from "@/lib/session-state";
import { getTripsCollection } from "@/lib/db/collections";
import { toSerializedTrip, type SerializedTrip } from "@/lib/db/types";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { MyTripsList } from "@/components/trips/my-trips-list";
import { AccountUnavailable } from "@/components/brand/account-unavailable";
import { PageHead } from "@/components/brand/page-head";
import { Wrap } from "@/components/brand/surface";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = getDictionary(locale);
  return {
    ...buildPageMetadata({
      locale,
      path: "/my-trips",
      title: dict.myTrips.title,
      description: dict.myTrips.intro,
    }),
    // A personal list has nothing to index and shouldn't be crawled even if a
    // URL leaks; it is behind a session anyway, so this only removes noise.
    robots: { index: false, follow: false },
  };
}

/**
 * Reads the trips directly from the database rather than fetching this app's
 * own /api/trips — the route handler exists for the client, and going through
 * HTTP here would mean a second round trip plus forwarding the session cookie
 * by hand for no benefit. The ownerId filter is the same either way.
 */
async function loadTrips(userId: string): Promise<SerializedTrip[]> {
  const trips = await getTripsCollection();
  const docs = await trips
    .find({ ownerId: userId, deletedAt: null })
    .sort({ updatedAt: -1 })
    .toArray();
  return docs.map(toSerializedTrip);
}

export default async function MyTripsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const dict = getDictionary(loc);

  const sessionState = await getSessionState();
  if (sessionState.status === "unavailable") {
    // Signed in, as far as anyone can tell, but the database can't confirm
    // it right now. Asking them to sign in again would fail the same way.
    return (
      <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
        <Wrap>
          <PageHead title={dict.myTrips.title} intro={dict.myTrips.intro} />
          <AccountUnavailable dict={dict} retryHref={`/${loc}/my-trips`} />
        </Wrap>
      </div>
    );
  }
  if (sessionState.status === "signed-out") {
    // Signed out: send them to sign in and come back here afterwards. The
    // planner itself stays fully usable as a guest.
    redirect(`/${loc}/login?callbackUrl=${encodeURIComponent(`/${loc}/my-trips`)}`);
  }
  const { userId } = sessionState;

  let trips: SerializedTrip[] = [];
  let loadFailed = false;
  try {
    trips = await loadTrips(userId);
  } catch {
    // A database outage shouldn't render a crash page — show the shell with an
    // empty state rather than a stack trace.
    loadFailed = true;
  }

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap>
        <PageHead title={dict.myTrips.title} intro={dict.myTrips.intro} />
        <MyTripsList initialTrips={trips} loadFailed={loadFailed} locale={loc} />
      </Wrap>
    </div>
  );
}
