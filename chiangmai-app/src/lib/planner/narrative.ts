export type TransitionBucket = "adjacent" | "short" | "medium" | "long";

/** Buckets a real travel-time figure into one of a few narrative phrasings — the UI looks up the actual wording per locale from the dictionary, keyed by this id. */
export function transitionBucket(travelMinutes: number): TransitionBucket {
  if (travelMinutes <= 5) return "adjacent";
  if (travelMinutes <= 15) return "short";
  if (travelMinutes <= 40) return "medium";
  return "long";
}
