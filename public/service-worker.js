// public/service-worker.js
// RockFit SW: always update on new deploys; no user cache hassles.

const VERSION = new URL(self.location).searchParams.get("v") || "dev";
const CACHE_NAME = `rockfit-${VERSION}`;

// Immediately control existing pages
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Claim control
      await self.clients.claim();
      // Delete old caches
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("rockfit-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
    })()
  );
});

// Strategy:
// - HTML/JS/CSS/JSON: network first (fresh on each deploy), fallback to cache.
// - Icons/manifest/images: cache first (they rarely change).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // Decide strategy by path/extension
  const isStaticAsset =
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.includes("/icons/");

  if (!sameOrigin) return; // ignore cross-origin

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);

      // --- Cache-first for icons/manifest/images
      if (isStaticAsset) {
        const cached = await cache.match(req);
        if (cached) return cached;
        try {
          const net = await fetch(req);
          if (net.ok) cache.put(req, net.clone());
          return net;
        } catch {
          return cached || Response.error();
        }
      }

      // --- Network-first for app files (HTML/JS/CSS/JSON)
      try {
        const net = await fetch(req, { cache: "no-store" });
        // Only cache successful GETs
        if (net.ok) cache.put(req, net.clone());
        return net;
      } catch {
        const cached = await cache.match(req);
        return cached || Response.error();
      }
    })()
  );
});
