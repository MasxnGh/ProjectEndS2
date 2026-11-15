"use client";

import { useId } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { ICON_STROKE } from "@/components/brand/icons";

/**
 * Two-button confirmation. The cancel path is the calm default — a
 * destructive action should never be the easiest thing to hit by reflex — so
 * focus starts on cancel, and a destructive confirm is the outlined button
 * with a bin, not the filled one. The brand has no red; the words and the
 * icon say what it does.
 */
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
  const titleId = useId();

  return (
    <Dialog open onClose={onCancel} labelledBy={titleId}>
      <h2 id={titleId} className="text-title text-brand">
        {title}
      </h2>
      <p className="mt-2 text-body text-pretty text-ink-soft">{body}</p>
      <div className="mt-6 grid gap-2">
        <Button
          variant={destructive ? "secondary" : "primary"}
          onClick={onConfirm}
          icon={destructive ? <Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" /> : undefined}
        >
          {confirmLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} data-autofocus={destructive ? true : undefined}>
          {cancelLabel}
        </Button>
      </div>
    </Dialog>
  );
}
