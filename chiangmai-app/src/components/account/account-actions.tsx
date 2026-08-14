"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, Loader2, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import type { Locale } from "@/i18n";

const CONFIRM_WORD = "DELETE";

export function AccountActions({ locale }: { locale: Locale }) {
  const { dict } = useLocale();
  const t = dict.account;
  const { showToast } = useToast();

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
      <section className="mt-12">
        <h2 className="font-serif-display text-2xl">{t.export.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{t.export.body}</p>
        {/* A plain link, not a fetch: the browser's own download handling is
            more reliable than reconstructing a blob, and it works even if
            JavaScript later fails on this page. */}
        <a
          href="/api/account/export"
          download
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {t.export.cta}
        </a>
      </section>

      <section className="mt-12 rounded-lg border border-destructive/40 p-6">
        <h2 className="font-serif-display text-2xl text-destructive">{t.delete.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80 text-pretty">{t.delete.body}</p>
        <button
          type="button"
          onClick={() => {
            setTyped("");
            setConfirmOpen(true);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full border border-destructive px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive hover:text-white"
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          {t.delete.cta}
        </button>
      </section>

      {confirmOpen ? (
        <Modal
          open
          onClose={() => (deleting ? undefined : setConfirmOpen(false))}
          titleId="delete-account-title"
          closeLabel={dict.nav.close}
        >
          <h2 id="delete-account-title" className="font-serif-display text-xl text-destructive">
            {t.delete.confirmTitle}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-foreground/80 text-pretty">
            {t.delete.confirmBody}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-foreground/80">
            {t.delete.confirmList.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>

          {/* The second step. Typing the word is deliberately more friction
              than a click: this cannot be undone, and a mis-click on a
              destructive button is a real way people lose everything. */}
          <label htmlFor="delete-confirm-input" className="mt-5 block text-sm text-muted-foreground">
            {t.delete.typeToConfirm.replace("{word}", CONFIRM_WORD)}
          </label>
          <input
            id="delete-confirm-input"
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            autoComplete="off"
            className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-destructive focus:outline-none"
          />

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={typed.trim() !== CONFIRM_WORD || deleting}
              onClick={deleteAccount}
              className="flex items-center gap-2 rounded-full bg-destructive px-5 py-2.5 text-sm font-medium text-white hover:brightness-95 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {deleting ? t.delete.deleting : t.delete.confirmCta}
            </button>
            <button
              type="button"
              disabled={deleting}
              onClick={() => setConfirmOpen(false)}
              className="rounded-full border border-border px-5 py-2.5 text-sm hover:border-accent hover:text-accent-text disabled:opacity-50"
            >
              {t.delete.cancel}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
