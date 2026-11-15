"use client";

import { Component, type ReactNode } from "react";

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
