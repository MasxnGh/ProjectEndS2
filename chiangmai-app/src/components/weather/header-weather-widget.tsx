"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { useWeatherBundle } from "@/lib/weather/use-weather";
import { useUnitStore, formatTemp } from "@/lib/weather/unit-store";
import { useCountUp } from "@/lib/weather/use-count-up";
import { WeatherIcon } from "@/components/weather/weather-icon";
import { AqiDot, AqiMeter } from "@/components/weather/aqi-meter";
import { CHIANGMAI_CENTER } from "@/lib/geo";
import { cn } from "@/lib/utils";

function updatedLabel(fetchedAt: string | undefined, dict: ReturnType<typeof useLocale>["dict"]) {
  if (!fetchedAt) return "";
  const minutes = Math.max(0, Math.round((Date.now() - new Date(fetchedAt).getTime()) / 60000));
  if (minutes < 1) return dict.weather.updatedJustNow;
  return dict.weather.updatedMinutesAgo.replace("{min}", String(minutes));
}

export function HeaderWeatherWidget() {
  const { locale, dict } = useLocale();
  const { unit, toggleUnit } = useUnitStore();
  const bundle = useWeatherBundle(CHIANGMAI_CENTER.lat, CHIANGMAI_CENTER.lng);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const displayTemp = useCountUp(
    bundle.weather ? formatTemp(bundle.weather.current.temperatureC, unit) : undefined
  );

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={dict.weather.forecast7Day}
        className="flex h-10 items-center gap-2 rounded-full border border-border px-3 text-sm font-medium text-foreground/85 transition-colors duration-200 hover:border-accent hover:text-accent-text"
      >
        {bundle.status === "loading" ? (
          <span className="h-4 w-16 animate-pulse rounded-full bg-surface-muted" />
        ) : bundle.status === "error" ? (
          <span className="text-xs text-foreground/60">{dict.weather.error}</span>
        ) : (
          <>
            <WeatherIcon
              icon={bundle.weather?.current.condition.icon ?? "cloudy"}
              size={18}
              className="text-accent-text"
            />
            <span className="tabular-nums">
              {displayTemp}°{unit}
            </span>
            {bundle.airQuality ? <AqiDot level={bundle.airQuality.level} /> : null}
          </>
        )}
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -4 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-full z-50 mt-3 w-[19rem] rounded-2xl border border-border bg-background p-5 shadow-xl"
          >
            {bundle.status === "error" ? (
              <div className="flex flex-col items-start gap-3 py-2">
                <p className="text-sm text-foreground/70">{dict.weather.error}</p>
                <button
                  type="button"
                  onClick={bundle.retry}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium hover:border-accent hover:text-accent-text"
                >
                  <RefreshCw className="h-3 w-3" />
                  {dict.weather.retry}
                </button>
              </div>
            ) : bundle.status === "loading" || !bundle.weather || !bundle.airQuality ? (
              <div className="space-y-3">
                <div className="h-10 w-24 animate-pulse rounded-full bg-surface-muted" />
                <div className="h-2 w-full animate-pulse rounded-full bg-surface-muted" />
                <div className="h-16 w-full animate-pulse rounded-xl bg-surface-muted" />
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <WeatherIcon icon={bundle.weather.current.condition.icon} size={30} className="text-accent-text" />
                      <span className="font-serif-display text-4xl tabular-nums leading-none">
                        {displayTemp}°{unit}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-foreground/70">
                      {bundle.weather.current.condition.label[locale]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleUnit}
                    className="rounded-full border border-border px-2.5 py-1 text-xs font-medium hover:border-accent hover:text-accent-text"
                  >
                    °C / °F
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-xs text-foreground/70">
                  <div>
                    <dt className="text-foreground/50">{dict.weather.feelsLike}</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {formatTemp(bundle.weather.current.apparentTemperatureC, unit)}°{unit}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">{dict.weather.humidity}</dt>
                    <dd className="mt-0.5 font-medium text-foreground">{bundle.weather.current.humidity}%</dd>
                  </div>
                  <div>
                    <dt className="text-foreground/50">{dict.weather.wind}</dt>
                    <dd className="mt-0.5 font-medium text-foreground">
                      {Math.round(bundle.weather.current.windSpeedKph)} km/h
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 border-t border-border pt-4">
                  <AqiMeter
                    usAqi={bundle.airQuality.usAqi}
                    level={bundle.airQuality.level}
                    pm25={bundle.airQuality.pm2_5}
                  />
                </div>

                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 text-xs font-medium text-foreground/50">{dict.weather.forecast7Day}</p>
                  <div className="flex justify-between gap-1">
                    {bundle.weather.daily.slice(0, 7).map((day) => (
                      <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
                        <span className="text-[0.65rem] text-foreground/50">
                          {new Date(day.date).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                            weekday: "short",
                          })}
                        </span>
                        <WeatherIcon icon={day.condition.icon} size={16} className="text-accent-text" />
                        <span className="text-[0.65rem] tabular-nums text-foreground/80">
                          {formatTemp(day.maxTempC, unit)}°
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  className={cn(
                    "mt-4 flex items-center justify-between text-[0.65rem] text-foreground/40",
                    bundle.status === "stale" && "text-accent-text"
                  )}
                >
                  <span>{updatedLabel(bundle.fetchedAt, dict)}</span>
                  {bundle.status === "stale" ? (
                    <span className="inline-flex items-center gap-1">
                      <RefreshCw className="h-2.5 w-2.5 animate-spin" />
                      {dict.weather.refreshing}
                    </span>
                  ) : null}
                </div>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
