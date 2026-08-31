#!/usr/bin/env node
/**
 * Resolves candidate places to real coordinates before any of them are written
 * into the catalogue.
 *
 * This follows the method docs/places-sources.md already records for the
 * existing 193 entries: every coordinate comes from an OpenStreetMap Nominatim
 * result, and a candidate whose lookup fails or lands somewhere implausible is
 * **dropped rather than estimated**. Several well-known venues are missing from
 * the guide for exactly that reason, and that is the correct outcome — a pin in
 * the wrong place is worse than no entry, because the whole city-square system,
 * the distance sorting and the trip planner's travel times are all derived from
 * these numbers.
 *
 * Two gates, both borrowed from the photo pipeline that had to learn them:
 *
 *   - The result must sit inside Chiang Mai province, the same bounds
 *     src/data/places.test.ts asserts on every run.
 *   - The returned name must actually look like the place asked for. Nominatim
 *     answers a query for a closed restaurant with whatever else is nearby, and
 *     "somewhere near where you searched" is not the same as "the place".
 *
 * Usage: node scripts/resolve-place-candidates.mjs
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { namesLookLikeTheSamePlace } from "./lib/commons-match.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Matches PROVINCE_BOUNDS in src/data/places.test.ts. */
const PROVINCE = { minLat: 17.4, maxLat: 20.3, minLng: 97.8, maxLng: 99.7 };

/** Nominatim's usage policy is one request per second, absolute maximum. */
const REQUEST_GAP_MS = 1200;

const UA = "ChiangmaiJourney/1.0 (student project; https://github.com/MasxnGh/ProjectEndS2)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Candidates to look up. Names only — every number comes from the lookup.
 *
 * Chosen to fill gaps a visitor would notice rather than to inflate a count:
 * restaurants beyond the khao soi shortlist, a few museums and markets, and
 * daytrip-scale nature the catalogue skips.
 */
const CANDIDATES = [
  // The rest of the old city's wall. The site is built around that square, and
  // the catalogue held three of the five gates and one of the four bastions.
  { slug: "chiang-mai-gate", en: "Chiang Mai Gate", th: "ประตูเชียงใหม่", category: "village" },
  { slug: "suan-prung-gate", en: "Suan Prung Gate", th: "ประตูสวนปรุง", category: "village" },
  { slug: "jaeng-ku-hueang", en: "Jaeng Ku Hueang", th: "แจ่งกู่เฮือง", category: "village" },
  { slug: "jaeng-hua-rin", en: "Jaeng Hua Rin", th: "แจ่งหัวริน", category: "village" },
  { slug: "jaeng-katam", en: "Jaeng Katam", th: "แจ่งกะต๊ำ", category: "village" },

  // Restaurants the catalogue misses — it leans heavily on khao soi.
  { slug: "tong-tem-toh", en: "Tong Tem Toh", th: "ต๋องเต็มโต๊ะ", category: "restaurant" },
  { slug: "the-riverside-chiang-mai", en: "The Riverside Bar & Restaurant", th: "เดอะ ริเวอร์ไซด์", category: "restaurant" },
  { slug: "jia-tong-heng", en: "Jia Tong Heng", th: "เจี่ยท้งเฮง", category: "restaurant" },
  { slug: "khanom-jeen-san-pa-khoi", en: "Khanom Jeen San Pa Khoi", th: "ขนมจีนสันป่าข่อย", category: "restaurant" },
  { slug: "dash-restaurant-bar", en: "Dash Restaurant & Bar", th: "แดช เรสเตอรองท์ แอนด์ บาร์", category: "restaurant" },

  { slug: "somphet-market", en: "Somphet Market", th: "ตลาดสมเพชร", category: "market" },
];

async function nominatim(query) {
  const url =
    "https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=th&q=" +
    encodeURIComponent(query);
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

function inProvince(lat, lng) {
  return (
    lat >= PROVINCE.minLat && lat <= PROVINCE.maxLat && lng >= PROVINCE.minLng && lng <= PROVINCE.maxLng
  );
}

async function main() {
  const resolved = [];
  const dropped = [];

  for (const [i, candidate] of CANDIDATES.entries()) {
    process.stdout.write(`[${i + 1}/${CANDIDATES.length}] ${candidate.slug} ... `);
    try {
      const results = await nominatim(`${candidate.th}, เชียงใหม่`);
      // The name to match on is the part before the first comma — the venue,
      // not the road and district Nominatim appends.
      const hit = results.find((r) => {
        const lat = Number(r.lat);
        const lng = Number(r.lon);
        if (!inProvince(lat, lng)) return false;
        const found = r.name || r.display_name || "";
        // Both scripts. OSM labels these places in Thai — the first run
        // compared an English query against "วัดร่ำเปิง" and dropped a dozen
        // entries that were sitting right there in the results.
        return (
          namesLookLikeTheSamePlace(candidate.th, found) ||
          namesLookLikeTheSamePlace(candidate.en, found)
        );
      });
      if (!hit) {
        const why = results.length === 0 ? "no result" : "no result matched the name in province";
        console.log(`dropped (${why})`);
        dropped.push({ ...candidate, reason: why, sawCount: results.length });
      } else {
        const lat = Number(Number(hit.lat).toFixed(5));
        const lng = Number(Number(hit.lon).toFixed(5));
        console.log(`${lat}, ${lng}  — ${(hit.name || hit.display_name).slice(0, 46)}`);
        resolved.push({
          ...candidate,
          lat,
          lng,
          osmName: hit.name || null,
          osmType: hit.type || null,
          displayName: hit.display_name || null,
        });
      }
    } catch (err) {
      console.log(`error (${err.message})`);
      dropped.push({ ...candidate, reason: err.message });
    }
    await sleep(REQUEST_GAP_MS);
  }

  console.log(`\nresolved ${resolved.length}, dropped ${dropped.length}`);
  await fs.writeFile(
    path.join(ROOT, "scripts", "place-candidates.json"),
    JSON.stringify({ resolved, dropped }, null, 2) + "\n"
  );
  console.log("wrote scripts/place-candidates.json");
}

main();
