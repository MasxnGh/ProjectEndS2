import { Suspense } from "react";
import type { Metadata } from "next";
import { isLocale, getDictionary } from "@/i18n";
import { PlannerBoard } from "@/components/planner/planner-board";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = isLocale(locale) ? getDictionary(locale) : getDictionary("en");
  return { title: dict.planner.title, description: dict.planner.subtitle };
}

export default function PlannerPage() {
  return (
    <Suspense fallback={null}>
      <PlannerBoard />
    </Suspense>
  );
}
