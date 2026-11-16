"use client";

import { useEffect, useId, useRef, useState, type FocusEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Heart,
  LogOut,
  Luggage,
  Menu,
  Search,
  ShieldCheck,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { PlaceCategory } from "@/data/types";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { ButtonLink } from "./button";
import { cx, focusRing } from "./cx";
import { Dialog } from "./dialog";
import { CATEGORY_ORDER, categoryIcon, ICON_STROKE } from "./icons";
import { IconButton, IconButtonLink, iconButtonStyles } from "./icon-button";
import { Logo } from "./logo";
import { fill } from "./place-text";
import { LanguageChoice, ThemeChoice } from "./preferences";
import { SignOutDialog } from "./sign-out-dialog";
import { Wrap } from "./surface";

type SessionUser = { name: string | null; email: string | null; image: string | null };

/**
 * The site header: logo, three links with Explore opening the place types,
 * search, the planner as the one filled button, and a menu for the things you
 * set once (language, theme, account). Below 1024px all of that moves into a
 * sheet from the right, and the bar keeps the logo, search and the menu button.
 *
 * It is solid and always the same height. The pages under it start with framed
 * photographs, not full-bleed ones, so there is nothing to see through it.
 */
export function SiteHeader({
  counts,
  total,
}: {
  /** Places per type, counted on the server. */
  counts: Record<PlaceCategory, number>;
  total: number;
}) {
  const { locale, dict } = useLocale();
  const pathname = usePathname();
  const { data: session } = useSession();
  const user: SessionUser | null = session?.user
    ? { name: session.user.name ?? null, email: session.user.email ?? null, image: session.user.image ?? null }
    : null;

  const [sheetOpen, setSheetOpen] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setSheetOpen(false);
  }

  const clearAll = useTripStore((s) => s.clearAll);
  const detachRemoteTrip = useTripStore((s) => s.detachRemoteTrip);
  function confirmSignOut(keepLocalPlan: boolean) {
    if (!keepLocalPlan) clearAll();
    detachRemoteTrip();
    setSignOutOpen(false);
    signOut();
  }
  function requestSignOut() {
    setSheetOpen(false);
    setSignOutOpen(true);
  }

  const home = `/${locale}`;
  const href = {
    home,
    explore: `${home}/explore`,
    guides: `${home}/guides`,
    about: `${home}/about`,
    planner: `${home}/planner`,
    login: `${home}/login?callbackUrl=${encodeURIComponent(pathname)}`,
  };
  const within = (...prefixes: string[]) =>
    prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const current = {
    home: pathname === home,
    // A place page belongs to Explore, a shared trip to the planner.
    explore: within(href.explore, `${home}/place`),
    guides: within(href.guides),
    about: within(href.about),
    planner: within(href.planner, `${home}/trip`),
  };
  const accountLinks: { href: string; label: string; icon: LucideIcon }[] = [
    { href: `${home}/my-trips`, label: dict.myTrips.navLabel, icon: Luggage },
    { href: `${home}/favorites`, label: dict.favorites.navLabel, icon: Heart },
    { href: `${home}/account`, label: dict.account.navLabel, icon: ShieldCheck },
  ];

  const sheetTitleId = useId();

  return (
    <>
      <header data-brand className="no-print sticky top-0 z-50 border-b border-line bg-panel font-brand text-ink">
        <Wrap className="flex h-[72px] items-center gap-4 lg:gap-6">
          <Logo href={home} label={dict.ui.logoHome} draw />

          <nav aria-label={dict.shell.primaryNav} className="mx-auto hidden items-center gap-1 lg:flex">
            <Link href={href.home} aria-current={current.home ? "page" : undefined} className={navLinkStyles(current.home)}>
              {dict.nav.home}
            </Link>
            <ExploreMenu
              current={current.explore}
              pathname={pathname}
              exploreHref={href.explore}
              counts={counts}
              total={total}
            />
            <Link href={href.guides} aria-current={current.guides ? "page" : undefined} className={navLinkStyles(current.guides)}>
              {dict.nav.guides}
            </Link>
            <Link href={href.about} aria-current={current.about ? "page" : undefined} className={navLinkStyles(current.about)}>
              {dict.nav.about}
            </Link>
          </nav>

          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <IconButtonLink href={href.explore} label={dict.ui.search.label} tone="plain">
              <Search aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
            </IconButtonLink>
            <ButtonLink
              href={href.planner}
              size="sm"
              arrow
              aria-current={current.planner ? "page" : undefined}
              className="hidden lg:inline-flex"
            >
              {dict.nav.planner}
            </ButtonLink>
            <AccountMenu
              user={user}
              pathname={pathname}
              loginHref={href.login}
              links={accountLinks}
              onSignOut={requestSignOut}
            />
            <IconButton
              label={dict.shell.openMenu}
              tone="plain"
              aria-haspopup="dialog"
              aria-expanded={sheetOpen}
              onClick={() => setSheetOpen(true)}
              className="lg:hidden"
            >
              <Menu aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
            </IconButton>
          </div>
        </Wrap>
      </header>

      <Dialog open={sheetOpen} onClose={() => setSheetOpen(false)} placement="sheet" labelledBy={sheetTitleId}>
        {/* Following any link here closes the sheet, including one to the page
            you are already on, where the path does not change. */}
        <div
          className="flex flex-1 flex-col"
          onClickCapture={(event) => {
            if ((event.target as Element).closest("a")) setSheetOpen(false);
          }}
        >
          <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
            <Logo href={home} label={dict.ui.logoHome} />
            <h2 id={sheetTitleId} className="sr-only">
              {dict.nav.menu}
            </h2>
            <IconButton label={dict.shell.closeMenu} tone="plain" data-autofocus onClick={() => setSheetOpen(false)}>
              <X aria-hidden strokeWidth={ICON_STROKE} className="size-6" />
            </IconButton>
          </div>

          <nav aria-label={dict.shell.primaryNav} className="px-5">
            <ul>
              {(
                [
                  [href.home, dict.nav.home, current.home],
                  [href.explore, dict.nav.explore, current.explore],
                  [href.guides, dict.nav.guides, current.guides],
                  [href.about, dict.nav.about, current.about],
                  [href.planner, dict.nav.planner, current.planner],
                ] as const
              ).map(([to, label, isCurrent]) => (
                <li key={to}>
                  <Link
                    href={to}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cx(
                      "flex min-h-14 items-center justify-between gap-3 rounded-sm border-b border-line text-[1.125rem] font-medium",
                      "aria-[current=page]:text-brand",
                      focusRing,
                    )}
                  >
                    {label}
                    <ChevronRight aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-ink-soft" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-5 px-5 pt-6">
            <Setting label={dict.footer.language}>
              <LanguageChoice />
            </Setting>
            <Setting label={dict.footer.theme}>
              <ThemeChoice />
            </Setting>
          </div>

          <div className="mt-auto px-5 pt-8 pb-6">
            {user ? (
              <AccountBlock user={user} links={accountLinks} onSignOut={requestSignOut} />
            ) : (
              <ButtonLink
                href={href.login}
                variant="secondary"
                icon={<UserRound aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
                className="w-full"
              >
                {dict.shell.signInWithGoogle}
              </ButtonLink>
            )}
          </div>
        </div>
      </Dialog>

      <SignOutDialog open={signOutOpen} onClose={() => setSignOutOpen(false)} onConfirm={confirmSignOut} />
    </>
  );
}

function navLinkStyles(isCurrent: boolean) {
  return cx(
    "relative inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-full px-3.5 text-label text-ink",
    "transition-colors duration-150 ease-brand hover:bg-well",
    focusRing,
    isCurrent && "after:absolute after:inset-x-3.5 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-brand",
  );
}

/**
 * Open/close state for a header popover: closes on a click elsewhere, on Esc
 * (handing focus back to its button), when focus moves out, and on navigation.
 */
function usePopover(pathname: string) {
  const [open, setOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setOpen(false);
  }
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    const next = event.relatedTarget as Node | null;
    if (next && !event.currentTarget.contains(next)) setOpen(false);
  }

  return { open, setOpen, rootRef, triggerRef, onBlur };
}

/** The floating panel under a header button. Hidden with visibility, so its links leave the tab order too. */
function Popover({
  id,
  open,
  align,
  className,
  children,
}: {
  id: string;
  open: boolean;
  align: "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      className={cx(
        "absolute top-[calc(100%+8px)] z-10 rounded-lg border border-line bg-panel p-3 text-ink shadow-lift",
        "duration-150 ease-brand motion-reduce:transition-none",
        align === "center" ? "left-1/2 -translate-x-1/2" : "right-0",
        // Opening, visibility is not transitioned, so the links can take focus
        // on the very next Tab; a transitioned `visible` stays hidden until a
        // frame has run. Closing, it is, so the panel fades before it hides.
        open
          ? "visible translate-y-0 opacity-100 transition-[opacity,translate]"
          : "invisible -translate-y-1 opacity-0 transition-[opacity,translate,visibility]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function ExploreMenu({
  current,
  pathname,
  exploreHref,
  counts,
  total,
}: {
  current: boolean;
  pathname: string;
  exploreHref: string;
  counts: Record<PlaceCategory, number>;
  total: number;
}) {
  const { dict } = useLocale();
  const { open, setOpen, rootRef, triggerRef, onBlur } = usePopover(pathname);
  const panelId = useId();
  const close = () => setOpen(false);

  return (
    <div ref={rootRef} className="relative" onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={navLinkStyles(current)}
      >
        {dict.nav.explore}
        <ChevronDown
          aria-hidden
          strokeWidth={ICON_STROKE}
          className={cx("size-4 transition-transform duration-150 ease-brand", open && "rotate-180")}
        />
      </button>
      <Popover id={panelId} open={open} align="center" className="w-[520px]">
        <p className="px-3 pt-1 pb-2 text-small text-ink-soft">{dict.shell.exploreMenu}</p>
        <ul className="grid grid-cols-2 gap-1">
          {CATEGORY_ORDER.map((category) => {
            const Icon = categoryIcon[category];
            return (
              <li key={category}>
                <Link
                  href={`${exploreHref}?category=${category}`}
                  onClick={close}
                  className={cx("flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-well", focusRing)}
                >
                  <span className="grid size-10 flex-none place-items-center rounded-full bg-well text-brand">
                    <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                  </span>
                  <span className="grid text-label">
                    {dict.common.categories[category]}
                    <span className="text-credit font-normal text-ink-soft tabular-nums">
                      {fill(dict.ui.placeCount, { count: counts[category] ?? 0 })}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 border-t border-line pt-2">
          <Link
            href={exploreHref}
            onClick={close}
            className={cx(
              "group/all flex min-h-11 items-center justify-between rounded-md px-3 text-label text-brand hover:bg-well",
              focusRing,
            )}
          >
            {fill(dict.shell.allPlaces, { count: total })}
            <ArrowRight
              aria-hidden
              strokeWidth={ICON_STROKE}
              className="size-4 transition-transform duration-150 ease-brand group-hover/all:translate-x-0.5"
            />
          </Link>
        </div>
      </Popover>
    </div>
  );
}

function Avatar({ user, className }: { user: SessionUser; className?: string }) {
  const { dict } = useLocale();
  const name = user.name ?? user.email ?? dict.auth.menu.fallbackName;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      aria-hidden
      className={cx("grid size-9 place-items-center overflow-hidden rounded-full bg-brand text-label text-on-brand", className)}
    >
      {user.image ? (
        // eslint-disable-next-line @next/next/no-img-element -- a small external avatar; not worth a next/image remote pattern
        <img src={user.image} alt="" referrerPolicy="no-referrer" className="size-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

/** Desktop only: language, theme and the account, behind one quiet button. */
function AccountMenu({
  user,
  pathname,
  loginHref,
  links,
  onSignOut,
}: {
  user: SessionUser | null;
  pathname: string;
  loginHref: string;
  links: { href: string; label: string; icon: LucideIcon }[];
  onSignOut: () => void;
}) {
  const { dict } = useLocale();
  const { open, setOpen, rootRef, triggerRef, onBlur } = usePopover(pathname);
  const panelId = useId();
  const label = user
    ? fill(dict.auth.menu.trigger, { name: user.name ?? user.email ?? dict.auth.menu.fallbackName })
    : dict.shell.settings;

  return (
    <div ref={rootRef} className="relative hidden lg:block" onBlur={onBlur}>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className={iconButtonStyles({ tone: "plain" })}
      >
        {user ? <Avatar user={user} /> : <UserRound aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
      </button>
      <Popover id={panelId} open={open} align="end" className="grid w-[344px] gap-4 p-4">
        {user ? (
          <AccountBlock
            user={user}
            links={links}
            onSignOut={() => {
              setOpen(false);
              onSignOut();
            }}
            onNavigate={() => setOpen(false)}
          />
        ) : (
          <ButtonLink
            href={loginHref}
            variant="secondary"
            size="sm"
            icon={<UserRound aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
            onClick={() => setOpen(false)}
          >
            {dict.shell.signInWithGoogle}
          </ButtonLink>
        )}
        <div className="grid gap-4 border-t border-line pt-4">
          <Setting label={dict.footer.language}>
            <LanguageChoice />
          </Setting>
          <Setting label={dict.footer.theme}>
            <ThemeChoice />
          </Setting>
        </div>
      </Popover>
    </div>
  );
}

function Setting({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <p className="text-small text-ink-soft">{label}</p>
      {children}
    </div>
  );
}

/** Who is signed in, where their things are, and the way out. */
function AccountBlock({
  user,
  links,
  onSignOut,
  onNavigate,
}: {
  user: SessionUser;
  links: { href: string; label: string; icon: LucideIcon }[];
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const { dict } = useLocale();
  const rowStyles = cx(
    "flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-md px-2 text-label text-ink hover:bg-well",
    focusRing,
  );
  return (
    <div className="grid gap-1">
      <div className="flex items-center gap-3 px-2 pb-2">
        <Avatar user={user} className="size-10" />
        <div className="grid min-w-0">
          <span className="text-credit text-ink-soft">{dict.shell.signedInAs}</span>
          <span className="truncate text-label">{user.name ?? user.email ?? dict.auth.menu.fallbackName}</span>
        </div>
      </div>
      <ul className="grid gap-0.5">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link href={href} onClick={onNavigate} className={rowStyles}>
              <Icon aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-brand" />
              {label}
            </Link>
          </li>
        ))}
        <li>
          <button type="button" onClick={onSignOut} className={rowStyles}>
            <LogOut aria-hidden strokeWidth={ICON_STROKE} className="size-5 text-brand" />
            {dict.auth.menu.signOut}
          </button>
        </li>
      </ul>
    </div>
  );
}
