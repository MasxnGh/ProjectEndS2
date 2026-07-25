const CACHE_NAME = "doi-delta-shell-v1";

const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Offline — Doi &amp; Delta</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f7f4ef; color: #1a1a17; display: flex; min-height: 100vh; align-items: center; justify-content: center; margin: 0; padding: 24px; text-align: center; }
  @media (prefers-color-scheme: dark) { body { background: #171613; color: #f3efe4; } }
  h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
  p { color: inherit; opacity: 0.75; max-width: 32em; margin: 0.25rem auto; }
</style>
</head>
<body>
  <div>
    <h1>You're offline — คุณออฟไลน์อยู่</h1>
    <p>This page hasn't been saved for offline use yet. Your saved trip plan is still on this device — try the Trip Planner once you're back online, or reopen a page you've already visited.</p>
    <p>หน้านี้ยังไม่ได้บันทึกไว้สำหรับใช้งานออฟไลน์ แผนทริปที่บันทึกไว้ยังอยู่ในเครื่องของคุณ ลองใหม่อีกครั้งเมื่อออนไลน์</p>
  </div>
</body>
</html>`;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Never cache API responses — weather, air quality, and routing data must
  // always be live-or-nothing, never silently served stale.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(
          () =>
            caches.match(request).then(
              (cached) =>
                cached ||
                new Response(OFFLINE_HTML, { headers: { "Content-Type": "text/html; charset=utf-8" } })
            )
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
