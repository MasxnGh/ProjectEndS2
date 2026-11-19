"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { ImagePlus, Link2, Move, ShieldCheck, TriangleAlert, UserRound } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useTripStore } from "@/lib/trip-store";
import { CoverUploadFailure, shrinkPhoto, uploadCover, type CoverUploadError } from "@/lib/cover-upload";
import { uploadedCoverUrl } from "@/lib/trip-cover";
import { Button } from "@/components/brand/button";
import { ICON_STROKE } from "@/components/brand/icons";
import { RouteDots } from "@/components/brand/loaders";
import { cx, focusRing } from "@/components/brand/cx";

/** The photo being set up: the trip's current upload, or one just picked and not sent yet. */
type Draft =
  | { source: "saved"; id: string; focusY: number }
  | { source: "new"; blob: Blob; url: string; width: number; height: number; focusY: number };

const ACCEPT = "image/jpeg,image/png,image/webp";

/**
 * "Your photo" in the cover picker. Signed out, it explains why an account is
 * needed (the photo is kept with the trip on the server) and offers sign-in;
 * place photos stay a tab away either way.
 *
 * Signed in: pick or drop a photo, drag it up or down inside the cover's 2:1
 * frame, then "Use this photo" sends it and sets it. Nothing is uploaded until
 * then, so trying photos out costs nothing.
 */
export function CoverUploadPanel({ onClose }: { onClose: () => void }) {
  const { status } = useSession();
  if (status !== "authenticated") return <SignInNote />;
  return <UploadForm onClose={onClose} />;
}

function SignInNote() {
  const { dict } = useLocale();
  const t = dict.plan.cover;
  const pathname = usePathname();
  return (
    <div className="grid min-h-0 flex-1 content-start overflow-y-auto overscroll-contain px-5 py-4">
      <div className="grid gap-3 rounded-lg bg-sand-fill p-4">
        <p className="text-body text-pretty text-ink">
          <strong className="block font-semibold text-brand">{t.signInTitle}</strong>
          {t.signInBody}
        </p>
        <Button
          icon={<UserRound aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
          onClick={() => signIn("google", { callbackUrl: pathname })}
          className="justify-self-start"
        >
          {t.signIn}
        </Button>
      </div>
    </div>
  );
}

function UploadForm({ onClose }: { onClose: () => void }) {
  const { dict } = useLocale();
  const t = dict.plan.cover;
  const cover = useTripStore((s) => s.cover);
  const setCover = useTripStore((s) => s.setCover);
  const inputRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Draft | null>(() =>
    cover?.kind === "upload" ? { source: "saved", id: cover.id, focusY: cover.focusY } : null,
  );
  // The saved photo's size arrives when it loads; a new one's is known already.
  const [savedSize, setSavedSize] = useState<{ width: number; height: number } | null>(null);
  const [busy, setBusy] = useState<"reading" | "uploading" | null>(null);
  const [error, setError] = useState<CoverUploadError | null>(null);
  const [dropping, setDropping] = useState(false);

  // A picked photo is shown from an object URL; let it go when it is replaced
  // or the sheet closes.
  const draftUrl = draft?.source === "new" ? draft.url : null;
  useEffect(() => {
    if (!draftUrl) return;
    return () => URL.revokeObjectURL(draftUrl);
  }, [draftUrl]);

  async function take(file: File | undefined) {
    if (!file || busy) return;
    setError(null);
    setBusy("reading");
    try {
      const photo = await shrinkPhoto(file);
      setDraft({ source: "new", ...photo, url: URL.createObjectURL(photo.blob), focusY: 50 });
    } catch (failure) {
      setError(failure instanceof CoverUploadFailure ? failure.code : "unreadable");
    } finally {
      setBusy(null);
    }
  }

  async function apply() {
    if (!draft || busy) return;
    if (draft.source === "saved") {
      setCover({ kind: "upload", id: draft.id, focusY: draft.focusY });
      onClose();
      return;
    }
    setError(null);
    setBusy("uploading");
    try {
      const id = await uploadCover(draft.blob);
      setCover({ kind: "upload", id, focusY: draft.focusY });
      onClose();
    } catch (failure) {
      setError(failure instanceof CoverUploadFailure ? failure.code : "network");
      setBusy(null);
    }
  }

  function remove() {
    setCover(null);
    onClose();
  }

  const size = draft?.source === "new" ? { width: draft.width, height: draft.height } : savedSize;
  const errorText = error
    ? {
        unreadable: t.errorUnreadable,
        "too-large": t.errorTooLarge,
        limit: t.errorLimit,
        "signed-out": t.errorSignedOut,
        network: t.errorNetwork,
      }[error]
    : null;

  return (
    <>
      <div className="grid min-h-0 flex-1 content-start gap-3 overflow-y-auto overscroll-contain px-5 py-4">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          tabIndex={-1}
          aria-hidden
          className="sr-only"
          onChange={(event) => {
            void take(event.currentTarget.files?.[0]);
            // Cleared, so choosing the same file again still counts as a change.
            event.currentTarget.value = "";
          }}
        />

        {draft ? (
          <>
            <FocusFrame
              src={draft.source === "new" ? draft.url : uploadedCoverUrl(draft.id)}
              focusY={draft.focusY}
              size={size}
              onSize={setSavedSize}
              onMove={(focusY) => setDraft({ ...draft, focusY })}
              onUnavailable={() => setDraft(null)}
            />
            <Button
              variant="secondary"
              size="sm"
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              icon={<ImagePlus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />}
              className="justify-self-start"
            >
              {t.chooseOther}
            </Button>
          </>
        ) : (
          <div
            onDragOver={(event) => {
              if (!event.dataTransfer.types.includes("Files")) return;
              event.preventDefault();
              setDropping(true);
            }}
            onDragLeave={() => setDropping(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDropping(false);
              void take(event.dataTransfer.files[0]);
            }}
            className={cx(
              "grid aspect-[2/1] place-content-center justify-items-center gap-2.5 rounded-lg border-[1.5px] border-dashed px-4 text-center transition-colors duration-150",
              dropping ? "border-brand bg-well" : "border-line-strong",
            )}
          >
            <Button
              variant="secondary"
              size="sm"
              aria-busy={busy === "reading" || undefined}
              disabled={busy !== null}
              onClick={() => inputRef.current?.click()}
              icon={
                busy === "reading" ? (
                  <RouteDots />
                ) : (
                  <ImagePlus aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
                )
              }
            >
              {t.choose}
            </Button>
            <span className="hidden text-small text-ink-soft pointer-fine:block">{t.dropHint}</span>
          </div>
        )}

        <div aria-live="polite">
          {errorText ? (
            <p className="flex items-start gap-2 text-small text-pretty text-ink">
              <TriangleAlert
                aria-hidden
                strokeWidth={ICON_STROKE}
                className="mt-0.5 size-4 flex-none text-cmj-sunset"
              />
              {errorText}
            </p>
          ) : null}
        </div>

        <ul className="grid gap-1.5 text-small text-pretty text-ink-soft">
          <FinePrint icon={ImagePlus}>{t.fineFormats}</FinePrint>
          <FinePrint icon={ShieldCheck}>{t.finePrivacy}</FinePrint>
          <FinePrint icon={Link2}>{t.fineShared}</FinePrint>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line p-4">
        {/* Also while the saved photo cannot be shown (the drop zone is back):
            the trip still points at it until it is removed or replaced. */}
        {cover?.kind === "upload" && draft?.source !== "new" ? (
          <Button
            variant="ghost"
            size="sm"
            disabled={busy !== null}
            onClick={remove}
            className="-ml-3 underline underline-offset-4"
          >
            {t.remove}
          </Button>
        ) : null}
        <Button
          onClick={apply}
          disabled={!draft || busy !== null}
          aria-busy={busy === "uploading" || undefined}
          icon={busy === "uploading" ? <RouteDots /> : undefined}
          className="ml-auto"
        >
          {busy === "uploading" ? t.uploading : t.use}
        </Button>
      </div>
    </>
  );
}

function FinePrint({ icon: Icon, children }: { icon: typeof ImagePlus; children: React.ReactNode }) {
  return (
    <li className="flex gap-2">
      <Icon aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-brand" />
      <span>{children}</span>
    </li>
  );
}

/** A photo taller than the 2:1 frame leaves this much of itself hidden, as a share of the frame's width. */
function hiddenHeight(size: { width: number; height: number }): number {
  return size.height / size.width - 0.5;
}

/**
 * The cover's 2:1 frame with the photo in it. When the photo is taller than
 * the frame, dragging it (or the arrow keys) chooses which band of it shows;
 * that is `focusY`, the same object-position every cover is drawn with.
 * A photo as wide as the frame or wider has nothing to move, so it is shown
 * as it is, without the slider or the hint.
 *
 * As a slider its value is how far toward the top the frame sits (100 is the
 * top), so the up arrow shows more of the top of the photo.
 */
function FocusFrame({
  src,
  focusY,
  size,
  onSize,
  onMove,
  onUnavailable,
}: {
  src: string;
  focusY: number;
  size: { width: number; height: number } | null;
  onSize: (size: { width: number; height: number }) => void;
  onMove: (focusY: number) => void;
  onUnavailable: () => void;
}) {
  const { dict } = useLocale();
  const t = dict.plan.cover;
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerId: number; startY: number; startFocus: number; hiddenPx: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const movable = size !== null && hiddenHeight(size) > 0.01;
  const clamp = (value: number) => Math.round(Math.min(100, Math.max(0, value)));
  const value = 100 - focusY;
  const valueText = focusY < 34 ? t.positionTop : focusY > 66 ? t.positionBottom : t.positionMiddle;

  const image = (
    // eslint-disable-next-line @next/next/no-img-element -- an object URL, or the owner-only cover route: neither can go through the optimizer
    <img
      src={src}
      alt=""
      draggable={false}
      onLoad={(event) => onSize({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
      onError={onUnavailable}
      className="pointer-events-none absolute inset-0 size-full object-cover select-none"
      style={{ objectPosition: `50% ${focusY}%` }}
    />
  );

  if (!movable) {
    return <div className="relative aspect-[2/1] overflow-hidden rounded-lg bg-sand-fill">{image}</div>;
  }

  return (
    <div
      ref={frameRef}
      role="slider"
      tabIndex={0}
      aria-label={t.position}
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onPointerDown={(event) => {
        const frame = frameRef.current;
        if (!frame || !size || event.button !== 0) return;
        const rect = frame.getBoundingClientRect();
        const hiddenPx = rect.width * hiddenHeight(size);
        if (hiddenPx <= 1) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startFocus: focusY, hiddenPx };
        setDragging(true);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (!drag || drag.pointerId !== event.pointerId) return;
        // The photo follows the finger: dragging down brings its upper part
        // into the frame, which is a smaller focusY.
        onMove(clamp(drag.startFocus - ((event.clientY - drag.startY) / drag.hiddenPx) * 100));
      }}
      onPointerUp={() => {
        dragRef.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        dragRef.current = null;
        setDragging(false);
      }}
      onKeyDown={(event) => {
        const step = { ArrowUp: -5, ArrowDown: 5, PageUp: -20, PageDown: 20 }[event.key];
        if (step !== undefined) onMove(clamp(focusY + step));
        else if (event.key === "Home") onMove(100);
        else if (event.key === "End") onMove(0);
        else return;
        event.preventDefault();
      }}
      className={cx(
        "relative aspect-[2/1] touch-none overflow-hidden rounded-lg bg-sand-fill select-none",
        dragging ? "cursor-grabbing" : "cursor-grab",
        focusRing,
      )}
    >
      {image}
      <span
        aria-hidden
        className={cx(
          "pointer-events-none absolute top-1/2 left-1/2 inline-flex h-8.5 -translate-1/2 items-center gap-1.5 rounded-full bg-[rgb(23_34_31/0.62)] px-3.5 text-small whitespace-nowrap text-white transition-opacity duration-150",
          dragging && "opacity-0",
        )}
      >
        <Move aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
        {t.dragHint}
      </span>
    </div>
  );
}
