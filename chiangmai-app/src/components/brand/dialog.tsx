"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { cx } from "./cx";

/**
 * A modal on the browser's own <dialog>, opened with showModal().
 *
 * The browser does the hard parts: the rest of the page goes inert, focus moves
 * in and stays in, Esc closes it, and focus goes back to whatever opened it.
 * What is left here is keeping `open` in step with the element, closing on a
 * click on the dimmed backdrop, and holding the page still behind it.
 *
 * `placement="sheet"` is the phone menu: a panel down the right edge.
 * `placement="center"` is a small confirm box.
 */
export function Dialog({
  open,
  onClose,
  labelledBy,
  label,
  placement = "center",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** id of the visible heading that names the dialog; or pass `label`. */
  labelledBy?: string;
  label?: string;
  placement?: "center" | "sheet";
  className?: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) {
      dialog.showModal();
      // The browser focuses the first focusable thing inside; a child marked
      // data-autofocus (the sheet's close button) is a better place to start.
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    }
    return () => {
      // Closed: the browser hands focus back to whatever opened the dialog.
      if (dialog.open) dialog.close();
      // Unmounted while open (a dialog rendered only while it is needed): the
      // browser can't hand focus back from a removed element, so do it here.
      const lost = document.activeElement === document.body || dialog.contains(document.activeElement);
      if (lost && trigger?.isConnected) trigger.focus();
    };
  }, [open]);

  // The page behind should not scroll under a modal. Lenis drives scrolling on
  // this site and scrolls the window itself, so the dialog also carries
  // data-lenis-prevent, which makes Lenis leave wheel and touch inside it alone.
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const previous = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = previous;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : label}
      data-brand
      data-lenis-prevent
      // Esc: keep the dialog open and let `open` close it, so React's state is
      // the only thing that decides. Chrome fires `close` on the next rendered
      // frame, so state that waited for it would lag in a throttled tab (seen in
      // a hidden one: closed on screen, still "open" to React, page still locked).
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      // Any other way the browser closes it. The event arrives a task after
      // close(); if the dialog is open again by then (the effect above was torn
      // down and re-run, as React's dev mode does on mount), it is stale.
      onClose={() => {
        if (!ref.current?.open) onClose();
      }}
      // A click whose target is the <dialog> itself landed on the backdrop: the
      // content fills the element, so any click inside hits a child instead.
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cx(
        "border-0 bg-panel p-0 font-brand text-ink shadow-lift outline-none",
        "backdrop:bg-[rgb(15_28_26/0.45)]",
        "transition-[opacity,translate] duration-200 ease-brand motion-reduce:transition-none",
        placement === "sheet"
          ? "fixed inset-y-0 right-0 left-auto m-0 h-dvh max-h-none w-[min(360px,88vw)] max-w-none overscroll-contain starting:open:translate-x-6 starting:open:opacity-0"
          : "m-auto w-[min(440px,calc(100vw-2rem))] max-w-none rounded-lg starting:open:translate-y-2 starting:open:opacity-0",
        className,
      )}
    >
      <div className={cx(placement === "sheet" ? "flex min-h-full flex-col" : "p-6 sm:p-7")}>{children}</div>
    </dialog>
  );
}
