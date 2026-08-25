import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Intro } from "@/components/landing/intro";
import { Orientation } from "@/components/landing/orientation";
import { FeaturedExperiences } from "@/components/landing/featured-experiences";
import { PlannerPreview } from "@/components/landing/planner-preview";
import { GuidesPreview } from "@/components/landing/guides-preview";
import { buildSquareSummary, buildCategoryCounts } from "@/lib/city-square-summary";
import { isLocale, getDictionary } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { websiteJsonLd, jsonLdScriptProps } from "@/lib/json-ld";

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
    path: "",
    title: dict.meta.titleSuffix,
    description: dict.home.intro.body,
  });
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);
  // Derived on the server so the 193-place catalogue stays out of the client
  // bundle; what ships is a few hundred rounded coordinates and seven counts.
  const { zones, points } = buildSquareSummary();
  const categories = buildCategoryCounts();

  /*
   * The page reads top to bottom as: arrive, pause, get your bearings, look,
   * plan, read.
   *
   * Every section used to carry the same shell — `max-w-7xl px-6 py-24
   * lg:py-32` — so the page was five identical slabs whatever was inside them.
   * Each one now picks its own width and rhythm, and the planner is the single
   * full-bleed inversion that breaks the sheet in half.
   */
  return (
    <>
      <script {...jsonLdScriptProps(websiteJsonLd(loc, dict.meta.siteName))} />
      <Hero />
      <Intro />
      <Orientation zones={zones} points={points} categories={categories} />
      <FeaturedExperiences />
      <PlannerPreview />
      <GuidesPreview />
    </>
  );
}
