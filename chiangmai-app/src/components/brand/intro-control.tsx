"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { INTRO_END_ANIMATION } from "@/lib/intro";

/**
 * What the intro needs from script, once React is running
 * (<Intro> and lib/intro.ts hold the rest):
 *
 * - A tap, a key or a scroll while it plays skips it (`data-intro="skip"`):
 *   the panel fades out and the page's arrival catches up.
 * - When it has run its course, `data-intro="over"`: the panel is gone but the
 *   hero keeps its later start, so the words are not cut short.
 * - On leaving the first page, the attribute goes, so coming back to the home
 *   page later in the visit gets the normal arrival with no wait.
 */
export function IntroControl() {
  const pathname = usePathname();
  const [firstPath] = useState(pathname);

  useEffect(() => {
    const html = document.documentElement;
    if (pathname !== firstPath) {
      html.removeAttribute("data-intro");
      return;
    }
    if (html.dataset.intro !== "play") return;

    const events = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
    let stopped = false;
    const stop = () => {
      stopped = true;
      for (const name of events) window.removeEventListener(name, skip);
    };
    const skip = () => {
      if (html.dataset.intro === "play") html.dataset.intro = "skip";
      stop();
    };
    const over = () => {
      if (stopped) return;
      if (html.dataset.intro === "play") html.dataset.intro = "over";
      stop();
    };
    // Wait on the CSS that ends the intro, not a clock of our own: it starts
    // when the styles first apply, which on a slow line is well after the page
    // began loading. If React arrives after it ended, `finished` has already
    // settled and this runs at once. A skip cancels it (the promise rejects).
    const end = document
      .querySelector(".cmj-intro")
      ?.getAnimations()
      .find((a) => a instanceof CSSAnimation && a.animationName === INTRO_END_ANIMATION);
    if (end) end.finished.then(over, () => {});
    else over();
    for (const name of events) window.addEventListener(name, skip, { passive: true });
    return stop;
  }, [pathname, firstPath]);

  return null;
}
