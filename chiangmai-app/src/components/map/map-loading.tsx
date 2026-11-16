"use client";

import { useLocale } from "@/components/providers/locale-provider";
import { MapLoading } from "@/components/brand/loaders";

/** What a map's frame shows while MapLibre loads (the `loading` of each map's dynamic import). */
export function MapLoadingState({ className = "size-full" }: { className?: string }) {
  const { dict } = useLocale();
  return <MapLoading label={dict.common.loading} className={className} />;
}
