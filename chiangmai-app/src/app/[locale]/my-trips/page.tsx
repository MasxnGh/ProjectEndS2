import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getTripsCollection } from "@/lib/db/collections";
import { toSerializedTrip, type SerializedTrip } from "@/lib/db/types";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { MyTripsList } from "@/components/trips/my-trips-list";

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

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    // Signed out: send them to sign in and come back here afterwards. This is
    // the only page in the app that requires an account — the planner itself
    // stays fully usable as a guest.
    redirect(`/${loc}/login?callbackUrl=${encodeURIComponent(`/${loc}/my-trips`)}`);
  }

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
    <div className="mx-auto max-w-6xl px-6 py-16 lg:px-10 lg:py-20">
      <header className="max-w-2xl">
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">{dict.myTrips.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {dict.myTrips.intro}
        </p>
      </header>

      <MyTripsList initialTrips={trips} loadFailed={loadFailed} locale={loc} />
    </div>
  );
}
