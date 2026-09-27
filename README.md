# پارک هوشمند · ParkHooshmand

Smart curbside-parking platform for Iranian cities, built on the **SFpark** model
(real-time availability → demand-responsive pricing → open data).
Bilingual **fa/en** with full RTL, light/dark themes, responsive down to 360px, PWA-ready.

```
backend/    FastAPI — sensors, occupancy simulation, pricing engine, open API + WebSocket
frontend/   Next.js 15 (App Router, React 19, Tailwind v4) — landing, live map, city dashboard
docker-compose.yml
```

## Run with Docker

```bash
cp .env.example .env          # optional
docker compose up --build -d
```

| Service | URL |
| --- | --- |
| Web app | http://localhost:3200 |
| City dashboard | http://localhost:3200/dashboard |
| API | http://localhost:8090/api/zones |
| API docs (OpenAPI) | http://localhost:8090/docs |

> If the browser is not on the same machine as the API, set `NEXT_PUBLIC_API_URL`
> to a browser-reachable address **before** building — it is baked into the frontend bundle.

## Run without Docker

```bash
# backend
cd backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/uvicorn app.main:app --port 8090 --reload

# frontend
cd frontend && npm install && npm run dev      # http://localhost:3200
```

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

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | liveness |
| GET | `/api/zones` | list zones (`q`, `kind`, `available`, `sort`) |
| GET | `/api/zones/{id}` | occupancy history, 8h forecast, rate changes |
| GET | `/api/stats/overview` | city KPIs + 24h curve |
| GET | `/api/events` | special-event pricing windows |
| GET | `/api/pricing/policy` | the pricing rule, in fa/en |
| POST | `/api/sessions` | start a parking session (`zone_id`, `plate`, `minutes`) |
| POST | `/api/sessions/{id}/stop` | end a session |
| GET/POST | `/api/wallet`, `/api/wallet/topup` | wallet |
| GET | `/api/open-data/zones.geojson` | open GeoJSON feed |
| WS | `/ws/live` | one frame every 5 seconds |

Data is an in-memory simulation seeded with 16 Tehran zones (~8,700 spaces); swap
`engine.py` for real sensor feeds and a database when the pilot goes live.

## Design system

- Tokens in `frontend/app/globals.css`: one palette, redefined under `html.dark`.
- Glass surfaces, aurora backdrop, 24px radii, spring easing `cubic-bezier(.2,.8,.2,1)`.
- Typography: Vazirmatn (fa) / Inter (en); Persian digits and separators via `lib/i18n.ts`.
- `prefers-reduced-motion` disables every animation.
- Persian wording follows the UX-writing vocabulary reference
  (پیش‌خوان، کیف پول، جست‌وجو، نشانی، مبلغ، تایید …).

## PWA / mobile

`manifest.webmanifest` + `sw.js` (app-shell cache, API calls never cached) ship already,
so the site installs from the browser. Next steps for store builds:

```bash
npx @capacitor/cli init          # wrap the built site
npx cap add android && npx cap add ios
npx cap sync && npx cap open android   # → APK (Android Studio)
npx cap open ios                        # → IPA (Xcode, needs macOS)
```
