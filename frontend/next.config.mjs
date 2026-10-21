const isProd = process.env.NODE_ENV === "production";

// Where /api/* and /ws/* are proxied to. Next serializes rewrites() and headers() into the
// routes manifest at BUILD time, so for a standalone/docker build this must be provided at
// build time (ARG) as well as at runtime (ENV). Default targets a local backend.
const BACKEND_URL = (process.env.BACKEND_URL || "http://127.0.0.1:8090").replace(/\/+$/, "");
try {
  if (!/^https?:$/.test(new URL(BACKEND_URL).protocol)) throw new Error("bad scheme");
} catch {
  throw new Error(`BACKEND_URL must be an absolute http(s) URL, got "${BACKEND_URL}"`);
}

// Optional dedicated WebSocket origin (NEXT_PUBLIC_WS_URL). 'self' already covers ws(s) on the
// page's own host, so this is only needed when the socket lives somewhere else.
function wsOrigin() {
  const raw = process.env.NEXT_PUBLIC_WS_URL;
  if (!raw) return "";
  try {
    const u = new URL(raw);
    return u.protocol === "ws:" || u.protocol === "wss:" ? `${u.protocol}//${u.host}` : "";
  } catch {
    return "";
  }
}

// Set CSP_UPGRADE_INSECURE=0 to omit upgrade-insecure-requests, e.g. for a plain-http demo
// that is opened in Safari (it also upgrades http://localhost sub-resources and breaks the page).
const upgradeInsecure = isProd && process.env.CSP_UPGRADE_INSECURE !== "0";

// Why script-src keeps 'unsafe-inline': pages are statically prerendered, and Next streams
// inline flight/bootstrap <script> tags into the HTML. A per-request nonce needs middleware,
// which forces every page into dynamic rendering. The inline surface is small (Next's own
// bootstrap plus the no-flash theme script) and there is no user-controlled HTML sink, so the
// remaining directives (default-src/object-src/base-uri/form-action/frame-ancestors) do the
// heavy lifting. Upgrade path: nonce + 'strict-dynamic' via middleware (accepting dynamic
// rendering), or hash-based sources once the inline scripts are pinned; then drop 'unsafe-inline'.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`, // dev: React Refresh needs eval
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${wsOrigin() ? ` ${wsOrigin()}` : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  ...(upgradeInsecure ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  poweredByHeader: false,

  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/ws/:path*", destination: `${BACKEND_URL}/ws/:path*` },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Keep last: the service worker script must always be revalidated so updates ship.
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
