import { CitySquareMark } from "@/components/city-square-mark";
import { cn } from "@/lib/utils";

/**
 * The wordmark, set in the display face beside the city's own plan.
 *
 * The mark used to be a rotated diamond, which is a shape any travel site could
 * have used. The square is Chiang Mai's actual footprint and doubles as the
 * site's position indicator, so the brand and the wayfinding are one thing.
 */
export function Logo({ className, markSize = 22 }: { className?: string; markSize?: number }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-serif-display text-xl tracking-tight",
        className
      )}
    >
      <CitySquareMark size={markSize} />
      Chiangmai Journey
    </span>
  );
}
