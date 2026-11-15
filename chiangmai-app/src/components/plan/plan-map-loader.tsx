"use client";

import dynamic from "next/dynamic";
import { RotateCw } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { cx } from "@/components/brand/cx";
import { Button } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { MapErrorBoundary } from "@/components/map/map-error-boundary";
import type { PlanMapProps } from "./plan-map";

function MapPlaceholder({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse bg-[#f4eee9] dark:bg-[#13231f]", className)} />;
}

const PlanMap = dynamic(() => import("./plan-map").then((mod) => mod.PlanMap), {
  ssr: false,
  loading: () => <MapPlaceholder className="size-full" />,
});

function MapFallback({ onRetry, className }: { onRetry: () => void; className?: string }) {
  const { dict } = useLocale();
  return (
    <div className={cx("grid content-center justify-items-center gap-3 bg-well p-6 text-center font-brand", className)}>
      <p className="text-small text-ink-soft">{dict.common.mapUnavailable}</p>
      <Button
        variant="secondary"
        size="sm"
        onClick={onRetry}
        icon={<RotateCw aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
      >
        {dict.weather.retry}
      </Button>
    </div>
  );
}

/** MapLibre needs `window`, so the planner map loads in the browser only. */
export function PlanMapLoader({ className, ...props }: PlanMapProps) {
  return (
    <MapErrorBoundary fallback={(retry) => <MapFallback onRetry={retry} className={className} />}>
      <PlanMap {...props} className={className} />
    </MapErrorBoundary>
  );
}
