import { Section } from "@/components/ui/section";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFavoritesCollection } from "@/lib/db/collections";
import { isLocale, getDictionary, type Locale } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { FavoritesGallery } from "@/components/favorites/favorites-gallery";
import { Reveal } from "@/components/reveal";

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

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect(`/${loc}/login?callbackUrl=${encodeURIComponent(`/${loc}/favorites`)}`);
  }

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
    <Section as="div" width="default" rhythm="tight" className="lg:py-20">
      <Reveal as="div" className="max-w-2xl">
        <h1 className="font-serif-display text-4xl leading-tight sm:text-5xl">{dict.favorites.title}</h1>
        <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
          {dict.favorites.intro}
        </p>
      </Reveal>

      <FavoritesGallery initialSlugs={slugs} loadFailed={loadFailed} locale={loc} />
    </Section>
  );
}
