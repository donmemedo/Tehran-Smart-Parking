# پارک هوشمند · ParkHooshmand

Smart curbside-parking platform for Iranian cities, built on the **SFpark** model
(real-time availability → demand-responsive pricing → open data).
Bilingual **fa/en** with full RTL, light/dark themes, responsive down to 360px, PWA-ready.

```
backend/    FastAPI — sensors, occupancy simulation, pricing engine, open API + WebSocket
frontend/   Next.js 15 (App Router, React 19, Tailwind v4) — landing, live map, city dashboard
proxy/      Caddy — single public entry point, sets the real client address
docs/       attack tree and design notes
docker-compose.yml
```

Security, performance and UX hardening is documented in [`LAST_Report.md`](LAST_Report.md)
and [`docs/ATTACK_TREE.md`](docs/ATTACK_TREE.md).

## Run with Docker

```bash
cp .env.example .env          # optional
docker compose up --build -d
```

| Service | URL |
| --- | --- |
| Web app | http://127.0.0.1:3200 |
| City dashboard | http://127.0.0.1:3200/dashboard |
| API (same origin) | http://127.0.0.1:3200/api/zones |

Only the proxy is published, and only on loopback. The backend and frontend sit on a private
network. The API docs are not reachable through the proxy; to read `/docs`, uncomment the
loopback `ports` line on the backend service in `docker-compose.yml`.

For anything beyond local use, put TLS in front: give Caddy a domain name in `proxy/Caddyfile`, or
run another TLS proxy in front of it and trust only that proxy with `trusted_proxies`. Then set
`CSP_UPGRADE_INSECURE=1` and `PH_ALLOWED_ORIGINS` to your https origin and rebuild.

If `10.89.28.0/24` clashes with a network you already have, set `PH_SUBNET` and `PH_PROXY_IP`
(see `.env.example`).

## Run without Docker

```bash
# backend
cd backend && python3 -m venv .venv && .venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m uvicorn app.main:app --port 8090 --reload

# frontend (proxies /api and /ws to BACKEND_URL)
cd frontend && npm ci && BACKEND_URL=http://127.0.0.1:8090 npm run dev      # http://localhost:3200
```

## Test and scan

```bash
cd backend && python -m pip install -r requirements-dev.txt
python -m pytest -q                              # 27 security regression tests
python -m bandit -r app -q                       # static analysis
python -m pip_audit -r requirements.txt          # known vulnerabilities
cd ../frontend && npx tsc --noEmit && npm run build && npm audit
```

CI (`.github/workflows/ci.yml`) runs the same checks plus a secret scan and an image scan on every
pull request and weekly.

## What the product does

| Capability | Where |
| --- | --- |
| Live availability per zone, refreshed every 5s over WebSocket | `/` live map + zone cards |
| Demand-responsive pricing (target 70–85% occupancy, ±1,000 T steps) | `engine.Zone.reprice` |
| Special-event pricing (derby, theatre, street market) | `/api/events` |
| Parking session + wallet payment | zone drawer → «پرداخت از کیف پول» |
| City operations view: KPIs, daily occupancy curve, sensor health | `/dashboard` |
| Open data: JSON + GeoJSON + live socket | `/api/open-data/zones.geojson`, `/ws/live` |

## API

Money and session endpoints need `Authorization: Bearer <token>`. Get a token for the device with
`POST /api/identity`. Every other endpoint is public.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET | `/api/zones` | list zones (`q`, `kind`, `available`, `sort`) |
| GET | `/api/zones/{id}` | occupancy history, 8h forecast, rate changes |
| GET | `/api/stats/overview` | city KPIs + 24h curve |
| GET | `/api/events` | special-event pricing windows |
| GET | `/api/pricing/policy` | the pricing rule, in fa/en |
| POST | `/api/identity` | create an anonymous device account, returns a token |
| GET | `/api/wallet` | balance (token) |
| POST | `/api/wallet/topup` | demo top-up, disabled unless `PH_DEMO_TOPUP=1` (token) |
| GET | `/api/sessions` | your sessions (token) |
| POST | `/api/sessions` | start a session: `zone_id`, `plate`, `minutes` (token) |
| POST | `/api/sessions/{id}/stop` | end a session and refund unused time (token) |
| GET | `/api/open-data/zones.geojson` | open GeoJSON feed, readable from any site |
| WS | `/ws/live` | one frame every 5 seconds, server push only |

Limits: 240 requests per minute per client by default (`PH_RATE_LIMIT_PER_MIN`), 4 KiB request
bodies, 3 active sessions per account, 8 live sockets per client. Over a limit the API answers
`429` with `Retry-After`.

Data is an in-memory simulation seeded with 16 Tehran zones (~8,700 spaces); swap
`engine.py` for real sensor feeds and a database when the pilot goes live.

## Design system

- Tokens in `frontend/app/globals.css`: one palette, redefined under `html.dark`.
- Glass surfaces, aurora backdrop, 24px radii, spring easing `cubic-bezier(.2,.8,.2,1)`.
- Typography: Vazirmatn (fa) / Inter (en), self-hosted; Persian digits and separators via `lib/i18n.ts`.
- `prefers-reduced-motion`, `prefers-reduced-transparency` and `prefers-contrast: more` are honoured.
- Persian wording follows the UX-writing vocabulary reference
  (پیش‌خوان، کیف پول، جستجو، نشانی، مبلغ، تایید …).

## PWA / mobile

`manifest.webmanifest` + `sw.js` (versioned offline shell; API calls and authenticated requests are never cached) ship already,
so the site installs from the browser. Next steps for store builds:

```bash
npx @capacitor/cli init          # wrap the built site
npx cap add android && npx cap add ios
npx cap sync && npx cap open android   # → APK (Android Studio)
npx cap open ios                        # → IPA (Xcode, needs macOS)
```
