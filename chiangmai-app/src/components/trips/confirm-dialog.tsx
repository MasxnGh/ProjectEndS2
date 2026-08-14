"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";

/** Two-button confirmation. The cancel path is styled as the calm default — a destructive action should never be the easiest thing to hit by reflex. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  destructive,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { dict } = useLocale();
  const titleId = useId();

  return (
    <Modal open onClose={onCancel} titleId={titleId} closeLabel={dict.nav.close}>
      <h2 id={titleId} className="font-serif-display text-xl">
        {title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/75 text-pretty">{body}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className={`rounded-full px-5 py-2.5 text-sm font-medium ${
            destructive
              ? "bg-destructive text-white hover:brightness-95"
              : "bg-accent text-accent-foreground hover:brightness-95"
          }`}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text"
        >
          {cancelLabel}
        </button>
      </div>
    </Modal>
  );
}
