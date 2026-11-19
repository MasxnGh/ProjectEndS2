"use client";

import { useState, type ReactNode } from "react";
import { PlacePhoto, type PhotoGrade } from "@/components/brand/place-photo";
import { uploadedCoverUrl, type UploadCover } from "@/lib/trip-cover";

type CoverImageProps = {
  /** The traveller's own photo, when the cover is one. */
  upload: UploadCover | null;
  /** The place photo to show otherwise, and if the upload cannot be shown (coverSlug). */
  placeSlug: string | null;
  uploadAlt: string;
  placeAlt: string;
  sizes: string;
  /** For the place photo only: the traveller's own photo is shown as they took it. */
  grade?: PhotoGrade;
  eager?: boolean;
};

/**
 * Whether the upload is still the thing to show. It stops being so when the
 * photo will not load: a plan kept on this device after signing out, or a
 * share whose owner has since changed the photo. The place photo takes over.
 */
function useUploadShown(upload: UploadCover | null) {
  const [failedId, setFailedId] = useState<string | null>(null);
  return {
    shown: upload !== null && failedId !== upload.id,
    onFail: () => setFailedId(upload?.id ?? null),
  };
}

function UploadedPhoto({
  upload,
  alt,
  eager,
  onFail,
}: {
  upload: UploadCover;
  alt: string;
  eager: boolean;
  onFail: () => void;
}) {
  return (
    <div className="relative size-full overflow-hidden bg-sand-fill">
      {/* A plain <img>, not next/image: the optimizer would fetch the photo
          from the server without the viewer's session, and the route only
          serves it to the owner or to a share link's viewers. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={uploadedCoverUrl(upload.id)}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        decoding="async"
        onError={onFail}
        className="absolute inset-0 size-full object-cover"
        style={{ objectPosition: `50% ${upload.focusY}%` }}
      />
    </div>
  );
}

/**
 * A trip's cover as a picture that fills its parent (give the parent the size
 * and the radius, as for PlacePhoto). With neither an upload nor a place
 * photo, `fallback` renders.
 */
export function TripCoverImage({
  upload,
  placeSlug,
  uploadAlt,
  placeAlt,
  sizes,
  grade,
  eager = false,
  fallback = null,
}: CoverImageProps & { fallback?: ReactNode }) {
  const { shown, onFail } = useUploadShown(upload);
  if (upload && shown) return <UploadedPhoto upload={upload} alt={uploadAlt} eager={eager} onFail={onFail} />;
  if (!placeSlug) return <>{fallback}</>;
  return <PlacePhoto slug={placeSlug} alt={placeAlt} sizes={sizes} grade={grade} eager={eager} fallback={fallback} />;
}

/**
 * A trip's cover with its caption: the place photo's credit, which only
 * belongs under a place photo, never under the traveller's own. `overlay`
 * sits on the picture (the planner's "Change cover").
 */
export function TripCoverFigure({
  upload,
  placeSlug,
  uploadAlt,
  placeAlt,
  sizes,
  grade,
  eager = false,
  className,
  frameClassName,
  overlay,
  credit,
}: CoverImageProps & { className?: string; frameClassName: string; overlay?: ReactNode; credit?: ReactNode }) {
  const { shown, onFail } = useUploadShown(upload);
  const showPlace = !(upload && shown) && placeSlug !== null;
  return (
    <figure className={className}>
      <div className={frameClassName}>
        {upload && shown ? (
          <UploadedPhoto upload={upload} alt={uploadAlt} eager={eager} onFail={onFail} />
        ) : placeSlug ? (
          <PlacePhoto slug={placeSlug} alt={placeAlt} sizes={sizes} grade={grade} eager={eager} />
        ) : null}
        {overlay}
      </div>
      {showPlace && credit ? <figcaption>{credit}</figcaption> : null}
    </figure>
  );
}
