"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";

/**
 * Gate in front of every sign-out, everywhere it can be triggered (desktop
 * UserMenu, mobile nav). The whole point is the choice this asks before the
 * account's session cookie goes away — signing out doesn't touch the local
 * plan either way, but the user should decide that on purpose, not have it
 * silently kept or silently wiped.
 */
export function SignOutConfirmModal({
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
    <Modal open={open} onClose={onClose} titleId={titleId} closeLabel={dict.nav.close}>
      <h2 id={titleId} className="font-serif-display text-xl">
        {copy.title}
      </h2>
      <p className="mt-2 text-sm text-foreground/75">{copy.body}</p>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={() => onConfirm(true)}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          {copy.keepCta}
        </button>
        <button
          type="button"
          onClick={() => onConfirm(false)}
          className="w-full rounded-full border border-border-strong px-6 py-3 text-sm font-medium hover:border-accent hover:text-accent-text"
        >
          {copy.clearCta}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full px-6 py-2.5 text-center text-sm font-medium text-muted-foreground hover:text-accent-text"
        >
          {copy.cancel}
        </button>
      </div>
    </Modal>
  );
}
