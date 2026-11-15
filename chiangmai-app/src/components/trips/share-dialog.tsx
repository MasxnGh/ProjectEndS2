"use client";

import { useId, useState } from "react";
import { Check, Copy, Link2Off, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
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
    <Dialog open onClose={onClose} labelledBy={titleId}>
      <div className="flex items-start justify-between gap-3">
        <h2 id={titleId} className="text-title text-brand">
          {t.title}
        </h2>
        <IconButton label={dict.nav.close} tone="plain" size="sm" onClick={onClose} className="-mt-1.5 -mr-2">
          <X aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
        </IconButton>
      </div>
      <p className="mt-2 text-body text-pretty text-ink-soft">{t.description}</p>

      {isShared ? (
        <>
          <p className="mt-5 rounded-md bg-well p-3 text-small break-all text-ink select-all">{shareUrl}</p>
          <div className="mt-4 grid gap-2">
            <Button
              onClick={copyLink}
              icon={
                justCopied ? (
                  <Check aria-hidden strokeWidth={2} className="size-5" />
                ) : (
                  <Copy aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                )
              }
              data-autofocus
            >
              {t.copyLink}
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={async () => {
                const updated = await patchMeta({ regenerateShareToken: true });
                if (updated) showToast({ message: t.regenerated });
              }}
              icon={<RefreshCw aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
            >
              {t.regenerate}
            </Button>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => patchMeta({ visibility: "private" })}
              icon={<Link2Off aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
            >
              {t.disable}
            </Button>
          </div>
          <p className="mt-3 text-small text-pretty text-ink-soft">{t.regenerateHint}</p>
        </>
      ) : (
        <>
          <p className="mt-5 text-body text-pretty text-ink-soft">{t.disabledNotice}</p>
          <Button disabled={busy} onClick={() => patchMeta({ visibility: "unlisted" })} data-autofocus className="mt-4 w-full">
            {t.enable}
          </Button>
        </>
      )}
    </Dialog>
  );
}
