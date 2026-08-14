"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, LogOut, Luggage, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

export function UserMenu({
  name,
  email,
  image,
  locale,
  onSignOutRequest,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
  locale: string;
  onSignOutRequest: () => void;
}) {
  const { dict } = useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const displayName = name ?? email ?? dict.auth.menu.fallbackName;
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setIsOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={dict.auth.menu.trigger.replace("{name}", displayName)}
        className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-border-strong text-sm font-medium hover:border-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element -- small external avatar; not worth configuring next/image remotePatterns for
          <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span aria-hidden="true">{initial}</span>
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={dict.auth.menu.trigger.replace("{name}", displayName)}
          className="absolute right-0 top-full z-20 mt-2 w-56 rounded-lg border border-border bg-background p-2 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium">{displayName}</p>
            {email ? <p className="truncate text-xs text-muted-foreground">{email}</p> : null}
          </div>
          <Link
            href={`/${locale}/my-trips`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="mt-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
          >
            <Luggage className="h-4 w-4 shrink-0" aria-hidden="true" />
            {dict.myTrips.navLabel}
          </Link>
          <Link
            href={`/${locale}/favorites`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
          >
            <Heart className="h-4 w-4 shrink-0" aria-hidden="true" />
            {dict.favorites.navLabel}
          </Link>
          <Link
            href={`/${locale}/account`}
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
            {dict.account.navLabel}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onSignOutRequest();
            }}
            className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm hover:bg-surface-muted"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
            {dict.auth.menu.signOut}
          </button>
        </div>
      ) : null}
    </div>
  );
}
