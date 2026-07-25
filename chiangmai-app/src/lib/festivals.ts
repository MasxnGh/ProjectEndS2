import { festivals, type Festival, type FestivalOccurrence } from "@/data/festivals";

export interface FestivalMatch {
  festival: Festival;
  occurrence: FestivalOccurrence;
}

function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/**
 * Finds every festival occurrence overlapping [tripStartIso, tripEndIso].
 * A trip spanning multiple years, or a festival with several tracked years,
 * can both produce more than one match — callers should be ready to show a
 * short list, not assume exactly one.
 */
export function getFestivalsOverlapping(tripStartIso: string, tripEndIso: string): FestivalMatch[] {
  const matches: FestivalMatch[] = [];
  for (const festival of festivals) {
    for (const occurrence of festival.occurrences) {
      if (rangesOverlap(tripStartIso, tripEndIso, occurrence.start, occurrence.end)) {
        matches.push({ festival, occurrence });
      }
    }
  }
  return matches;
}
