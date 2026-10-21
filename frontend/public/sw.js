/*
 * Service worker: offline shell only. Bump VERSION whenever this file's strategy or the precache
 * list changes; `activate` deletes every cache that does not belong to the current version.
 *
 * Safety rules:
 *  - never touch /api/, /ws/ or any request carrying an Authorization header
 *  - only store same-origin, non-redirected, 200, "basic" responses that do not say no-store
 *  - HTML is network-first (fresh deploys win), hashed build assets are cache-first
 */
const VERSION = "ph-v3";
const SHELL_CACHE = `${VERSION}-shell`;
const RUNTIME_CACHE = `${VERSION}-runtime`;
const RUNTIME_MAX = 150;
const SHELL_URLS = ["/", "/dashboard", "/manifest.webmanifest", "/icon.svg"];

// Content-hashed build output and font files never change under the same URL.
// (Dev-server chunks have no hash, so they fall through to the network.)
const HASHED_STATIC = /^\/_next\/static\/.+[-./][0-9a-f]{8,}(?:-s)?(?:\.p)?\.(?:js|css|woff2?)$/i;
const FONT_FILE = /\.(?:woff2?|ttf|otf)$/i;
const SMALL_ASSET = /\.(?:svg|png|ico|webmanifest)$/i;

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL_URLS.map((u) => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  const keep = new Set([SHELL_CACHE, RUNTIME_CACHE]);
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheable(res) {
  return (
    res &&
    res.ok &&
    res.status === 200 &&
    res.type === "basic" &&
    !res.redirected &&
    !/no-store/i.test(res.headers.get("Cache-Control") || "")
  );
}

// Keep only the newest `max` entries (Cache keys come back in insertion order).
async function trim(cache, max) {
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

async function store(request, response) {
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response);
  await trim(cache, RUNTIME_MAX);
}

// Fresher runtime copies win over the install-time shell, so offline HTML matches the chunks
// the runtime cache still holds.
async function match(request) {
  const runtime = await caches.open(RUNTIME_CACHE);
  return (await runtime.match(request, { ignoreVary: true })) || caches.match(request, { ignoreVary: true });
}

async function networkFirst(e, fallbackUrl) {
  try {
    const res = await fetch(e.request);
    if (cacheable(res)) e.waitUntil(store(e.request, res.clone()).catch(() => {}));
    return res;
  } catch {
    return (
      (await match(e.request)) ||
      (fallbackUrl && (await match(fallbackUrl))) ||
      Response.error()
    );
  }
}

async function cacheFirst(e) {
  const hit = await match(e.request);
  if (hit) return hit;
  const res = await fetch(e.request);
  if (cacheable(res)) e.waitUntil(store(e.request, res.clone()).catch(() => {}));
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || req.headers.has("Authorization")) return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const p = url.pathname;
  if (p.startsWith("/api/") || p.startsWith("/ws/") || p === "/sw.js") return;

  if (req.mode === "navigate") {
    e.respondWith(networkFirst(e, "/"));
  } else if (HASHED_STATIC.test(p) || FONT_FILE.test(p)) {
    e.respondWith(cacheFirst(e));
  } else if (SMALL_ASSET.test(p) && !p.startsWith("/_next/")) {
    e.respondWith(networkFirst(e));
  }
  // Anything else (RSC payloads, dev chunks, unknown paths) goes straight to the network.
});
