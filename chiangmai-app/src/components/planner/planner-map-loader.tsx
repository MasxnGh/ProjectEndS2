"use client";

import dynamic from "next/dynamic";
import type { TripDay } from "@/components/planner/planner-map";
import { MapSkeleton } from "@/components/map/map-skeleton";

const PlannerMap = dynamic(() => import("@/components/planner/planner-map").then((mod) => mod.PlannerMap), {
  ssr: false,
  loading: () => <MapSkeleton className="h-[420px]" />,
});

export function PlannerMapLoader({ days }: { days: TripDay[] }) {
  return <PlannerMap days={days} className="h-[420px]" />;
}
