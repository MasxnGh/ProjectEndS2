"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { CalendarRange, Copy, Luggage, MapPin, Pencil, Share2, Trash2 } from "lucide-react";
import { getPlaceBySlug } from "@/data/places";
import { ButtonLink } from "@/components/brand/button";
import { cx, focusRing } from "@/components/brand/cx";
import { IconButton } from "@/components/brand/icon-button";
import { categoryIcon, ICON_STROKE } from "@/components/brand/icons";
import { NoPhoto } from "@/components/brand/place-photo";
import { fill } from "@/components/brand/place-text";
import { dayCountLabel, placeCountLabel } from "@/components/plan/plan-text";
import { useLocale } from "@/components/providers/locale-provider";
import { coverSlug, tripStopSlugs } from "@/lib/trip-cover";
import { TripCoverImage } from "@/components/plan/trip-cover-image";
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

      // The restore route has no deadline, so a failed undo can always be
      // tried again: the failure toast carries that action instead of
      // leaving the trip lost.
      const restore = async () => {
        const response = await fetch(`/api/trips/${trip.id}/restore`, { method: "POST" }).catch(() => null);
        if (!response?.ok) {
          showToast({
            message: t.remove.restoreFailed,
            actions: [{ label: t.remove.restoreRetry, onClick: restore }],
          });
          return;
        }
        const data = await response.json();
        setTrips((current) =>
          current.some((item) => item.id === trip.id)
            ? current
            : [data.trip as SerializedTrip, ...current]
        );
      };

      showToast({
        message: t.remove.done,
        actions: [{ label: t.remove.undo, onClick: restore }],
      });
    },
    [trips, showToast, t.remove]
  );

  if (trips.length === 0) {
    return (
      <section className="grid justify-items-center gap-3 rounded-lg bg-well px-6 py-12 text-center">
        <span aria-hidden className="grid size-14 place-items-center rounded-full bg-panel text-brand">
          <Luggage strokeWidth={ICON_STROKE} className="size-6" />
        </span>
        <h2 className="text-title font-semibold text-brand">{t.empty.title}</h2>
        <p className="max-w-[44ch] text-body text-pretty text-ink-soft">{loadFailed ? t.loadFailed : t.empty.body}</p>
        <ButtonLink href={`/${locale}/planner`} arrow className="mt-2">
          {t.empty.cta}
        </ButtonLink>
      </section>
    );
  }

  return (
    <>
      {/* Cards arrive in sequence rather than as one block, and a deleted card
          shrinks out instead of the grid snapping shut under the cursor —
          which matters here because deletion is undoable and the eye needs to
          see which card left. */}
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence initial={false}>
        {trips.map((trip, index) => {
          const slug = firstPlaceSlug(trip);
          const place = slug ? getPlaceBySlug(slug) : null;
          const cover = coverSlug(trip.cover, tripStopSlugs(trip.days));
          const upload = trip.cover?.kind === "upload" ? trip.cover : null;
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
              className="flex h-full flex-col overflow-hidden rounded-lg border border-line bg-panel shadow-float"
            >
              <Link
                href={`/${locale}/planner?trip=${trip.id}`}
                className={cx("group/trip block rounded-t-lg", focusRing, "focus-visible:outline-offset-[-3px]")}
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  {/* The trip's cover, or its first stop with a photo; a trip with
                      no photographed stop shows its first place's art. */}
                  <TripCoverImage
                    upload={upload}
                    placeSlug={cover}
                    uploadAlt=""
                    placeAlt=""
                    sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1024px) 45vw, 400px"
                    fallback={
                      place ? (
                        <NoPhoto
                          icon={categoryIcon[place.category]}
                          caption={place.name[locale]}
                          label={place.name[locale]}
                          size="md"
                        />
                      ) : (
                        <NoPhoto icon={Luggage} label={title} size="md" />
                      )
                    }
                  />
                </div>
                <h2 className="px-5 pt-4 text-title font-semibold text-pretty text-ink group-hover/trip:text-brand group-hover/trip:underline group-hover/trip:decoration-[1.5px] group-hover/trip:underline-offset-4">
                  {title}
                </h2>
              </Link>

              <div className="grid flex-1 content-start gap-1.5 px-5 pt-2 pb-4 text-small text-ink-soft tabular-nums">
                <p className="flex items-center gap-2">
                  <CalendarRange aria-hidden strokeWidth={ICON_STROKE} className="size-4 flex-none text-brand" />
                  {trip.startDate ? formatDate(trip.startDate, locale) : t.noDates}
                  {" · "}
                  {dayCountLabel(trip.days.length, dict)}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin aria-hidden strokeWidth={ICON_STROKE} className="size-4 flex-none text-brand" />
                  {placeCountLabel(places, dict)}
                </p>
                <p className="mt-1.5 text-credit">{fill(t.updated, { date: formatDate(trip.updatedAt, locale) })}</p>
              </div>

              <div className="flex gap-1 border-t border-line p-2">
                <IconButton label={fill(t.actions.actionFor, { action: t.actions.rename, title })} title={t.actions.rename} tone="plain" onClick={() => setRenaming(trip)}>
                  <Pencil aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                </IconButton>
                <IconButton label={fill(t.actions.actionFor, { action: t.actions.duplicate, title })} title={t.actions.duplicate} tone="plain" onClick={() => handleDuplicate(trip)}>
                  <Copy aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                </IconButton>
                <IconButton label={fill(t.actions.actionFor, { action: t.actions.share, title })} title={t.actions.share} tone="plain" onClick={() => setSharing(trip)}>
                  <Share2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                </IconButton>
                <IconButton label={fill(t.actions.actionFor, { action: t.actions.delete, title })} title={t.actions.delete} tone="plain" onClick={() => setDeleting(trip)} className="ml-auto">
                  <Trash2 aria-hidden strokeWidth={ICON_STROKE} className="size-5" />
                </IconButton>
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
