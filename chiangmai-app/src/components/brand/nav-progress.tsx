"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { leavesPage } from "@/lib/nav-progress";

/** A page that arrives within this long gets no line at all. */
const SHOW_AFTER_MS = 120;
/** If a page never arrives (offline, a cancelled click), the line gives up. */
const GIVE_UP_MS = 12_000;
/** Long enough for the finish and the fade in motion.css. */
const CLEAR_AFTER_MS = 650;

type State = "idle" | "loading" | "done";

/**
 * The page line: while the next page loads, a line in the voice colour runs
 * along the top edge of the window (app/motion.css, ".cmj-nav-progress").
 *
 * There is deliberately no `loading.tsx`: it would stream every page and lock
 * the status at 200, so a missing place or trip could no longer answer 404.
 * This line is the feedback instead. It starts when a link to another page
 * of the site is clicked and finishes when the path changes. Decoration only
 * (`aria-hidden`): the browser and assistive tech already know a page is
 * loading, and the new page's title is announced when it lands.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<State>("idle");
  const [shownFor, setShownFor] = useState(pathname);

  // The page arrived: finish the line. (Set while rendering, so it is never a
  // frame late; see "Adjusting some state when a prop changes" in the React docs.)
  if (pathname !== shownFor) {
    setShownFor(pathname);
    if (state === "loading") setState("done");
  }

  // Clicks on links. Re-armed for each page, which also drops a pending start.
  useEffect(() => {
    let timer: number | undefined;
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement)) return;
      const link = { href: anchor.href, target: anchor.getAttribute("target"), download: anchor.hasAttribute("download") };
      if (!leavesPage(link, window.location.href)) return;
      const from = window.location.pathname;
      window.clearTimeout(timer);
      // Only if we are still on the page the click came from: a page that
      // lands just as the timer fires must not start a line it will never finish.
      timer = window.setTimeout(() => {
        if (window.location.pathname === from) setState("loading");
      }, SHOW_AFTER_MS);
    };
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("click", onClick);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    if (state === "idle") return;
    const timer =
      state === "loading"
        ? window.setTimeout(() => setState("done"), GIVE_UP_MS)
        : window.setTimeout(() => setState("idle"), CLEAR_AFTER_MS);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <div aria-hidden data-state={state} className="cmj-nav-progress">
      <span />
    </div>
  );
}
