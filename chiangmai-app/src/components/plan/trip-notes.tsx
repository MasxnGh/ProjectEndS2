"use client";

import { useMemo, useState } from "react";
import { CloudFog, PartyPopper, TriangleAlert, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { getFestivalsOverlapping } from "@/lib/festivals";
import { addDaysIso } from "@/lib/date-utils";
import { isBurningSeasonDate } from "@/lib/weather/day-forecast";
import { IconButton } from "@/components/brand/icon-button";
import { ICON_STROKE } from "@/components/brand/icons";
import { todayIso } from "./plan-text";

function Note({
  icon,
  title,
  subtitle,
  dismissLabel,
  onDismiss,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  dismissLabel: string;
  onDismiss: () => void;
  children: React.ReactNode;
}) {
  return (
    <div role="note" className="relative grid grid-cols-[24px_minmax(0,1fr)_36px] gap-3 rounded-md bg-sand-fill py-4 pr-2 pl-4">
      <span className="mt-0.5 text-brand">{icon}</span>
      <div className="grid gap-1.5">
        <p className="text-label font-semibold text-brand">
          {title}
          {subtitle ? <span className="ml-2 text-small font-normal text-ink-soft">{subtitle}</span> : null}
        </p>
        {children}
      </div>
      <IconButton label={dismissLabel} tone="plain" size="xs" onClick={onDismiss} className="-mt-1">
        <X aria-hidden strokeWidth={ICON_STROKE} className="size-4" />
      </IconButton>
    </div>
  );
}

/**
 * Festivals on the trip's dates, and the burning-season note, as the old
 * banners had them: dismissible, and honest when a lunar date is an estimate.
 */
export function TripNotes({ travelDate, dayCount }: { travelDate: string; dayCount: number }) {
  const { locale, dict } = useLocale();
  const t = dict.planner.festival;
  const s = dict.weather.seasonalBanner;
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const dismiss = (key: string) => setDismissed((prev) => new Set(prev).add(key));

  const festivals = useMemo(() => {
    if (!travelDate || dayCount < 1) return [];
    return getFestivalsOverlapping(travelDate, addDaysIso(travelDate, dayCount - 1));
  }, [travelDate, dayCount]);

  const visible = festivals.filter((m) => !dismissed.has(`${m.festival.id}-${m.occurrence.year}`));
  const smog = (isBurningSeasonDate(travelDate || undefined) || isBurningSeasonDate(todayIso())) && !dismissed.has("smog");

  if (visible.length === 0 && !smog) return null;

  return (
    <div className="grid gap-2 print:hidden">
      {visible.map((match) => {
        const key = `${match.festival.id}-${match.occurrence.year}`;
        return (
          <Note
            key={key}
            icon={<PartyPopper aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
            title={match.festival.name[locale]}
            dismissLabel={t.dismiss}
            onDismiss={() => dismiss(key)}
          >
            <p className="text-small text-pretty text-ink">{match.festival.description[locale]}</p>
            <ul className="grid list-disc gap-0.5 pl-5 text-small text-ink-soft">
              {match.festival.advice.map((tip, i) => (
                <li key={i}>{tip[locale]}</li>
              ))}
            </ul>
            {!match.occurrence.verified ? (
              <p className="flex items-start gap-1.5 text-small text-pretty text-ink">
                <TriangleAlert aria-hidden strokeWidth={ICON_STROKE} className="mt-0.5 size-4 flex-none text-cmj-sunset" />
                {t.unverifiedDate}
              </p>
            ) : null}
          </Note>
        );
      })}
      {smog ? (
        <Note
          icon={<CloudFog aria-hidden strokeWidth={ICON_STROKE} className="size-5" />}
          title={s.title}
          subtitle={s.subtitle}
          dismissLabel={s.dismiss}
          onDismiss={() => dismiss("smog")}
        >
          <p className="text-small text-pretty text-ink">{s.body}</p>
          <ul className="grid list-disc gap-0.5 pl-5 text-small text-ink-soft">
            <li>{s.tip1}</li>
            <li>{s.tip2}</li>
            <li>{s.tip3}</li>
          </ul>
        </Note>
      ) : null}
    </div>
  );
}
