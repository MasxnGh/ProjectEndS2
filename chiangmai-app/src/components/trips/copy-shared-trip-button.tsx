"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Check, Copy } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import { Button, ButtonLink } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { SignInPrompt } from "@/components/brand/sign-in-prompt";
import { RouteDots } from "@/components/brand/loaders";
import type { Locale } from "@/i18n";

/**
 * Copying needs an account (a trip has to belong to someone), but *reading*
 * the shared page does not — so this is the only gated thing here, and the
 * gate is the same inviting prompt used elsewhere rather than a redirect that
 * would throw away the page the visitor is looking at.
 */
export function CopySharedTripButton({ token, locale }: { token: string; locale: Locale }) {
  const { status } = useSession();
  const { dict } = useLocale();
  const t = dict.sharedTrip;
  const { showToast } = useToast();

  const [promptOpen, setPromptOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function copyTrip() {
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/shared/${token}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        showToast({ message: t.copyFailed });
        return;
      }
      setDone(true);
      showToast({ message: t.copied });
    } catch {
      showToast({ message: t.copyFailed });
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2" role="status">
        <span className="inline-flex items-center gap-2 text-label font-semibold text-brand">
          <Check aria-hidden strokeWidth={2} className="size-5" />
          {t.copied}
        </span>
        <ButtonLink href={`/${locale}/my-trips`} variant="secondary" size="sm" arrow>
          {t.viewMyTrips}
        </ButtonLink>
      </div>
    );
  }

  const signedIn = status === "authenticated";
  const iconClass = "size-5";

  return (
    <>
      <Button
        disabled={busy}
        aria-busy={busy || undefined}
        onClick={() => (signedIn ? copyTrip() : setPromptOpen(true))}
        icon={
          busy ? (
            <RouteDots />
          ) : (
            <Copy aria-hidden strokeWidth={ICON_STROKE} className={iconClass} />
          )
        }
      >
        {busy ? t.copying : signedIn ? t.copyCta : t.copySignedOut}
      </Button>

      <SignInPrompt open={promptOpen} onClose={() => setPromptOpen(false)} variant="plan" />
    </>
  );
}
