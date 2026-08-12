import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { places } from "@/data/places";
import type { PlaceCategory } from "@/data/types";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { ExploreClient } from "./explore-client";

const CATEGORIES: PlaceCategory[] = [
  "temple",
  "nature",
  "village",
  "cafe",
  "restaurant",
  "market",
  "museum",
  "activity",
];

function isPlaceCategory(value: string | undefined): value is PlaceCategory {
  return Boolean(value) && (CATEGORIES as string[]).includes(value as string);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  return buildPageMetadata({
    locale: loc,
    path: "/explore",
    title: dict.explore.title,
    description: dict.explore.subtitle,
  });
}

export default async function ExplorePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ category?: string; q?: string; from?: string; day?: string; view?: string }>;
}) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  const { category, q, from, day, view } = await searchParams;
  const initialCategory = isPlaceCategory(category) ? category : null;
  const initialView = view === "map" ? "map" : "grid";
  const parsedDay = Number(day);
  const plannerDayNumber = from === "planner" && Number.isInteger(parsedDay) && parsedDay > 0 ? parsedDay : null;

  return (
    <>
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.explore, path: "/explore" },
          ])
        )}
      />
      <ExploreClient
        places={places}
        initialCategory={initialCategory}
        initialQuery={q ?? ""}
        initialView={initialView}
        plannerDayNumber={plannerDayNumber}
      />
    </>
  );
}
