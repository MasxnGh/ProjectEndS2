"use client";

import { useId, useState } from "react";
import QRCode from "qrcode";
import { Check, Printer, QrCode, RotateCw, Save, Share2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import { useTripStore } from "@/lib/trip-store";
import { Button } from "@/components/brand/button";
import { Dialog } from "@/components/brand/dialog";
import { ICON_STROKE } from "@/components/brand/icons";
import { RouteDots } from "@/components/brand/loaders";

export type SaveState = "local" | "saving" | "saved" | "failed";

/** The `?plan=` link, unchanged: the day order, encoded into the address. */
export function buildShareUrl(): string {
  const { dayIds, containers } = useTripStore.getState();
  return shareUrlFor(dayIds, containers);
}

/** The same link for a given plan; the printout's QR code passes the plan it shows. */
export function shareUrlFor(dayIds: string[], containers: Record<string, string[]>): string {
  const encoded = encodeURIComponent(btoa(JSON.stringify({ dayIds, containers })));
  return `${window.location.origin}${window.location.pathname}?plan=${encoded}`;
}

/** Share sheet where the device has one, otherwise the link is copied — as on a place page. */
export function useSharePlan(onShared: () => void) {
  const { dict } = useLocale();
  const { showToast } = useToast();
  return async () => {
    const url = buildShareUrl();
    if (navigator.share) {
      try {
        await navigator.share({ title: dict.plan.finish.shareTitle, url });
        onShared();
      } catch {
        // Closing the sheet is not an error worth showing.
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast({ message: dict.planner.shared });
      onShared();
    } catch {
      window.prompt(dict.planner.share, url);
    }
  };
}

const icon = "size-4";

export function SaveButton({
  state,
  onSave,
  className,
}: {
  state: SaveState;
  onSave: () => void;
  className?: string;
}) {
  const { dict } = useLocale();
  const c = dict.planner.cloudSave;
  if (state === "saving") {
    return (
      <Button disabled aria-busy className={className} icon={<RouteDots />}>
        {c.saving}
      </Button>
    );
  }
  if (state === "failed") {
    return (
      <Button onClick={onSave} className={className} icon={<RotateCw aria-hidden strokeWidth={ICON_STROKE} className={icon} />}>
        {c.failed} · {c.retry}
      </Button>
    );
  }
  if (state === "saved") {
    return (
      <Button variant="secondary" onClick={onSave} className={className} icon={<Check aria-hidden strokeWidth={2} className={icon} />}>
        {dict.planner.save}
      </Button>
    );
  }
  return (
    <Button onClick={onSave} className={className} icon={<Save aria-hidden strokeWidth={ICON_STROKE} className={icon} />}>
      {dict.planner.save}
    </Button>
  );
}

/** The one-line save status under the trip's name. */
export function SaveStatus({ state }: { state: SaveState }) {
  const { dict } = useLocale();
  const c = dict.planner.cloudSave;
  const text =
    state === "saving" ? c.saving : state === "saved" ? c.saved : state === "failed" ? c.failed : dict.planner.saved;
  return (
    <p aria-live="polite" className="-mt-2 inline-flex items-center gap-1.5 text-small text-ink-soft">
      {state === "saving" ? (
        <RouteDots />
      ) : state === "failed" ? null : (
        <Check aria-hidden strokeWidth={2} className="size-4 text-brand" />
      )}
      {text}
    </p>
  );
}

export function FinishSection({
  saveState,
  signedIn,
  onSave,
  onShared,
}: {
  saveState: SaveState;
  signedIn: boolean;
  onSave: () => void;
  onShared: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.plan.finish;
  const share = useSharePlan(onShared);
  const [qr, setQr] = useState<string | null>(null);
  const qrTitleId = useId();

  function openQr() {
    QRCode.toDataURL(buildShareUrl(), { margin: 1, width: 240 })
      .then(setQr)
      .catch(() => setQr(null));
  }

  return (
    <section aria-labelledby="planner-finish-title" className="grid gap-3 border-t border-line pt-6 print:hidden">
      <h2 id="planner-finish-title" className="text-title font-semibold text-brand">
        {t.title}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        <SaveButton state={saveState} onSave={onSave} className="col-span-2 px-4" />
        <Button variant="secondary" size="sm" onClick={share} className="px-4" icon={<Share2 aria-hidden strokeWidth={ICON_STROKE} className={icon} />}>
          {t.share}
        </Button>
        <Button variant="secondary" size="sm" onClick={openQr} className="px-4" icon={<QrCode aria-hidden strokeWidth={ICON_STROKE} className={icon} />}>
          {dict.planner.qr.button}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.print()}
          className="col-span-2 justify-center"
          icon={<Printer aria-hidden strokeWidth={ICON_STROKE} className={icon} />}
        >
          {t.print}
        </Button>
      </div>
      <p className="text-small text-pretty text-ink-soft">{signedIn && saveState !== "local" ? t.cloudNote : t.localNote}</p>

      <Dialog open={qr !== null} onClose={() => setQr(null)} labelledBy={qrTitleId}>
        <h2 id={qrTitleId} className="text-title text-brand">
          {dict.plan.qrTitle}
        </h2>
        <p className="mt-2 text-small text-pretty text-ink-soft">{dict.planner.qr.hint}</p>
        {qr ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URI gains nothing from next/image
          <img src={qr} alt={dict.planner.qr.imageAlt} width={240} height={240} className="mx-auto mt-5 rounded-md bg-white p-2" />
        ) : null}
        <Button variant="ghost" onClick={() => setQr(null)} className="mt-5 w-full justify-center" data-autofocus>
          {dict.nav.close}
        </Button>
      </Dialog>
    </section>
  );
}
