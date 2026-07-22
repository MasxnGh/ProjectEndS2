import { Hero } from "@/components/landing/hero";
import { Intro } from "@/components/landing/intro";
import { Categories } from "@/components/landing/categories";
import { FeaturedExperiences } from "@/components/landing/featured-experiences";
import { PlannerPreview } from "@/components/landing/planner-preview";
import { GuidesPreview } from "@/components/landing/guides-preview";

export default function Home() {
  return (
    <>
      <Hero />
      <Intro />
      <Categories />
      <FeaturedExperiences />
      <PlannerPreview />
      <GuidesPreview />
    </>
  );
}
