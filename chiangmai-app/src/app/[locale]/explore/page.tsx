import { Suspense } from "react";
import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { ExploreClient } from "./explore-client";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");
  return { title: dict.explore.title, description: dict.explore.subtitle };
}

export default function ExplorePage() {
  return (
    <Suspense fallback={null}>
      <ExploreClient />
    </Suspense>
  );
}
