import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Place } from "@/data/types";
import { HOME_HERO } from "@/data/home-hero";
import { getPlaceBySlug, places } from "@/data/places";
import { guides } from "@/data/guides";
import { isLocale, getDictionary } from "@/i18n";
import { buildSchedule } from "@/lib/planner/schedule";
import { dayStats } from "@/lib/trip-calculations";
import { buildPageMetadata } from "@/lib/seo";
import { websiteJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import {
  HomeCategories,
  HomeClosing,
  HomeFeatured,
  HomeGuides,
  HomeHero,
  HomePlanner,
} from "@/components/home/home-sections";

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

/** Our own five, the first one large. */
const FEATURED = ["wat-phra-that-doi-suthep", "wat-pha-lat", "mae-sa-waterfall", "wat-ban-den", "tha-phae-gate"];
/** A day the planner can actually time: down from Doi Suthep into the old city. */
const SAMPLE_DAY = ["wat-phra-that-doi-suthep", "wat-chedi-luang", "wat-phra-singh"];
const CLOSING = "kew-mae-pan-nature-trail";

/** Every slug above is ours; a missing one is a data error worth failing the build over. */
function place(slug: string): Place {
  const found = getPlaceBySlug(slug);
  if (!found) throw new Error(`Home page: no place with slug "${slug}"`);
  return found;
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = getDictionary(locale);

  const counts: Record<string, number> = {};
  for (const p of places) counts[p.category] = (counts[p.category] ?? 0) + 1;

  // The sample day goes through the planner's own scheduler and spend
  // estimate, so every time and baht figure on the page is one the planner
  // itself would show for this order.
  const sampleOrder = SAMPLE_DAY.map(place);
  const schedule = buildSchedule(sampleOrder);
  const { budgetThb } = dayStats(sampleOrder);

  return (
    <div data-brand className="bg-page font-brand text-ink">
      <script {...jsonLdScriptProps(websiteJsonLd(locale, dict.meta.siteName))} />
      <HomeHero locale={locale} dict={dict} total={places.length} hero={place(HOME_HERO.place)} photo={HOME_HERO.photo} />
      <HomeCategories locale={locale} dict={dict} counts={counts} />
      <HomeFeatured locale={locale} dict={dict} picks={FEATURED.map(place)} />
      <HomePlanner locale={locale} dict={dict} schedule={schedule} budgetThb={budgetThb} />
      <HomeGuides locale={locale} dict={dict} guides={guides} />
      <HomeClosing locale={locale} dict={dict} place={place(CLOSING)} />
    </div>
  );
}
