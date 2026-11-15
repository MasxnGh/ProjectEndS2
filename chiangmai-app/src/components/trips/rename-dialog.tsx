"use client";

import { useId, useState } from "react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/brand/button";
import { cx } from "@/components/brand/cx";
import { Dialog } from "@/components/brand/dialog";
import { textFieldStyles } from "@/components/brand/text-field";

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
    <Dialog open onClose={onCancel} labelledBy={titleId}>
      <h2 id={titleId} className="text-title text-brand">
        {t.title}
      </h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) onSave(trimmed);
        }}
      >
        <label htmlFor={inputId} className="mt-4 block text-small text-ink-soft">
          {t.label}
        </label>
        <input
          id={inputId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          maxLength={MAX_TITLE}
          data-autofocus
          className={cx("mt-1.5", textFieldStyles)}
        />
        <div className="mt-6 grid gap-2">
          <Button type="submit" disabled={!canSave}>
            {t.save}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            {t.cancel}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
