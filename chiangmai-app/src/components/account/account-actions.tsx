"use client";

import { useId, useState } from "react";
import { signOut } from "next-auth/react";
import { Download, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { Button, buttonStyles } from "@/components/brand/button";
import { cx } from "@/components/brand/cx";
import { Dialog } from "@/components/brand/dialog";
import { ICON_STROKE } from "@/components/brand/icons";
import { fill } from "@/components/brand/place-text";
import { textFieldStyles } from "@/components/brand/text-field";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import type { Locale } from "@/i18n";

const CONFIRM_WORD = "DELETE";

export function AccountActions({ locale }: { locale: Locale }) {
  const { dict } = useLocale();
  const t = dict.account;
  const { showToast } = useToast();
  const titleId = useId();
  const inputId = useId();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function deleteAccount() {
    setDeleting(true);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: CONFIRM_WORD }),
      });
      if (!res.ok) {
        showToast({ message: t.delete.failed });
        setDeleting(false);
        return;
      }
      // The session row is already gone server-side; this clears the cookie
      // and lands them somewhere that makes sense signed out.
      await signOut({ callbackUrl: `/${locale}` });
    } catch {
      showToast({ message: t.delete.failed });
      setDeleting(false);
    }
  }

  return (
    <>
      <section aria-labelledby="account-export" className="grid justify-items-start gap-2 border-t border-line pt-10">
        <h2 id="account-export" className="text-title font-semibold text-brand">
          {t.export.title}
        </h2>
        <p className="max-w-[60ch] text-body text-pretty text-ink-soft">{t.export.body}</p>
        {/* A plain link, not a fetch: the browser's own download handling is
            more reliable than reconstructing a blob, and it works even if
            JavaScript later fails on this page. */}
        <a href="/api/account/export" download className={cx(buttonStyles({ variant: "secondary" }), "mt-2")}>
          <Download aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
          {t.export.cta}
        </a>
      </section>

      {/* The brand has no red: the warning icon and the words carry the weight,
          and the button is the outlined one, never the filled. */}
      <section
        aria-labelledby="account-delete"
        className="mt-10 grid justify-items-start gap-2 rounded-lg border-[1.5px] border-line-strong p-6 sm:p-7"
      >
        <h2 id="account-delete" className="flex items-center gap-2 text-title font-semibold text-ink">
          <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none text-brand" />
          {t.delete.title}
        </h2>
        <p className="max-w-[60ch] text-body text-pretty text-ink-soft">{t.delete.body}</p>
        <Button
          variant="secondary"
          className="mt-2"
          onClick={() => {
            setTyped("");
            setConfirmOpen(true);
          }}
          icon={<Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
        >
          {t.delete.cta}
        </Button>
      </section>

      <Dialog open={confirmOpen} onClose={() => (deleting ? undefined : setConfirmOpen(false))} labelledBy={titleId}>
        <h2 id={titleId} className="flex items-center gap-2 text-title text-brand">
          <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="size-5 flex-none" />
          {t.delete.confirmTitle}
        </h2>
        <p className="mt-2 text-body text-pretty text-ink-soft">{t.delete.confirmBody}</p>
        <ul className="mt-3 grid gap-1.5 text-body text-ink">
          {t.delete.confirmList.map((item) => (
            <li key={item} className="grid grid-cols-[1.25rem_1fr] items-baseline">
              <span aria-hidden className="text-brand">
                •
              </span>
              {item}
            </li>
          ))}
        </ul>

        {/* The second step. Typing the word is deliberately more friction
            than a click: this cannot be undone, and a mis-click on a
            destructive button is a real way people lose everything. Focus
            starts in the field, since typing alone changes nothing. */}
        <label htmlFor={inputId} className="mt-5 block text-label text-ink">
          {fill(t.delete.typeToConfirm, { word: CONFIRM_WORD })}
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          data-autofocus
          className={cx("mt-1.5", textFieldStyles)}
        />

        <div className="mt-6 grid gap-2">
          <Button
            variant="secondary"
            disabled={typed.trim() !== CONFIRM_WORD || deleting}
            onClick={deleteAccount}
            icon={
              deleting ? (
                <Loader2 aria-hidden strokeWidth={ICON_STROKE} className="size-5 animate-spin" />
              ) : (
                <Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
              )
            }
          >
            {deleting ? t.delete.deleting : t.delete.confirmCta}
          </Button>
          <Button variant="ghost" disabled={deleting} onClick={() => setConfirmOpen(false)}>
            {t.delete.cancel}
          </Button>
        </div>
      </Dialog>
    </>
  );
}
