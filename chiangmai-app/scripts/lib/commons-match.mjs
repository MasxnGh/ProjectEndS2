/**
 * Deciding whether a Wikidata entity is the same place as one of ours.
 *
 * Two gates, and both are load-bearing:
 *
 *   - **Distance.** Searching Wikidata for "Wat Chedi Luang" by name returns a
 *     same-named temple 201km away. Without a coordinate check we would
 *     illustrate the Chiang Mai temple with a photo of a different one.
 *
 *   - **Name.** This is the gate people forget, and it is the more important
 *     of the two. Khao Soi Khun Yai sits 47m from Wat Khuan Khama, so
 *     "nearest entity that has a picture" would put a temple on a noodle
 *     shop's page. Being near a place is not being that place.
 *
 * The name comparison strips the words that every entry of a given kind shares
 * — "wat" is in most temple names here, "chiang mai" is in half the catalogue —
 * because matching on those is the same as not matching at all.
 *
 * A third gate, `kindIsConsistent`, checks what Wikidata says the entity *is*.
 * Names alone cannot separate Wat Tha Ton from the town of Tha Ton, which share
 * a name exactly; only the entity type can.
 */

/** Words too common in this catalogue to be evidence of anything. */
const STOPWORDS = new Set([
  "the", "of", "and", "a", "an", "at", "in", "on",
  "wat", "temple", "shrine", "chedi",
  "chiang", "mai", "thailand", "thai", "northern",
  // "night" is shared by every night market in the city, and matching on it
  // put a Chiang Mai Night Bazaar photo on Ploen Ruedee Night Market's page.
  "night",
  "national", "park", "market", "street", "walking", "road",
  "museum", "gallery", "centre", "center", "village", "community",
  "waterfall", "mountain", "doi", "ban", "baan",
  "วัด", "ตลาด", "ถนน", "พิพิธภัณฑ์", "บ้าน", "ดอย", "อุทยาน", "แห่งชาติ", "เชียงใหม่",
]);

/**
 * Lowercase, split, drop stopwords and very short tokens.
 *
 * Bracketed qualifiers are kept, not stripped. An early version removed them
 * as noise and a test caught the cost: "Sunday Walking Street (Tha Phae)" and
 * "Saturday Walking Street (Wua Lai)" are distinguished by nothing else, so
 * dropping the bracket left both as the word "walking" and made them
 * unmatchable against their real entities.
 *
 * `\p{M}` is in the keep-set because Thai vowels and tone marks are combining
 * marks, not letters. Without it every Thai name shattered at each vowel:
 * "อุทยานแห่งชาติดอยอินทนนท์" became ["ทยานแห","งชาต","ดอยอ","นทนนท"], and the
 * fragment "งชาต" — a shard of แห่งชาติ, "national" — was shared with
 * "หอดูดาวแห่งชาติ". That is how Doi Inthanon was matched to the Thai National
 * Observatory and illustrated with a photo of a telescope dome. Thai has no
 * word spaces, so a Thai name now stays one token and matching falls to the
 * containment branch below, which is the stricter path.
 */
export function distinctiveTokens(name) {
  return new Set(
    String(name)
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

/**
 * True when two names share at least one distinctive word.
 *
 * Deliberately permissive on transliteration (our "Wat Phra That Doi Suthep"
 * against a label of "Wat Phrathat Doi Suthep" still shares "suthep") and
 * strict on the failure that matters: two different places that merely sit
 * near each other share nothing once the common words are removed.
 */
export function namesLookLikeTheSamePlace(ours, theirs) {
  const a = distinctiveTokens(ours);
  const b = distinctiveTokens(theirs);
  if (a.size === 0 || b.size === 0) return false;
  for (const token of a) {
    if (b.has(token)) return true;
    // Catch transliteration joins, e.g. "phrathat" containing "phra".
    for (const other of b) {
      if (token.length >= 5 && other.includes(token)) return true;
      if (other.length >= 5 && token.includes(other)) return true;
    }
  }
  return false;
}

/** Wikidata P31 labels for a Buddhist temple, the commonest thing here. */
const WORSHIP_KINDS = new Set([
  "wat", "temple", "buddhist temple", "monastery", "buddhist monastery",
  "stupa", "chedi", "place of worship", "shrine",
]);

/**
 * Wikidata P31 labels for an inhabited area. Nothing in our catalogue is a
 * whole town, so one of these is always the wrong subject.
 */
const SETTLEMENT_KINDS = new Set([
  "tambon", "amphoe", "district", "subdistrict", "human settlement",
  "city", "town", "village", "municipality", "province",
]);

/**
 * Wikidata P31 labels for a business. Only landmarks are fetched, so a hotel or
 * a restaurant is never the subject — but one nearly slipped through: the
 * entity nearest Jaeng Si Phum Corner that shares a word with it is the "Si
 * Phum Heritage Boutique Bed & Breakfast", and it was rejected only because it
 * happened to have no photograph attached.
 */
const BUSINESS_KINDS = new Set([
  "hotel", "hostel", "guest house", "bed and breakfast", "resort",
  "restaurant", "cafe", "coffeehouse", "bar", "shop", "retail store",
  "business", "company", "enterprise", "brand",
]);

const looksLikeAWat = (name) => /\bwat\b/i.test(name) || name.includes("วัด");

/**
 * Checks that the entity is the same *kind* of thing as the place, using
 * Wikidata's own P31 labels.
 *
 * Names cannot do this job. Wat Tha Ton and the town of Tha Ton are named
 * identically, so the name gate accepted the tambon and captioned a panorama of
 * the town as the hilltop temple. In the other direction, both Chiang Dao Cave
 * and Jaeng Si Phum Corner sit inside a temple compound, so the nearest entity
 * was a wat and each would have been illustrated with a temple that is not the
 * thing the page is about.
 *
 * The test runs on the name rather than our own `category` field, because the
 * category is a loose bucket — Ban Haw Mosque is filed under "village", and a
 * category-symmetric rule would have thrown away a correct photo of it.
 * Unrecognised kinds pass: this gate exists to reject known mismatches, not to
 * require that Wikidata's vocabulary be fully enumerated here.
 */
export function kindIsConsistent(ourName, entityKinds) {
  const kinds = (entityKinds ?? []).map((k) => String(k).toLowerCase());
  if (kinds.some((k) => SETTLEMENT_KINDS.has(k))) return false;
  if (kinds.some((k) => BUSINESS_KINDS.has(k))) return false;
  const isWorship = kinds.some((k) => WORSHIP_KINDS.has(k));
  if (isWorship !== looksLikeAWat(ourName)) return false;
  return true;
}

/**
 * Reduces a Commons "Artist" field to a name that fits under a photo.
 *
 * The field is free-form wikitext, and some photographers put their whole
 * re-use policy in it. Wat Chiang Man's credit arrived as a 400-character
 * request not to upload modified versions without consulting the author, which
 * would have rendered as a wall of text across the hero image.
 *
 * Only the display is shortened. The full text stays on the Commons file page,
 * which every credit links to, so the attribution the licence requires is one
 * click away and unaltered.
 */
export function cleanArtist(raw) {
  const firstLine = String(raw ?? "")
    .split(/[\r\n]/)[0]
    .replace(/\s+/g, " ")
    .trim();
  if (!firstLine) return "unknown";
  // "This Photo was taken by Supanut Arunoprayote." — the name is the payload.
  const takenBy = firstLine.match(/(?:photo (?:was )?taken by|photograph by|by)\s+([^.,;]{2,60})/i);
  let candidate = takenBy ? takenBy[1].trim() : firstLine;
  // Some Thai uploaders prefix a description of their own upload, as in
  // "ผู้สร้างสรรค์ผลงาน/ส่งข้อมูลเก็บในคลังข้อมูลเสรีวิกิมีเดียคอมมอนส์ - เทวประภาส มากคล้าย".
  // Only take the tail when the head is far too long to be a name, so that an
  // ordinary "Jane Doe - photographer" credit still keeps the person's name.
  const dashed = candidate.split(/\s+[-–—]\s+/);
  if (dashed.length >= 2) {
    const head = dashed[0].trim();
    const tail = dashed[dashed.length - 1].trim();
    if (head.length > 60 && tail.length >= 2 && tail.length <= 60) candidate = tail;
  }
  if (candidate.length <= 60) return candidate;
  const sentence = candidate.split(/(?<=\.)\s/)[0];
  return sentence.length <= 60 ? sentence : candidate.slice(0, 57).trimEnd() + "…";
}

export function metresBetween(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
