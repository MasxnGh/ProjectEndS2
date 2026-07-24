import { cn } from "@/lib/utils";

export function MapSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-lg border border-border bg-surface-muted", className)}
      aria-hidden
    />
  );
}
