"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx, focusRing } from "./cx";

/**
 * A small panel that opens from a button: a calendar, a number, a short list.
 *
 * Not modal — the page stays live, and the panel closes on Esc (focus goes
 * back to the button), on a press outside it, or when focus leaves it. Under
 * the header on a phone, where an anchored panel would run off the screen;
 * under its button everywhere else.
 */
export function Popover({
  label,
  button,
  buttonClassName,
  buttonTitle,
  align = "start",
  panelClassName,
  children,
}: {
  /** Names the panel for screen readers, e.g. "Travel dates". */
  label: string;
  /** What the button shows. */
  button: ReactNode;
  buttonClassName?: string;
  /** Accessible name for the button when its content alone doesn't say what it opens. */
  buttonTitle?: string;
  align?: "start" | "end";
  panelClassName?: string;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const buttonId = useId();

  // `close` is handed to the panel's content during render, so it finds the
  // button by id rather than through a ref (refs are not for render).
  const close = useCallback(
    (returnFocus = true) => {
      setOpen(false);
      if (returnFocus) document.getElementById(buttonId)?.focus();
    },
    [buttonId],
  );

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const first =
      panel?.querySelector<HTMLElement>("[data-autofocus]") ??
      panel?.querySelector<HTMLElement>("input, button:not([disabled]), [href], select, textarea");
    first?.focus();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    panel?.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      panel?.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onBlur={(event) => {
        // Tabbing out of the panel closes it; moving between its own controls does not.
        if (open && !rootRef.current?.contains(event.relatedTarget as Node | null) && event.relatedTarget) {
          setOpen(false);
        }
      }}
    >
      <button
        id={buttonId}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={buttonTitle}
        onClick={() => setOpen((value) => !value)}
        className={buttonClassName}
      >
        {button}
      </button>
      {open ? (
        <div
          ref={panelRef}
          id={panelId}
          role="dialog"
          aria-label={label}
          className={cx(
            "z-40 rounded-lg border border-line bg-panel p-4 font-brand text-ink shadow-lift",
            "fixed inset-x-3 top-[84px] max-h-[calc(100svh-100px)] overflow-y-auto",
            "sm:absolute sm:inset-x-auto sm:top-full sm:mt-2 sm:w-[22rem] sm:max-h-none sm:overflow-visible",
            align === "end" ? "sm:right-0" : "sm:left-0",
            panelClassName,
          )}
        >
          {children(close)}
        </div>
      ) : null}
    </div>
  );
}

/** The field chip a Popover opens from: a panel pill with a hairline, as in the planner prototype. */
export const fieldChipStyles = cx(
  "inline-flex min-h-11 max-w-full cursor-pointer items-center gap-2 rounded-full bg-panel px-4 font-brand text-label text-ink",
  "shadow-[inset_0_0_0_1.5px_var(--cmj-line)] transition-[background-color,box-shadow] duration-150 ease-brand",
  "hover:bg-well hover:shadow-[inset_0_0_0_1.5px_var(--cmj-line-strong)] aria-expanded:bg-well aria-expanded:shadow-[inset_0_0_0_1.5px_var(--cmj-brand)]",
  focusRing,
);
