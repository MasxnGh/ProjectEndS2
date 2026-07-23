"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback: ReactNode;
}

interface State {
  hasError: boolean;
}

// A plain client-side data-fetch failure (e.g. Open-Meteo being down) never
// throws — it's already handled as a status state inside the weather hooks.
// This boundary exists as a last-resort guard so an unexpected bug in the
// weather UI itself can't take down the rest of the page around it.
export class WeatherErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}
