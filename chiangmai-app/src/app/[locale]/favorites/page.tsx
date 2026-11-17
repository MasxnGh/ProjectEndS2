import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionState } from "@/lib/session-state";
import { getFavoritesCollection } from "@/lib/db/collections";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { FavoritesGallery } from "@/components/favorites/favorites-gallery";
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
      path: "/favorites",
      title: dict.favorites.title,
      description: dict.favorites.intro,
    }),
    robots: { index: false, follow: false },
  };
}

export default async function FavoritesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc: Locale = locale;
  const dict = getDictionary(loc);

  const sessionState = await getSessionState();
  if (sessionState.status === "unavailable") {
    return (
      <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
        <Wrap>
          <PageHead title={dict.favorites.title} intro={dict.favorites.intro} />
          <AccountUnavailable dict={dict} retryHref={`/${loc}/favorites`} />
        </Wrap>
      </div>
    );
  }
  if (sessionState.status === "signed-out") {
    redirect(`/${loc}/login?callbackUrl=${encodeURIComponent(`/${loc}/favorites`)}`);
  }
  const { userId } = sessionState;

  // Read straight from the collection for the first paint; the client
  // provider takes over afterwards so a heart toggled here updates instantly
  // without a refetch.
  let slugs: string[] = [];
  let loadFailed = false;
  try {
    const favorites = await getFavoritesCollection();
    const docs = await favorites.find({ userId }).sort({ createdAt: -1 }).toArray();
    slugs = docs.map((doc) => doc.placeSlug);
  } catch {
    loadFailed = true;
  }

  return (
    <div data-brand className="bg-page pb-16 font-brand text-ink lg:pb-24">
      <Wrap>
        <PageHead title={dict.favorites.title} intro={dict.favorites.intro} />
        <FavoritesGallery initialSlugs={slugs} loadFailed={loadFailed} locale={loc} />
      </Wrap>
    </div>
  );
}
