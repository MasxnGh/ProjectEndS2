#!/usr/bin/env node
/**
 * Serves the Phase 2 direction sketches.
 *
 * The sketches draw the app's real map and photographs, so they need to share
 * an origin with its API. The app's own proxy redirects any path without a
 * locale, which rules out dropping them in public/, so this serves the folder
 * itself and forwards /api, /images and /_next to the running dev server.
 *
 * Usage: node docs/redesign/phase-2/serve.mjs   (dev server must be on :3000)
 * Then open http://localhost:4173
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP = process.env.APP_URL || "http://localhost:3000";
const PORT = Number(process.env.PORT || 4173);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml" };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    if (/^\/(api|images|_next)\//.test(url.pathname)) {
      try {
        const upstream = await fetch(APP + url.pathname + url.search, { headers: { accept: req.headers.accept || "*/*" } });
        const body = Buffer.from(await upstream.arrayBuffer());
        res.writeHead(upstream.status, { "content-type": upstream.headers.get("content-type") || "application/octet-stream", "cache-control": "max-age=3600" });
        // The style document points at the app's own origin; keep tiles and glyphs on this one.
        res.end(url.pathname === "/api/map/style" ? body.toString("utf8").replaceAll(APP, `http://localhost:${PORT}`) : body);
      } catch (err) {
        res.writeHead(502).end(`upstream unavailable: ${err.message}`);
      }
      return;
    }
    // MapLibre comes from the app's own install, so the sketches match its version and need no CDN.
    const VENDOR = { "/vendor/maplibre-gl.js": "maplibre-gl.js", "/vendor/maplibre-gl.css": "maplibre-gl.css" };
    const vendor = VENDOR[url.pathname];
    let file = vendor
      ? path.join(ROOT, "..", "..", "..", "chiangmai-app", "node_modules", "maplibre-gl", "dist", vendor)
      : path.join(ROOT, decodeURIComponent(url.pathname));
    if (!vendor && !file.startsWith(ROOT)) return res.writeHead(403).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    if (!fs.existsSync(file)) return res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(file).pipe(res);
  })
  .listen(PORT, () => console.log(`sketches on http://localhost:${PORT}`));
