import { CloudOff, RotateCw } from "lucide-react";
import type { Dictionary } from "@/i18n";
import { buttonStyles } from "./button";
import { cx } from "./cx";
import { ICON_STROKE } from "./icons";

/**
 * Shown in place of an account page's content when the visitor has a session
 * cookie but the database can't confirm it (see getSessionState). Laid out
 * like the pages' empty state, so it reads as "not right now", not as an
 * error screen.
 *
 * The retry is a plain link, not next/link: a full request is the honest
 * retry, and it runs the session check again from the start.
 */
export function AccountUnavailable({ dict, retryHref }: { dict: Dictionary; retryHref: string }) {
  const t = dict.auth.unavailable;
  return (
    <section role="status" className="grid justify-items-center gap-3 rounded-lg bg-well px-6 py-12 text-center">
      <span aria-hidden className="grid size-14 place-items-center rounded-full bg-panel text-brand">
        <CloudOff strokeWidth={ICON_STROKE} className="size-6" />
      </span>
      <h2 className="text-title font-semibold text-pretty text-brand">{t.title}</h2>
      <p className="max-w-[48ch] text-body text-pretty text-ink-soft">{t.body}</p>
      <a href={retryHref} className={cx(buttonStyles(), "mt-2")}>
        <RotateCw aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        {t.retry}
      </a>
    </section>
  );
}
