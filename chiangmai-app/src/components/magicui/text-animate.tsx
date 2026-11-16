import { Fragment, type CSSProperties } from "react";
import { cx } from "@/components/brand/cx";

/*
 * Magic UI's TextAnimate (installed with `npx shadcn@latest add @magicui/text-animate`),
 * kept to its props but rebuilt as plain CSS:
 *
 * - The original is a motion component that renders every segment at
 *   `opacity: 0` until React hydrates. For the home hero's title that meant an
 *   invisible headline for as long as the scripts take on a slow phone. Here
 *   each segment is a span with a CSS keyframe (app/motion.css), so the title
 *   starts rising with the first paint and needs no JavaScript at all — this
 *   file is a server component.
 * - `by="line"` splits on "\n". (The installed version split lines on "",
 *   i.e. into characters.)
 * - Thai has no spaces between words, so split Thai by line or not at all.
 * - On load only. Text that arrives on scroll goes in a BlurFade instead.
 */

type Tag = "h1" | "h2" | "h3" | "p" | "span" | "div";
type By = "text" | "word" | "character" | "line";
type Animation = "blurInUp" | "blurIn" | "slideUp" | "fadeIn";

export function TextAnimate({
  children,
  as: Tag = "p",
  by = "word",
  animation = "blurInUp",
  delay = 0,
  duration = 0.9,
  stagger = 0.12,
  className,
  segmentClassName,
  lang,
  id,
}: {
  children: string;
  as?: Tag;
  by?: By;
  animation?: Animation;
  /** Seconds before the first segment starts. */
  delay?: number;
  /** Seconds each segment takes. */
  duration?: number;
  /** Seconds between segments. */
  stagger?: number;
  className?: string;
  segmentClassName?: string;
  lang?: string;
  id?: string;
}) {
  const segments =
    by === "line"
      ? children.split("\n")
      : by === "word"
        ? children.split(/(\s+)/)
        : by === "character"
          ? Array.from(children)
          : [children];

  // Words and lines read naturally as they are; characters would be spelled
  // out one by one, so for those the whole string is read once instead.
  const spellsOut = by === "character";
  const vars = {
    "--ta-delay": `${delay * 1000}ms`,
    "--ta-duration": `${duration * 1000}ms`,
    "--ta-stagger": `${stagger * 1000}ms`,
  } as CSSProperties;

  let index = 0;
  return (
    <Tag lang={lang} id={id} className={className} style={vars} aria-label={spellsOut ? children : undefined}>
      {segments.map((segment) => {
        // Spaces between words keep their place but take no turn.
        if (by === "word" && /^\s+$/.test(segment)) return segment;
        const order = index++;
        return (
          <Fragment key={`${order}-${segment}`}>
            {/* Lines are blocks, so this space is never seen; it keeps the
                text "Chiangmai Journey" rather than "ChiangmaiJourney" for
                search engines and anything that reads textContent. */}
            {by === "line" && order > 0 ? " " : null}
            <span
              aria-hidden={spellsOut || undefined}
              data-animation={animation}
              style={{ "--i": order } as CSSProperties}
              className={cx("cmj-text-seg", by === "line" ? "block" : "inline-block whitespace-pre", segmentClassName)}
            >
              {segment}
            </span>
          </Fragment>
        );
      })}
    </Tag>
  );
}
