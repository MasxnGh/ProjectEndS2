"use client";

import { useEffect, useState } from "react";
import { ReactLenis } from "lenis/react";

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const [smoothEnabled, setSmoothEnabled] = useState(true);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with a browser media query on mount
    setSmoothEnabled(!query.matches);
    const listener = (event: MediaQueryListEvent) => setSmoothEnabled(!event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  if (!smoothEnabled) return <>{children}</>;

  return (
    <ReactLenis root options={{ duration: 1.1, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
