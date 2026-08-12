import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-serif-display text-xl", className)}>
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
        <path d="M10 1 L18 10 L10 19 L2 10 Z" stroke="var(--color-accent)" strokeWidth="1.4" />
        <circle cx="10" cy="10" r="2.5" fill="var(--color-accent)" />
      </svg>
      Chiangmai Journey
    </span>
  );
}
