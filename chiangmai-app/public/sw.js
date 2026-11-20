// Keeps the pre-rename name on purpose: it is a cache address, not a display
// name, and changing it would make `activate` delete every page a visitor has
// already saved for offline use.
const CACHE_NAME = "doi-delta-shell-v1";

// The page a navigation gets when there is no network and the page was never
// saved. It speaks the language of the URL it stands in for. The palette and
// the mark are copied from src/app/brand.css and src/components/brand/mark.ts,
// which a service worker can't import.
const OFFLINE_COPY = {
  th: {
    title: "ออฟไลน์อยู่ · เชียงใหม่ เจอร์นีย์",
    name: "เชียงใหม่ เจอร์นีย์",
    heading: "ตอนนี้ออฟไลน์อยู่",
    body: "หน้านี้ยังไม่ได้เก็บไว้ในเครื่อง จึงเปิดตอนไม่มีสัญญาณไม่ได้ ส่วนแผนทริปที่ทำไว้ยังอยู่ในเครื่องนี้ครบ ลองเปิดหน้าที่เคยเข้าแล้ว หรือกลับมาใหม่เมื่อมีสัญญาณ",
    retry: "ลองอีกครั้ง",
  },
  en: {
    title: "Offline · Chiangmai Journey",
    name: "Chiangmai Journey",
    heading: "You're offline",
    body: "This page hasn't been saved on this device yet, so it can't open without a connection. Your trip plan is still here. Reopen a page you've visited before, or try again once you're back online.",
    retry: "Try again",
  },
};

function offlineHtml(pathname) {
  const lang = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "th";
  const copy = OFFLINE_COPY[lang];
  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#1d3835" />
<title>${copy.title}</title>
<style>
  :root { --page: #f9f3f0; --text: #17221f; --soft: #4f5a57; --brand: #1d3835; --on-brand: #f9f3f0; color-scheme: light; }
  @media (prefers-color-scheme: dark) {
    :root { --page: #0f1c1a; --text: #f3ece8; --soft: #b9c4c0; --brand: #efd3b1; --on-brand: #142a27; color-scheme: dark; }
  }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; min-height: 100dvh; display: grid; place-items: center; padding: 24px 16px; background: var(--page); color: var(--text); font-family: Prompt, "Noto Sans Thai", "Leelawadee UI", system-ui, sans-serif; line-height: 1.65; text-align: center; -webkit-font-smoothing: antialiased; }
  main { display: grid; justify-items: center; gap: 16px; max-width: 30rem; }
  .brand { display: flex; align-items: center; gap: 10px; color: var(--brand); font-weight: 600; }
  .brand svg { width: 44px; height: auto; }
  h1 { margin: 8px 0 0; font-size: 1.5625rem; line-height: 1.3; font-weight: 600; color: var(--brand); text-wrap: balance; }
  p { margin: 0; color: var(--soft); text-wrap: pretty; }
  button { margin-top: 8px; min-height: 44px; padding: 10px 24px; border: 0; border-radius: 999px; background: var(--brand); color: var(--on-brand); font: inherit; font-weight: 500; cursor: pointer; }
  button:focus-visible { outline: 2px solid var(--brand); outline-offset: 3px; }
</style>
</head>
<body>
  <main>
    <div class="brand">
      <svg viewBox="0 0 64 44" aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
        <path d="M32 2.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" fill="#eb9d56" stroke="none" />
        <path d="M3 41 19 18l7.5 9.5L38 12l23 29" stroke-width="4.2" />
        <path d="M33 19.5 38 25l4-4" stroke-width="3" />
        <path d="M16.48 41 26.5 27.5" stroke-width="4.2" />
      </svg>
      <span>${copy.name}</span>
    </div>
    <h1>${copy.heading}</h1>
    <p>${copy.body}</p>
    <button type="button" onclick="location.reload()">${copy.retry}</button>
  </main>
</body>
</html>`;
}

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
                new Response(offlineHtml(url.pathname), { headers: { "Content-Type": "text/html; charset=utf-8" } })
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
