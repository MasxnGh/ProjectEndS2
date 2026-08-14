"use client";

import { useId, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";

const MAX_TITLE = 80;

export function RenameDialog({
  initialTitle,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.myTrips.rename;
  const titleId = useId();
  const inputId = useId();
  const [value, setValue] = useState(initialTitle);

  const trimmed = value.trim();
  // The server rejects an empty title; disabling here means the user finds
  // that out before a round trip instead of via a failure toast.
  const canSave = trimmed.length > 0 && trimmed !== initialTitle.trim();

  return (
    <Modal open onClose={onCancel} titleId={titleId} closeLabel={dict.nav.close}>
      <h2 id={titleId} className="font-serif-display text-xl">
        {t.title}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSave(trimmed);
        }}
      >
        <label htmlFor={inputId} className="mt-4 block text-sm text-muted-foreground">
          {t.label}
        </label>
        <input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_TITLE}
          autoFocus
          className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={!canSave}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95 disabled:opacity-50"
          >
            {t.save}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text"
          >
            {t.cancel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
