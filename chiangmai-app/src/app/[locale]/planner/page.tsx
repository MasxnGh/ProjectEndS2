import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { buildPageMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, jsonLdScriptProps } from "@/lib/json-ld";
import { PlannerBoard } from "@/components/planner/planner-board";
import { isAiPlannerConfigured } from "@/lib/ai/plan-trip";

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
    path: "/planner",
    title: dict.planner.title,
    description: dict.planner.subtitle,
  });
}

export default async function PlannerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const loc = isLocale(locale) ? locale : "en";
  const dict = getDictionary(loc);

  return (
    <>
      <script
        {...jsonLdScriptProps(
          breadcrumbJsonLd(loc, [
            { name: dict.nav.home, path: "" },
            { name: dict.nav.planner, path: "/planner" },
          ])
        )}
      />
      {/* Read on the server so the API key never has to be probed from the
          client — without a key the panel simply never renders. */}
      <PlannerBoard aiEnabled={isAiPlannerConfigured()} />
    </>
  );
}
