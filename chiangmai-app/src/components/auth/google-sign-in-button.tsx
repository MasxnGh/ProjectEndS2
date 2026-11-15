"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { buttonStyles } from "@/components/brand/button";
import { cx } from "@/components/brand/cx";
import { ICON_STROKE } from "@/components/brand/icons";

/**
 * The outlined brand button with Google's own mark, which Google asks to keep
 * in its colours. Full width of its column, so it reads as the page's one action.
 */
export function GoogleSignInButton({
  label,
  loadingLabel,
  callbackUrl,
  className,
}: {
  label: string;
  loadingLabel: string;
  callbackUrl: string;
  className?: string;
}) {
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        setIsPending(true);
        signIn("google", { callbackUrl });
      }}
      className={cx(
        buttonStyles({ variant: "secondary" }),
        "w-full gap-3 bg-panel disabled:cursor-wait disabled:opacity-70",
        className,
      )}
    >
      {isPending ? (
        <Loader2 aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none animate-spin" />
      ) : (
        <GoogleIcon className="size-5 flex-none" />
      )}
      {isPending ? loadingLabel : label}
    </button>
  );
}
