"use client";

import { useId, useState } from "react";
import { Check, Copy, Link2Off, RefreshCw } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import type { SerializedTrip } from "@/lib/db/types";
import type { Locale } from "@/i18n";

export function ShareDialog({
  trip,
  locale,
  onClose,
  onUpdated,
}: {
  trip: SerializedTrip;
  locale: Locale;
  onClose: () => void;
  onUpdated: (trip: SerializedTrip) => void;
}) {
  const { dict } = useLocale();
  const t = dict.myTrips.share;
  const { showToast } = useToast();
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const isShared = trip.visibility === "unlisted";
  // Built in the browser so it always matches the host the owner is actually
  // on — a hard-coded production URL would hand out a broken link in dev.
  const shareUrl =
    typeof window === "undefined" ? "" : `${window.location.origin}/${locale}/trip/${trip.shareToken}`;

  async function patchMeta(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        showToast({ message: t.failed });
        return null;
      }
      const data = await res.json();
      onUpdated(data.trip as SerializedTrip);
      return data.trip as SerializedTrip;
    } catch {
      showToast({ message: t.failed });
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setJustCopied(true);
      showToast({ message: t.copied });
      window.setTimeout(() => setJustCopied(false), 2000);
    } catch {
      // Clipboard access can be denied outright (permissions, insecure
      // context); the link is on screen and selectable, so say so.
      showToast({ message: t.copyFailed });
    }
  }

  return (
    <Modal open onClose={onClose} titleId={titleId} closeLabel={dict.nav.close}>
      <h2 id={titleId} className="font-serif-display text-xl">
        {t.title}
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-foreground/75 text-pretty">{t.description}</p>

      {isShared ? (
        <>
          <p className="mt-5 break-all rounded-md border border-border bg-surface-muted p-3 font-mono text-xs">
            {shareUrl}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyLink}
              className="flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95"
            >
              {justCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {t.copyLink}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                const updated = await patchMeta({ regenerateShareToken: true });
                if (updated) showToast({ message: t.regenerated });
              }}
              className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {t.regenerate}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => patchMeta({ visibility: "private" })}
              className="flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm hover:border-destructive hover:text-destructive disabled:opacity-50"
            >
              <Link2Off className="h-4 w-4" />
              {t.disable}
            </button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t.regenerateHint}</p>
        </>
      ) : (
        <>
          <p className="mt-5 text-sm text-muted-foreground">{t.disabledNotice}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => patchMeta({ visibility: "unlisted" })}
            className="mt-4 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95 disabled:opacity-50"
          >
            {t.enable}
          </button>
        </>
      )}
    </Modal>
  );
}
