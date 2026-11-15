"use client";

import { useId } from "react";
import { usePathname } from "next/navigation";
import { signIn } from "next-auth/react";
import { UserRound } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { ICON_STROKE } from "./icons";

/**
 * Asked when a signed-out visitor taps something that needs an account — the
 * heart today. An invitation, not a gate: closing it changes nothing on the page.
 */
export function SignInPrompt({
  open,
  onClose,
  variant = "favorite",
}: {
  open: boolean;
  onClose: () => void;
  variant?: "favorite" | "plan";
}) {
  const { dict } = useLocale();
  const pathname = usePathname();
  const titleId = useId();
  const copy = dict.auth.signInPrompt;

  return (
    <Dialog open={open} onClose={onClose} labelledBy={titleId}>
      <h2 id={titleId} className="text-title text-brand">
        {variant === "favorite" ? copy.favoriteTitle : copy.title}
      </h2>
      <p className="mt-2 text-body text-pretty text-ink-soft">
        {variant === "favorite" ? copy.favoriteBody : copy.body}
      </p>
      <div className="mt-6 grid gap-2">
        <Button
          icon={<UserRound aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
          onClick={() => signIn("google", { callbackUrl: pathname })}
          data-autofocus
        >
          {copy.cta}
        </Button>
        <Button variant="ghost" onClick={onClose} className="justify-center">
          {copy.cancel}
        </Button>
      </div>
    </Dialog>
  );
}
