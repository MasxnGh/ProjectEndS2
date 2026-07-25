"use client";

import { useEffect } from "react";

/** Registers the offline app-shell service worker — production only, so Turbopack's dev HMR is never shadowed by a stale cached bundle. */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Installability is a progressive enhancement — silently skip if registration fails.
    });
  }, []);

  return null;
}
