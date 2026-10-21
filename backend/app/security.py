"""Request guard: per-client rate limits, body-size limits and response security headers.

Written as one plain ASGI middleware (no BaseHTTPMiddleware) so the per-request cost stays
at a dict lookup plus a few float operations.
"""
from __future__ import annotations

import ipaddress
import json
import os
import time


def _env_list(name: str, default: str) -> list[str]:
    return [x.strip() for x in os.getenv(name, default).split(",") if x.strip()]


ALLOWED_ORIGINS = _env_list("PH_ALLOWED_ORIGINS", "http://localhost:3200,http://127.0.0.1:3200")
ALLOWED_HOSTS = _env_list("PH_ALLOWED_HOSTS", "localhost,127.0.0.1,backend")
DEMO_TOPUP = os.getenv("PH_DEMO_TOPUP", "0") == "1"
PUBLIC_DOCS = os.getenv("PH_DOCS", "1") == "1"
RATE_PER_MIN = float(os.getenv("PH_RATE_LIMIT_PER_MIN", "240"))
MAX_BODY = 4096  # every JSON body this API accepts is well under 200 bytes
MAX_WS_TOTAL = int(os.getenv("PH_MAX_WS", "1000"))
MAX_WS_PER_CLIENT = int(os.getenv("PH_MAX_WS_PER_CLIENT", "8"))


class RateLimiter:
    """Token bucket per key: O(1) per hit, lazy refill, bounded memory."""

    def __init__(self, per_min: float, burst: float, max_keys: int = 50_000):
        self.rate = per_min / 60.0
        self.burst = burst
        self.max_keys = max_keys
        self.buckets: dict[str, tuple[float, float]] = {}

    def hit(self, key: str, cost: float = 1.0) -> float:
        """Spend tokens. Returns 0.0 when allowed, else seconds until it would be."""
        now = time.monotonic()
        tokens, last = self.buckets.get(key, (self.burst, now))
        tokens = min(self.burst, tokens + (now - last) * self.rate)
        if tokens >= cost:
            self.buckets[key] = (tokens - cost, now)
            if len(self.buckets) > self.max_keys:
                self._prune(now)
            return 0.0
        self.buckets[key] = (tokens, now)
        return (cost - tokens) / self.rate

    def _prune(self, now: float) -> None:
        # A full bucket carries no state, so dropping it changes nothing.
        full = [k for k, (t, last) in self.buckets.items() if t + (now - last) * self.rate >= self.burst]
        for k in full:
            del self.buckets[k]
        # Still over (many distinct clients at once): drop the oldest half. Halving keeps
        # this O(n) pass rare, so the amortised cost per request stays O(1).
        excess = len(self.buckets) - self.max_keys // 2
        if excess > 0:
            for k in list(self.buckets)[:excess]:
                del self.buckets[k]

    def reset(self) -> None:
        self.buckets.clear()


# One shared budget per client for everything, plus tighter ones for costly actions.
GENERAL = RateLimiter(per_min=RATE_PER_MIN, burst=max(10.0, RATE_PER_MIN / 4))
IDENTITY = RateLimiter(per_min=10, burst=5)  # new anonymous accounts per client
WRITES = RateLimiter(per_min=30, burst=10)  # money-moving actions per account


def client_key(scope: dict) -> str:
    """Client address as a limiter key. IPv6 is grouped by /64, the usual per-host allocation.

    Behind a proxy, run uvicorn with --proxy-headers so scope["client"] is the real client.
    """
    host = (scope.get("client") or ("unknown", 0))[0]
    try:
        ip = ipaddress.ip_address(host)
    except ValueError:
        return host
    if ip.version == 4:
        return str(ip)
    if ip.ipv4_mapped:
        return str(ip.ipv4_mapped)
    return str(ipaddress.ip_network(f"{ip}/64", strict=False))


_JSON_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"referrer-policy", b"no-referrer"),
    (b"x-frame-options", b"DENY"),
    (b"cross-origin-opener-policy", b"same-origin"),
]
_API_ONLY = [
    (b"content-security-policy", b"default-src 'none'; frame-ancestors 'none'"),
    (b"cache-control", b"no-store"),
]
_DOCS_PATHS = ("/docs", "/redoc")  # Swagger UI loads its own assets, so no strict CSP there


async def _reply(send, status: int, detail: str, extra: list[tuple[bytes, bytes]] | None = None):
    body = json.dumps({"detail": detail}).encode()
    headers = [(b"content-type", b"application/json"), (b"content-length", str(len(body)).encode())]
    await send({"type": "http.response.start", "status": status, "headers": headers + _JSON_HEADERS + (extra or [])})
    await send({"type": "http.response.body", "body": body})


class GuardMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        kind = scope["type"]
        if kind == "websocket":
            if GENERAL.hit(client_key(scope)):
                await send({"type": "websocket.close", "code": 1008})
                return
            return await self.app(scope, receive, send)
        if kind != "http":
            return await self.app(scope, receive, send)

        wait = GENERAL.hit(client_key(scope))
        if wait:
            return await _reply(send, 429, "rate limited", [(b"retry-after", str(int(wait) + 1).encode())])

        if scope["method"] in ("POST", "PUT", "PATCH"):
            headers = dict(scope["headers"])
            if b"chunked" in headers.get(b"transfer-encoding", b"").lower():
                return await _reply(send, 411, "content-length required")
            try:
                length = int(headers.get(b"content-length", b"0"))
            except ValueError:
                return await _reply(send, 400, "bad content-length")
            if length > MAX_BODY:
                return await _reply(send, 413, "body too large")

        path = scope["path"]
        extra = list(_JSON_HEADERS)
        if not path.startswith(_DOCS_PATHS):
            extra += _API_ONLY
        if path.startswith("/api/open-data/"):
            # Public open data: any site may read it (no credentials are involved).
            extra.append((b"access-control-allow-origin", b"*"))

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                message["headers"] = list(message.get("headers", [])) + extra
            await send(message)

        await self.app(scope, receive, send_with_headers)
