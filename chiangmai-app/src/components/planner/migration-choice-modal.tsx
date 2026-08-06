"use client";

import { useId } from "react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";

/**
 * The one guest→account edge case that needs a real decision: this device
 * has an unsaved local plan, and the account being signed into already has
 * a saved trip. Closing without choosing does nothing — the local plan
 * stays exactly as-is, un-synced, and the prompt can be reached again by
 * saving again.
 */
export function MigrationChoiceModal({
  open,
  existingTripTitle,
  onClose,
  onSaveAsNew,
  onReplaceExisting,
}: {
  open: boolean;
  existingTripTitle: string;
  onClose: () => void;
  onSaveAsNew: () => void;
  onReplaceExisting: () => void;
}) {
  const { dict } = useLocale();
  const titleId = useId();
  const copy = dict.auth.migrationChoice;

  return (
    <Modal open={open} onClose={onClose} titleId={titleId} closeLabel={dict.nav.close}>
      <h2 id={titleId} className="font-serif-display text-xl">
        {copy.title}
      </h2>
      <p className="mt-2 text-sm text-foreground/75">{copy.body}</p>
      <div className="mt-6 space-y-2">
        <button
          type="button"
          onClick={onSaveAsNew}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          {copy.saveAsNewCta}
        </button>
        <button
          type="button"
          onClick={onReplaceExisting}
          className="w-full rounded-full border border-border-strong px-6 py-3 text-sm font-medium hover:border-accent hover:text-accent-text"
        >
          {copy.replaceCta.replace("{title}", existingTripTitle)}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-full px-6 py-2.5 text-center text-sm font-medium text-muted-foreground hover:text-accent-text"
        >
          {copy.close}
        </button>
      </div>
    </Modal>
  );
}
