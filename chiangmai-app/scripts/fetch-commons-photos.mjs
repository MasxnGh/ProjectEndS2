#!/usr/bin/env node
/**
 * Fetches place photography from Wikimedia Commons, via Wikidata.
 *
 * This replaces a keyword search against a stock library. The difference is
 * not the source, it is what "matching" means. The old script asked Pexels for
 * the first result for a phrase like "specialty coffee shop Thailand" and
 * captioned whatever came back with the name of a specific place. An audit of
 * its 26 downloads found four that could be shown to depict the place named,
 * three that depicted somewhere else entirely (a temple 700km away in Pattaya,
 * a village in a different province) and one street-food photo captioned as
 * four separate markets at once.
 *
 * Here a photo is accepted only when Wikidata attaches it to the entity
 * (property P18), that entity's own coordinates (P625) sit within
 * MAX_DISTANCE_M of the coordinates already in our catalogue, and the entity is
 * the same kind of thing (P31). All three gates are needed, and each was added
 * after the previous set let something wrong through:
 *
 *   - Name alone is not enough. Searching "Wat Chedi Luang" returns a
 *     same-named temple 201km away; the coordinate check rejects it.
 *   - Proximity alone is not enough, and is the more dangerous of the two.
 *     Khao Soi Khun Yai sits 47m from Wat Khuan Khama, so "nearest entity with
 *     a picture" would illustrate a noodle shop with a temple. Nearby is not
 *     the same as the same, so the entity must also be the one whose name we
 *     searched for.
 *   - Name and proximity together are still not enough. A first full run
 *     accepted 41 photos, and an audit of what each match actually rested on
 *     found five wrong: the town of Tha Ton standing in for the temple above
 *     it, a wat at the mouth of Chiang Dao Cave standing in for the cave, a
 *     temple standing in for a city wall corner, one night market standing in
 *     for another, and a telescope dome standing in for Doi Inthanon. The type
 *     check in kindIsConsistent() is what rejects the first three.
 *
 * Everything Commons reports about licence and authorship is recorded, because
 * most of these are CC BY-SA where attribution is a licence condition rather
 * than a courtesy.
 *
 * Usage: node scripts/fetch-commons-photos.mjs [--dry] [--only=slug,slug]
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  namesLookLikeTheSamePlace,
  metresBetween,
  kindIsConsistent,
  cleanArtist,
} from "./lib/commons-match.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/**
 * How far an entity may sit from our own coordinate and still count as the
 * same place. Generous enough for a temple compound or a waterfall whose pin
 * is on the car park, tight enough that the next business along the street
 * cannot qualify.
 */
const MAX_DISTANCE_M = 400;

/** Commons is a volunteer service; this is the polite floor between requests. */
const REQUEST_GAP_MS = 1100;

const UA = "ChiangmaiJourney/1.0 (student project; https://github.com/MasxnGh/ProjectEndS2)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Wikimedia answers rate limiting with an HTML error page, which JSON.parse
 * reports as a confusing syntax error about an unexpected token. Fail with the
 * status line instead, so a throttled run is obvious.
 */
async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  const text = await res.text();
  if (!text.trimStart().startsWith("{")) {
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 80)}`);
  }
  return JSON.parse(text);
}

/**
 * Reads slug, English name and coordinates straight from the data files. Node
 * has no TypeScript loader here, so this parses with a regex — the same
 * approach generate-blur-placeholders.mjs already takes.
 */
async function readPlaces() {
  const dir = path.join(ROOT, "src", "data", "places");
  const files = (await fs.readdir(dir)).filter(
    (f) => f.endsWith(".ts") && !f.endsWith(".test.ts") && f !== "index.ts" && f !== "shared.ts"
  );
  const places = [];
  for (const file of files) {
    const source = await fs.readFile(path.join(dir, file), "utf8");
    const re =
      /slug: "([^"]+)"[\s\S]*?name: \{ en: "([^"]+)", th: "([^"]+)" \}[\s\S]*?category: "([^"]+)"[\s\S]*?coordinates: \{ lat: ([\d.]+), lng: ([\d.]+) \}/g;
    let m;
    while ((m = re.exec(source))) {
      places.push({ slug: m[1], name: m[2], nameTh: m[3], category: m[4], lat: +m[5], lng: +m[6] });
    }
  }
  return places;
}

/**
 * Named businesses are excluded outright rather than attempted and rejected.
 * Commons has no free photograph of a specific cafe or noodle shop, so every
 * candidate would be either a neighbouring building or a generic interior, and
 * an illustrated placeholder is more honest than either.
 */
const PHOTOGRAPHABLE_CATEGORIES = new Set(["temple", "nature", "museum", "village", "market"]);

/**
 * Reads an entity's "instance of" (P31) values and resolves them to English
 * labels, which is the vocabulary kindIsConsistent() is written against.
 *
 * Only called for a candidate that already passed the name check, so this costs
 * roughly one extra request per accepted photo rather than one per candidate.
 */
async function entityKindLabels(entity) {
  const ids = (entity.claims?.P31 ?? [])
    .map((c) => c.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
  if (ids.length === 0) return [];
  await sleep(REQUEST_GAP_MS);
  const data = await getJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${ids.join(
      "%7C"
    )}&props=labels&languages=en&format=json`
  );
  return ids.map((id) => data.entities?.[id]?.labels?.en?.value).filter(Boolean);
}

/**
 * Finds the Wikidata entity for a place by looking at what is actually there,
 * then confirming it is the right thing.
 *
 * Searching by name first was tried and failed badly: 47 of the first 59
 * places returned "no entity", because our catalogue names them the way a
 * traveller would ("Sunday Walking Street (Tha Phae)") and Wikidata labels
 * them the way a cataloguer would. Geosearch does not care what we call a
 * place, so it finds the candidates; the name check then decides which — if
 * any — of those candidates is the place rather than its neighbour.
 */
async function findEntity(place, claimedEntities) {
  const near = await getJson(
    `https://www.wikidata.org/w/api.php?action=query&list=geosearch&gscoord=${place.lat}%7C${place.lng}` +
      `&gsradius=${MAX_DISTANCE_M}&gslimit=12&format=json`
  );
  const candidates = near.query?.geosearch ?? [];
  if (candidates.length === 0) return { rejected: "nothing mapped within range" };

  let sawNamedMismatch = false;
  for (const candidate of candidates) {
    await sleep(REQUEST_GAP_MS);
    const data = await getJson(
      `https://www.wikidata.org/wiki/Special:EntityData/${candidate.title}.json`
    );
    const entity = data.entities?.[candidate.title];
    if (!entity) continue;

    // One entity, one place. Chiang Mai City Arts & Cultural Centre and the
    // Historical Centre share a compound and both matched the same Wikidata
    // item, which would have put one photograph on two pages — the same
    // failure as the street-food photo that previously illustrated four
    // different markets. Whichever place reaches an entity first keeps it.
    if (claimedEntities.has(candidate.title)) {
      sawNamedMismatch = true;
      continue;
    }

    const labels = [entity.labels?.en?.value, entity.labels?.th?.value].filter(Boolean);
    const matches = labels.some(
      (label) =>
        namesLookLikeTheSamePlace(place.name, label) ||
        namesLookLikeTheSamePlace(place.nameTh ?? "", label)
    );
    if (!matches) {
      sawNamedMismatch = true;
      continue;
    }

    // Third gate: is it the same *kind* of thing? Names cannot tell Wat Tha Ton
    // from the town of Tha Ton, and proximity cannot tell Chiang Dao Cave from
    // the temple built at its mouth. Wikidata's own P31 can.
    const kinds = await entityKindLabels(entity);
    if (!kindIsConsistent(place.name, kinds)) {
      sawNamedMismatch = true;
      continue;
    }

    const coord = entity.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
    const distance = coord
      ? metresBetween(place.lat, place.lng, coord.latitude, coord.longitude)
      : candidate.dist;

    const image = entity.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
    if (!image) return { rejected: `${candidate.title} matches but has no photo` };
    return { id: candidate.title, image, distance, label: labels[0] };
  }
  return {
    rejected: sawNamedMismatch
      ? `${candidates.length} entities nearby, none is this place`
      : "no usable entity nearby",
  };
}

async function fileDetails(fileName) {
  const data = await getJson(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(
      "File:" + fileName
    )}&prop=imageinfo&iiprop=url%7Cextmetadata%7Cuser&iiurlwidth=1600&format=json`
  );
  const page = Object.values(data.query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const strip = (v) => (v?.value ?? "").replace(/<[^>]+>/g, "").trim();
  return {
    downloadUrl: info.thumburl ?? info.url,
    licence: strip(meta.LicenseShortName) || "unknown",
    // Kept raw as well: the licence is satisfied by the link to the file page,
    // but if a credit ever looks wrong the untrimmed text is here to check.
    // Some files carry no Artist field at all — Doi Inthanon's did not. CC BY-SA
    // still requires attribution, and Commons practice is to name the uploader,
    // so fall back to that rather than publishing a photo credited to "unknown".
    artistRaw: strip(meta.Artist) || info.user || "unknown",
    artist: cleanArtist(strip(meta.Artist) || info.user),
    descriptionUrl: info.descriptionurl,
  };
}

async function main() {
  const dry = process.argv.includes("--dry");
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

  const places = (await readPlaces()).filter((p) =>
    only ? only.has(p.slug) : PHOTOGRAPHABLE_CATEGORIES.has(p.category)
  );

  const accepted = [];
  const rejected = [];
  const claimedEntities = new Set();

  for (const [i, place] of places.entries()) {
    process.stdout.write(`[${i + 1}/${places.length}] ${place.slug} ... `);
    try {
      const match = await findEntity(place, claimedEntities);
      if (match.rejected) {
        console.log(`skipped (${match.rejected})`);
        rejected.push({ slug: place.slug, reason: match.rejected });
      } else {
        await sleep(REQUEST_GAP_MS);
        const details = await fileDetails(match.image);
        if (!details) {
          console.log("skipped (file details unavailable)");
          rejected.push({ slug: place.slug, reason: "file details unavailable" });
        } else {
          console.log(`match ${match.id} at ${Math.round(match.distance)}m - ${details.licence}`);
          claimedEntities.add(match.id);
          accepted.push({
            slug: place.slug,
            entity: match.id,
            distanceM: Math.round(match.distance),
            ...details,
          });
          if (!dry) {
            const res = await fetch(details.downloadUrl, { headers: { "User-Agent": UA } });
            if (res.ok) {
              const dest = path.join(ROOT, "public", "images", "places", `${place.slug}.jpg`);
              await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
            } else {
              console.log(`   download failed (${res.status})`);
            }
          }
        }
      }
    } catch (err) {
      console.log(`error (${err.message})`);
      rejected.push({ slug: place.slug, reason: err.message });
    }
    await sleep(REQUEST_GAP_MS);
  }

  console.log(`\naccepted ${accepted.length}, skipped ${rejected.length}`);
  if (dry) {
    console.log("(dry run - nothing written)");
    return;
  }

  await fs.writeFile(
    path.join(ROOT, "scripts", "commons-results.json"),
    JSON.stringify({ accepted, rejected }, null, 2) + "\n"
  );
  console.log("wrote scripts/commons-results.json");
}

main();
