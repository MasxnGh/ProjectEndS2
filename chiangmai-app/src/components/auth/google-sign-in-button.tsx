"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { GoogleIcon } from "@/components/auth/google-icon";

export function GoogleSignInButton({
  label,
  loadingLabel,
  callbackUrl,
}: {
  label: string;
  loadingLabel: string;
  callbackUrl: string;
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
      className="flex w-full items-center justify-center gap-3 rounded-full border border-border-strong bg-surface px-6 py-3.5 text-sm font-medium text-foreground transition-colors hover:border-accent hover:text-accent-text disabled:cursor-wait disabled:opacity-70"
    >
      <GoogleIcon className="h-5 w-5 shrink-0" />
      {isPending ? loadingLabel : label}
    </button>
  );
}
