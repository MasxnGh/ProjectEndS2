"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Copy, Loader2 } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import { SignInPromptModal } from "@/components/auth/sign-in-prompt-modal";
import type { Locale } from "@/i18n";

/**
 * Copying needs an account (a trip has to belong to someone), but *reading*
 * the shared page does not — so this is the only gated thing here, and the
 * gate is the same inviting modal used elsewhere rather than a redirect that
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
      <p className="flex flex-wrap items-center gap-3 text-sm">
        <span className="flex items-center gap-2 text-accent-text">
          <Check className="h-4 w-4" aria-hidden="true" />
          {t.copied}
        </span>
        <Link href={`/${locale}/my-trips`} className="underline hover:text-accent-text">
          {t.viewMyTrips}
        </Link>
      </p>
    );
  }

  const signedIn = status === "authenticated";

  return (
    <>
      <button
        type="button"
        disabled={busy}
        onClick={() => (signedIn ? copyTrip() : setPromptOpen(true))}
        className="flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-foreground hover:brightness-95 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Copy className="h-4 w-4" aria-hidden="true" />
        )}
        {busy ? t.copying : signedIn ? t.copyCta : t.copySignedOut}
      </button>

      <SignInPromptModal open={promptOpen} onClose={() => setPromptOpen(false)} />
    </>
  );
}
