import type { Metadata } from "next";
import { Hero } from "@/components/landing/hero";
import { Intro } from "@/components/landing/intro";
import { Categories } from "@/components/landing/categories";
import { FeaturedExperiences } from "@/components/landing/featured-experiences";
import { PlannerPreview } from "@/components/landing/planner-preview";
import { GuidesPreview } from "@/components/landing/guides-preview";
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

  return (
    <>
      <script {...jsonLdScriptProps(websiteJsonLd(loc, dict.meta.siteName))} />
      <Hero />
      <Intro />
      <Categories />
      <FeaturedExperiences />
      <PlannerPreview />
      <GuidesPreview />
    </>
  );
}
