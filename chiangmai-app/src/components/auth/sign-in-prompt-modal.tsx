"use client";

import { useId } from "react";
import { usePathname } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { useLocale } from "@/components/providers/locale-provider";

/**
 * Shown when a signed-out visitor clicks something that needs an account
 * (Save plan today; favourites in a later phase). Deliberately inviting
 * rather than blocking: closing it loses nothing, the plan on screen is
 * untouched either way.
 */
export function SignInPromptModal({
  open,
  onClose,
  variant = "plan",
}: {
  open: boolean;
  onClose: () => void;
  /** Which action prompted this. The copy has to name the thing the user just
   *  clicked — being told about saving a plan after tapping a heart reads as
   *  a bug, and undermines the "we're inviting, not blocking" tone. */
  variant?: "plan" | "favorite";
}) {
  const { dict } = useLocale();
  const pathname = usePathname();
  const titleId = useId();
  const copy = dict.auth.signInPrompt;
  const title = variant === "favorite" ? copy.favoriteTitle : copy.title;
  const body = variant === "favorite" ? copy.favoriteBody : copy.body;

  return (
    <Modal open={open} onClose={onClose} titleId={titleId} closeLabel={dict.nav.close}>
      <h2 id={titleId} className="font-serif-display text-xl">
        {title}
      </h2>
      <p className="mt-2 text-sm text-foreground/75">{body}</p>
      <div className="mt-6 space-y-2">
        <GoogleSignInButton label={copy.cta} loadingLabel={copy.ctaLoading} callbackUrl={pathname} />
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
