#!/usr/bin/env node
/**
 * Serves the Phase 1 design prototypes.
 *
 * Photographs come straight from the app's public folder. The map needs the
 * app's own style and tile proxy, so /api is forwarded to a running dev server
 * (default :3100, the tracked launch config). Without it every page still
 * renders; only the map panels stay empty.
 *
 * Usage: node docs/rebuild/phase-1-design/serve.mjs   then open http://localhost:4174
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.join(ROOT, "..", "..", "..", "chiangmai-app");
const APP = process.env.APP_URL || "http://localhost:3100";
const PORT = Number(process.env.PORT || 4174);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function send(res, file) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end("not found");
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] || "application/octet-stream", "cache-control": "no-store" });
  fs.createReadStream(file).pipe(res);
}

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const p = decodeURIComponent(url.pathname);

    if (p.startsWith("/images/")) {
      const file = path.join(APP_DIR, "public", p);
      if (!file.startsWith(path.join(APP_DIR, "public"))) return res.writeHead(403).end();
      return send(res, file);
    }
    if (p === "/brand-board.webp") return send(res, path.join(ROOT, "..", "..", "redesign", "reference", "brand-board.webp"));
    if (p === "/vendor/maplibre-gl.js" || p === "/vendor/maplibre-gl.css") {
      return send(res, path.join(APP_DIR, "node_modules", "maplibre-gl", "dist", path.basename(p)));
    }
    if (/^\/(api|_next)\//.test(p)) {
      try {
        const upstream = await fetch(APP + url.pathname + url.search, { headers: { accept: req.headers.accept || "*/*" } });
        const body = Buffer.from(await upstream.arrayBuffer());
        res.writeHead(upstream.status, {
          "content-type": upstream.headers.get("content-type") || "application/octet-stream",
          "cache-control": "max-age=3600",
        });
        // The style points tiles and glyphs at the app's origin; keep them on this one.
        res.end(p === "/api/map/style" ? body.toString("utf8").replaceAll(APP, `http://localhost:${PORT}`) : body);
      } catch (err) {
        res.writeHead(502).end(`app not reachable at ${APP}: ${err.message}`);
      }
      return;
    }

    const file = path.join(ROOT, p === "/" ? "index.html" : p);
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    send(res, file);
  })
  .listen(PORT, () => console.log(`Phase 1 design on http://localhost:${PORT}`));
