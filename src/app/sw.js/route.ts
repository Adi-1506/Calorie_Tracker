// The service worker (spec: PWA with offline logging; security item 39).
// Served from a route so each deploy gets a new cache version.
//
// What it caches: hashed build files (/_next/static), icons, and the /offline
// page with the files it needs. Nothing else. Pages under /app, /api, auth
// routes and data requests always go to the network and are never stored,
// so no personal data ends up in the cache. When a page can't load offline,
// the cached /offline logger is shown instead.

const VERSION = (process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_BUILD_ID ?? "dev").slice(0, 12);

const source = `
const VERSION = ${JSON.stringify(VERSION)};
const STATIC = "kalo-static-" + VERSION;
const PAGES = "kalo-pages-" + VERSION;
const OFFLINE_URL = "/offline";
const PRECACHE = ["/icons/icon-192.png", "/icons/icon-512.png", "/icon.svg"];

async function cacheOfflinePage() {
  const res = await fetch(OFFLINE_URL, { cache: "no-store", credentials: "omit" });
  if (!res.ok) throw new Error("offline page unavailable");
  const html = await res.clone().text();
  // Script tags, stylesheets and fonts, plus the client chunks named only inside the inline RSC payload.
  const assets = [...new Set([...html.matchAll(/static\\/(?:chunks|css|media)\\/[\\w.~\\/-]+?\\.(?:js|css|woff2)/g)].map((m) => "/_next/" + m[0]))];
  const pages = await caches.open(PAGES);
  await pages.put(OFFLINE_URL, res);
  const statics = await caches.open(STATIC);
  await statics.addAll([...PRECACHE, ...assets]);
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheOfflinePage().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("kalo-") && k !== STATIC && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "clear") event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))));
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Hashed build files and icons never change: cache first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.open(STATIC).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      }),
    );
    return;
  }

  // Page loads: always the network (never cached); the offline logger if that fails.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => {
        const offline = await caches.match(OFFLINE_URL, { cacheName: PAGES });
        if (!offline) return Response.error();
        // Redirect rather than serve it in place: the app only hydrates when the URL matches the page.
        return url.pathname === OFFLINE_URL ? offline : Response.redirect(OFFLINE_URL, 302);
      }),
    );
  }
  // Everything else (data requests, /api, images) goes straight to the network.
});
`;

export function GET() {
  return new Response(source, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
