#!/usr/bin/env node
/**
 * Downloads the hand-verified Commons photographs listed in commons-picks.json.
 *
 * fetch-commons-photos.mjs accepts a photo only when Wikidata attaches it to
 * the place's own entity as its main image (P18). That gate is what keeps a
 * wrong photo out, and it is also why the run stops at 38 places: most of the
 * catalogue either has an entity with no P18, or no entity at all. Commons
 * still holds good photographs of many of those places, but nothing automatic
 * can vouch for them.
 *
 * So these are vouched for by a person instead. Each entry in commons-picks.json
 * names one exact Commons file and says, in `evidence`, why it can be trusted
 * to show the place it will be captioned with. Two routes found the candidates:
 *
 *   - the entity passed all three of the fetcher's gates but carries no P18, so
 *     the file comes from that entity's own Commons category;
 *   - there is no entity, but the file is geotagged within 350 m of our
 *     coordinate and its title names the place.
 *
 * Neither route is trusted on its own. A first pass offered a ferry berth in
 * Laos for a nature trail on Doi Inthanon, and a city gate for the night market
 * beside it. Every file listed was opened and looked at before it went in.
 *
 * The result is merged into commons-results.json, which generate-photo-data.mjs
 * already reads, so credits and the manifest come out of the same place as the
 * automatic ones.
 *
 * Usage: node scripts/fetch-commons-picks.mjs [--dry] [--only=slug,slug]
 * Then:  npm run generate:photos && npm run generate:blur
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanArtist } from "./lib/commons-match.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Matches the width the automatic fetcher's downloads were served at. */
const WIDTH = 1920;

/** Commons is a volunteer service; this is the polite floor between requests. */
const REQUEST_GAP_MS = 1100;

const UA = "ChiangmaiJourney/1.0 (student project; https://github.com/MasxnGh/ProjectEndS2)";

/** Anything else is not ours to publish, whatever the photograph looks like. */
const USABLE_LICENCE = /^(CC BY(-SA)? [1-4]\.\d|CC0|Public domain)/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fileDetails(title) {
  const res = await fetch(
    `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}` +
      `&prop=imageinfo&iiprop=url%7Cextmetadata%7Cuser%7Csize&iiurlwidth=${WIDTH}&format=json`,
    { headers: { "User-Agent": UA, Accept: "application/json" } }
  );
  const text = await res.text();
  if (!text.trimStart().startsWith("{")) {
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 80)}`);
  }
  const page = Object.values(JSON.parse(text).query?.pages ?? {})[0];
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const strip = (v) => (v?.value ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return {
    // A file narrower than WIDTH has no thumbnail at that size; Commons then
    // returns the original, which is what we want.
    downloadUrl: info.thumburl ?? info.url,
    licence: strip(meta.LicenseShortName) || "unknown",
    artistRaw: strip(meta.Artist) || info.user || "unknown",
    artist: cleanArtist(strip(meta.Artist) || info.user),
    descriptionUrl: info.descriptionurl,
  };
}

async function main() {
  const dry = process.argv.includes("--dry");
  const onlyArg = process.argv.find((a) => a.startsWith("--only="));
  const only = onlyArg ? new Set(onlyArg.slice(7).split(",")) : null;

  const picks = JSON.parse(await fs.readFile(path.join(ROOT, "scripts", "commons-picks.json"), "utf8"));
  const resultsPath = path.join(ROOT, "scripts", "commons-results.json");
  const results = JSON.parse(await fs.readFile(resultsPath, "utf8"));

  const done = [];
  const failed = [];

  for (const [i, pick] of picks.entries()) {
    if (only && !only.has(pick.slug)) continue;
    process.stdout.write(`[${i + 1}/${picks.length}] ${pick.slug} ... `);
    try {
      await sleep(REQUEST_GAP_MS);
      const details = await fileDetails(pick.file);
      if (!details) throw new Error("file not found on Commons");
      if (!USABLE_LICENCE.test(details.licence)) {
        throw new Error(`licence "${details.licence}" does not allow reuse`);
      }
      if (!dry) {
        await sleep(REQUEST_GAP_MS);
        const res = await fetch(details.downloadUrl, { headers: { "User-Agent": UA } });
        if (!res.ok) throw new Error(`download failed (${res.status})`);
        const dest = path.join(ROOT, "public", "images", "places", `${pick.slug}.jpg`);
        await fs.writeFile(dest, Buffer.from(await res.arrayBuffer()));
      }
      console.log(`${details.licence} - ${details.artist}`);
      done.push({
        slug: pick.slug,
        ...(pick.entity ? { entity: pick.entity } : {}),
        ...details,
        pick: true,
        evidence: pick.evidence,
      });
    } catch (err) {
      console.log(`skipped (${err.message})`);
      failed.push({ slug: pick.slug, reason: err.message });
    }
  }

  console.log(`\nfetched ${done.length}, skipped ${failed.length}`);
  if (dry) {
    console.log("(dry run - nothing written)");
    return;
  }

  // A pick replaces whatever the automatic run recorded for the same place, and
  // a place that now has a photo is no longer one the automatic run "rejected".
  const picked = new Set(done.map((d) => d.slug));
  results.accepted = [...results.accepted.filter((a) => !picked.has(a.slug)), ...done].sort((a, b) =>
    a.slug.localeCompare(b.slug)
  );
  results.rejected = results.rejected.filter((r) => !picked.has(r.slug));
  await fs.writeFile(resultsPath, JSON.stringify(results, null, 2) + "\n");
  console.log("merged into scripts/commons-results.json");
  if (failed.length > 0) process.exitCode = 1;
}

main();
