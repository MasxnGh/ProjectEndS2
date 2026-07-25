const RAD = Math.PI / 180;
/** Official sunrise/sunset zenith angle — accounts for atmospheric refraction and the sun's apparent radius. */
const ZENITH = 90.833;

function dayOfYear(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(y, 0, 1)) / 86_400_000) + 1;
}

function normalizeDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Sunrise/sunset for a date and location, as local-clock minutes since
 * midnight (0–1440). Uses the standard almanac solar-position formula
 * (public-domain, the same approach behind most sunrise/sunset calculators)
 * rather than a lookup table — it's real astronomy, computable for any
 * date, so it works even for trip days far beyond the weather forecast's
 * 16-day window. Returns null only for latitudes/dates where the sun
 * genuinely doesn't rise or set (polar day/night) — never the case for
 * Chiang Mai, but the math is general.
 */
export function calculateSunTimes(
  lat: number,
  lng: number,
  isoDate: string,
  utcOffsetHours = 7
): { sunriseMinutes: number; sunsetMinutes: number } | null {
  const n = dayOfYear(isoDate);
  const lngHour = lng / 15;

  function compute(isSunrise: boolean): number | null {
    const t = n + ((isSunrise ? 6 : 18) - lngHour) / 24;
    const M = 0.9856 * t - 3.289;
    const L = normalizeDegrees(
      M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634
    );
    let RA = normalizeDegrees(Math.atan(0.91764 * Math.tan(L * RAD)) / RAD);
    const lQuadrant = Math.floor(L / 90) * 90;
    const raQuadrant = Math.floor(RA / 90) * 90;
    RA = (RA + (lQuadrant - raQuadrant)) / 15;

    const sinDec = 0.39782 * Math.sin(L * RAD);
    const cosDec = Math.cos(Math.asin(sinDec));
    const cosH =
      (Math.cos(ZENITH * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
    if (cosH > 1 || cosH < -1) return null;

    const H = (isSunrise ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD) / 15;
    const T = H + RA - 0.06571 * t - 6.622;
    const utHours = ((T - lngHour) % 24 + 24) % 24;
    const localHours = ((utHours + utcOffsetHours) % 24 + 24) % 24;
    return Math.round(localHours * 60);
  }

  const sunriseMinutes = compute(true);
  const sunsetMinutes = compute(false);
  if (sunriseMinutes === null || sunsetMinutes === null) return null;
  return { sunriseMinutes, sunsetMinutes };
}
