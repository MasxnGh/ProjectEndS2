"use client";

import { Component, type ReactNode } from "react";
import { RotateCw } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { cn } from "@/lib/utils";

interface MapErrorBoundaryProps {
  children: ReactNode;
  fallback: (retry: () => void) => ReactNode;
}

interface MapErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-phase exceptions from the map subtree (e.g. a malformed
 * prop crashing JSX) so a broken map can never take the whole tab down.
 * Errors thrown inside MapLibre's own async event callbacks bypass React
 * error boundaries entirely — those are handled separately via the map's
 * onError prop and try/catch around direct camera calls.
 */
export class MapErrorBoundary extends Component<MapErrorBoundaryProps, MapErrorBoundaryState> {
  state: MapErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Map render error", error);
  }

  retry = () => this.setState({ hasError: false });

  render() {
    if (this.state.hasError) {
      return this.props.fallback(this.retry);
    }
    return this.props.children;
  }
}

export function MapErrorFallback({ className, onRetry }: { className?: string; onRetry: () => void }) {
  const { dict } = useLocale();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-border bg-surface-muted p-6 text-center",
        className
      )}
    >
      <p className="text-sm text-muted-foreground">{dict.common.mapUnavailable}</p>
      <button
        type="button"
        onClick={onRetry}
        className="flex items-center gap-1.5 rounded-full border border-border-strong px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-text"
      >
        <RotateCw className="h-3 w-3" />
        {dict.weather.retry}
      </button>
    </div>
  );
}
