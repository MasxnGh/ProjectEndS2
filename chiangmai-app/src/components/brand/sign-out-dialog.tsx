"use client";

import { useId } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "./button";
import { Dialog } from "./dialog";

/**
 * The question asked before every sign-out: keep the plan on this device, or
 * clear it. Signing out never touches the local plan by itself, so the person
 * decides it here on purpose. The behaviour is the old modal's; only the look
 * is new.
 */
export function SignOutDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (keepLocalPlan: boolean) => void;
}) {
  const { dict } = useLocale();
  const titleId = useId();
  const copy = dict.auth.signOutConfirm;

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="text-title text-brand">
        {copy.title}
      </h2>
      <p className="mt-2 text-body text-pretty text-ink-soft">{copy.body}</p>
      <div className="mt-6 grid gap-2">
        <Button onClick={() => onConfirm(true)}>{copy.keepCta}</Button>
        <Button variant="secondary" onClick={() => onConfirm(false)}>
          {copy.clearCta}
        </Button>
        <Button variant="ghost" onClick={onClose}>
          {copy.cancel}
        </Button>
      </div>
    </Dialog>
  );
}
