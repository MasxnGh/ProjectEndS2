"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CalendarRange, Copy, MapPin, Pencil, Share2, Trash2 } from "lucide-react";
import { getPlaceBySlug } from "@/data/places";
import { getPlacePhoto } from "@/data/photo-manifest";
import { PlaceImage } from "@/components/place-image";
import { useLocale } from "@/components/providers/locale-provider";
import { useToast } from "@/components/toast/toast-provider";
import type { SerializedTrip } from "@/lib/db/types";
import type { Locale } from "@/i18n";
import { AnimatePresence, motion } from "motion/react";
import { useMotionTokens } from "@/lib/motion";
import { ConfirmDialog } from "@/components/trips/confirm-dialog";
import { RenameDialog } from "@/components/trips/rename-dialog";
import { ShareDialog } from "@/components/trips/share-dialog";

function countPlaces(trip: SerializedTrip): number {
  return trip.days.reduce((total, day) => total + day.stops.length, 0);
}

function firstPlaceSlug(trip: SerializedTrip): string | null {
  for (const day of trip.days) {
    if (day.stops[0]) return day.stops[0].placeSlug;
  }
  return null;
}

function formatDate(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function MyTripsList({
  initialTrips,
  loadFailed,
  locale,
}: {
  initialTrips: SerializedTrip[];
  loadFailed: boolean;
  locale: Locale;
}) {
  const { dict } = useLocale();
  const t = dict.myTrips;
  const { showToast } = useToast();
  const m = useMotionTokens();

  const [trips, setTrips] = useState(initialTrips);
  const [renaming, setRenaming] = useState<SerializedTrip | null>(null);
  const [deleting, setDeleting] = useState<SerializedTrip | null>(null);
  const [sharing, setSharing] = useState<SerializedTrip | null>(null);

  const replaceTrip = useCallback((updated: SerializedTrip) => {
    setTrips((current) => current.map((trip) => (trip.id === updated.id ? updated : trip)));
  }, []);

  const handleRename = useCallback(
    async (trip: SerializedTrip, title: string) => {
      setRenaming(null);
      const res = await fetch(`/api/trips/${trip.id}/meta`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        showToast({ message: t.rename.failed });
        return;
      }
      const data = await res.json();
      replaceTrip(data.trip as SerializedTrip);
    },
    [replaceTrip, showToast, t.rename.failed]
  );

  const handleDuplicate = useCallback(
    async (trip: SerializedTrip) => {
      const res = await fetch(`/api/trips/${trip.id}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: t.duplicate.suffix.replace("{title}", trip.title || t.untitled),
        }),
      });
      if (!res.ok) {
        showToast({ message: t.duplicate.failed });
        return;
      }
      const data = await res.json();
      // Newest-first ordering matches the server's sort, so a fresh copy
      // belongs at the top without a reload.
      setTrips((current) => [data.trip as SerializedTrip, ...current]);
      showToast({ message: t.duplicate.done });
    },
    [showToast, t.duplicate, t.untitled]
  );

  const handleDelete = useCallback(
    async (trip: SerializedTrip) => {
      setDeleting(null);
      const previous = trips;
      // Removed from the list immediately; the server call decides whether it
      // stays gone. On failure the exact previous list is restored rather than
      // re-inserting at the end, so ordering survives too.
      setTrips((current) => current.filter((item) => item.id !== trip.id));

      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (!res.ok) {
        setTrips(previous);
        showToast({ message: t.remove.failed });
        return;
      }

      showToast({
        message: t.remove.done,
        actions: [
          {
            label: t.remove.undo,
            onClick: async () => {
              const restore = await fetch(`/api/trips/${trip.id}/restore`, { method: "POST" });
              if (!restore.ok) {
                showToast({ message: t.remove.restoreFailed });
                return;
              }
              const data = await restore.json();
              setTrips((current) =>
                current.some((item) => item.id === trip.id)
                  ? current
                  : [data.trip as SerializedTrip, ...current]
              );
            },
          },
        ],
      });
    },
    [trips, showToast, t.remove]
  );

  if (trips.length === 0) {
    return (
      <section className="mt-12 rounded-lg border border-dashed border-border-strong p-10 text-center">
        <h2 className="font-serif-display text-2xl">{t.empty.title}</h2>
        <p className="mx-auto mt-3 max-w-md leading-relaxed text-muted-foreground text-pretty">
          {loadFailed ? t.loadFailed : t.empty.body}
        </p>
        <Link
          href={`/${locale}/planner`}
          className="mt-6 inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:brightness-95"
        >
          {t.empty.cta}
        </Link>
      </section>
    );
  }

  return (
    <>
      {/* Cards arrive in sequence rather than as one block, and a deleted card
          shrinks out instead of the grid snapping shut under the cursor —
          which matters here because deletion is undoable and the eye needs to
          see which card left. */}
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
        {trips.map((trip, index) => {
          const slug = firstPlaceSlug(trip);
          const place = slug ? getPlaceBySlug(slug) : null;
          const places = countPlaces(trip);
          const title = trip.title || t.untitled;

          return (
            <motion.li
              key={trip.id}
              layout={m.reduced ? false : "position"}
              initial={{ opacity: 0, y: m.reduced ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: m.reduced ? 1 : 0.96 }}
              transition={{ ...m.tween("base"), delay: Math.min(index, 8) * m.stagger(0.05) }}
              className="flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface"
            >
              <Link
                href={`/${locale}/planner?trip=${trip.id}`}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
              >
                <div className="relative h-36 w-full">
                  {place ? (
                    <PlaceImage
                      category={place.category}
                      paletteSeed={place.paletteSeed}
                      photoSrc={getPlacePhoto(place.slug)}
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full bg-surface-muted" />
                  )}
                </div>
                <div className="p-5 pb-3">
                  <h2 className="font-serif-display text-xl leading-snug">{title}</h2>
                </div>
              </Link>

              <div className="flex-1 px-5 pb-4">
                <dl className="space-y-1.5 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <CalendarRange className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <dd>
                      {trip.startDate ? formatDate(trip.startDate, locale) : t.noDates}
                      {" · "}
                      {trip.days.length === 1
                        ? t.dayCountOne
                        : t.dayCount.replace("{count}", String(trip.days.length))}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
                    <dd>
                      {places === 1 ? t.placeCountOne : t.placeCount.replace("{count}", String(places))}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  {t.updated.replace("{date}", formatDate(trip.updatedAt, locale))}
                </p>
              </div>

              <div className="flex flex-wrap gap-1 border-t border-border p-2">
                <IconAction label={t.actions.rename} onClick={() => setRenaming(trip)}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </IconAction>
                <IconAction label={t.actions.duplicate} onClick={() => handleDuplicate(trip)}>
                  <Copy className="h-4 w-4" aria-hidden="true" />
                </IconAction>
                <IconAction label={t.actions.share} onClick={() => setSharing(trip)}>
                  <Share2 className="h-4 w-4" aria-hidden="true" />
                </IconAction>
                <IconAction label={t.actions.delete} destructive onClick={() => setDeleting(trip)}>
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </IconAction>
              </div>
            </motion.li>
          );
        })}
        </AnimatePresence>
      </ul>

      {renaming ? (
        <RenameDialog
          initialTitle={renaming.title}
          onCancel={() => setRenaming(null)}
          onSave={(title) => handleRename(renaming, title)}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={t.remove.title}
          body={t.remove.body.replace("{title}", deleting.title || t.untitled)}
          confirmLabel={t.remove.confirm}
          cancelLabel={t.remove.cancel}
          destructive
          onCancel={() => setDeleting(null)}
          onConfirm={() => handleDelete(deleting)}
        />
      ) : null}

      {sharing ? (
        <ShareDialog
          trip={sharing}
          locale={locale}
          onClose={() => setSharing(null)}
          onUpdated={(updated) => {
            replaceTrip(updated);
            setSharing(updated);
          }}
        />
      ) : null}
    </>
  );
}

function IconAction({
  label,
  onClick,
  destructive,
  children,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      // The icon carries no text, so the accessible name comes from the label
      // and the same string doubles as the hover tooltip.
      aria-label={label}
      title={label}
      className={`rounded-md p-2 text-muted-foreground transition-colors hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
        destructive ? "hover:text-destructive" : "hover:text-accent-text"
      }`}
    >
      {children}
    </button>
  );
}
