"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
} from "react";

/**
 * When to play a reveal, shared by BlurFade, NumberTicker, BorderBeam and the
 * drawn lines. The look of each reveal lives in app/motion.css; this only
 * decides the state.
 *
 * Magic UI's own components start hidden (`initial="hidden"`) and wait for
 * JavaScript to show anything, so the server's HTML arrives with the content
 * at `opacity: 0`. On this site that was already measured as a fault: a
 * hidden tab, a slow phone or a script error leaves the page blank (see
 * app/[locale]/template.tsx). Here the order is the other way round:
 *
 * - `"static"`: the server render and the first client render. Nothing is
 *   hidden, so the markup matches and a page without scripts is complete.
 * - `"hidden"`: set after mount, only for an element that is still below the
 *   fold. It is off screen, so hiding it is never seen.
 * - `"shown"`: it scrolled into view; CSS plays the entrance.
 *
 * Anything already on screen at mount stays `"static"` and never animates,
 * and so does everything under prefers-reduced-motion.
 */
export type RevealState = "static" | "hidden" | "shown";

export function useReveal(
  ref: RefObject<Element | null>,
  {
    /** How far into the viewport the element must come before it plays. */
    rootMargin = "0px 0px -12% 0px",
    /** Follow an ancestor's reveal instead (a selector for `closest()`), to keep in step with it. */
    closest,
  }: { rootMargin?: string; closest?: string } = {},
): RevealState {
  const [state, setState] = useState<RevealState>("static");

  useEffect(() => {
    const el = closest ? ref.current?.closest(closest) : ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    // Already on screen, or scrolled past (a restored scroll position): leave it be.
    if (el.getBoundingClientRect().top <= window.innerHeight * 0.9) return;

    setState("hidden");
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setState("shown");
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, closest]);

  return state;
}

/** The `data-reveal` attribute for a state: absent while static. */
export function revealAttr(state: RevealState) {
  return state === "static" ? undefined : state;
}

type RevealTag = "div" | "span" | "ul" | "ol" | "li" | "p" | "section" | "article" | "header";

/**
 * An element that carries the reveal state as `data-reveal`, for reveals that
 * are written entirely in CSS (the section hairline, the sample day's route,
 * the closing script line).
 */
export function Reveal({
  as = "div",
  className,
  style,
  children,
  ...rest
}: {
  as?: RevealTag;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, "className" | "style" | "children">) {
  const ref = useRef<HTMLElement>(null);
  const state = useReveal(ref);
  const Tag = as as ElementType;
  return (
    <Tag ref={ref} className={className} style={style} data-reveal={revealAttr(state)} {...rest}>
      {children}
    </Tag>
  );
}
