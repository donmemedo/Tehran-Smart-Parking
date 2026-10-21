> **Status update (2026-10-16):** the backend plan in this file is implemented and tested. See `LAST_Report.md` for the current state, what remains, and the before/after evidence. The findings below are kept as the original audit record.

# Session handoff: security, performance and UI/UX hardening

Project: **ParkHooshmand / Tehran Smart Parking** (FastAPI backend + Next.js 15 frontend).
Written 2026-10-02 so another model can continue without re-doing the discovery work.

---

## 1. The original request

> Use red team agents and blue team agents and security skills to audit and solve all problems,
> and do a pen test for this project. Also add performance to all security things.
> For UI/UX use `/apple-design`. Use as many tokens as needed, but try to finish everything under 5 hours.

The user also enabled "ultracode", which means: orchestrate the work with multi-agent workflows
(parallel finders, adversarial verification, then fixes), not a single pass.

Persian UI copy must follow the user's vocabulary guide at `~/references/persian-ux-vocab/README.md`.

---

## 2. Where things stand

| Phase | Status |
| --- | --- |
| 0. Scouting: read every backend file, app shell, lib, PWA files, Header, ZoneSheet | Done |
| 0. Automated scans: `npm audit`, `pip-audit`, `bandit` | Done, results in section 5 |
| 0. Load the apple-design skill guidance | Done, applied in section 6.4 |
| 1. Red team: deep audit and live pentest against a running instance | **Not started** |
| 2. Blue team: fixes, hardening, tests | **Not started** |
| 3. Performance work on the security layers | **Not started** |
| 4. Apple-design UI/UX pass | **Not started** |
| 5. Re-test, regression check, final report | **Not started** |

**No project source file has been changed. Nothing has been committed.** The only new file is this one.

Earlier attempts in this session were interrupted before the multi-agent workflow launched,
so every finding below comes from manual review plus the scanners. None has been verified
against a running instance yet.

---

## 3. Environment notes (read these first)

- **Memory is very tight.** The machine has 16 GB and usually only about 1 GB is available, because many
  other Claude sessions are running. One background scan was killed for low memory. Run heavy jobs
  (builds, load tests) one at a time, and prefer short-lived commands.
- **Ports 8000 and 3000 belong to a different project** (`~/Projects/Mine/Iran-Glass-Check`). Do not stop
  or test against them.
- **A baseline backend from this session is still running** on `127.0.0.1:8090` (pid 493242 at the time of
  writing). It is the unmodified code, useful as the "before" target. Stop it when you no longer need it:
  ```bash
  pkill -f "uvicorn app.main:app --host 127.0.0.1 --port 8090"
  ```
- **The backend virtualenv was copied from another path.** `backend/.venv/pyvenv.cfg` points to
  `~/Documents/Darvag/Projects/22_SFpark/backend/.venv`, so the `pip` shim is broken. Always call
  `.venv/bin/python -m pip ...` and `.venv/bin/python -m uvicorn ...`. Recreating the venv is also fine.
- Installed into `backend/.venv` this session: `bandit`, `pip-audit`, `pytest`, `pytest-asyncio`, `httpx`,
  `websockets`.
- Not installed on the machine: nmap, nikto, sqlmap, ffuf, ZAP, nuclei, semgrep, trivy, gitleaks, k6, wrk,
  hey, lighthouse, playwright. Network access to PyPI and npm works, so Python-based tools
  (for example `locust`, `semgrep`) can be added to the venv if needed.
- Docker is installed but no containers are running.
- `graphify-out/` does not exist, so the graphify rules in `~/CLAUDE.md` do not apply until a graph is built.
- Git state at start: `main.py` at the repo root shows as `AD` (added to the index, then deleted on disk),
  and `skills-lock.json` is untracked. Both predate this session. Ask the user before touching them.
- `Docs/` and `.idea/` are git-ignored. `Docs/` holds the business-plan PDFs that motivate the product.

---

## 4. Project map

```
backend/app/main.py      189 lines  FastAPI routes, CORS, WebSocket broadcaster
backend/app/engine.py    305 lines  in-memory simulation: zones, pricing, sessions, wallet
backend/app/data.py       61 lines  seed data: 16 Tehran zones, 3 events, pricing policy
backend/Dockerfile                  python:3.12-slim, runs as root
backend/requirements.txt            fastapi 0.115.6, uvicorn 0.34.0, pydantic 2.10.4

frontend/app/layout.tsx             root layout, inline no-flash theme script, SW registration
frontend/app/page.tsx               landing page (all "use client")
frontend/app/dashboard/page.tsx     city dashboard
frontend/app/globals.css  168 lines design tokens, glass, aurora, motion
frontend/lib/api.ts                 API base URL, types, fetch helpers
frontend/lib/app.tsx                single React context: prefs + live data + WebSocket
frontend/lib/i18n.ts                fa/en dictionary, Persian digit formatting
frontend/components/*.tsx           Header, Hero, LiveMap, Zones, ZoneSheet, Pricing,
                                    OpenData, Dashboard, Charts, Footer
frontend/public/sw.js               service worker (app-shell cache)
frontend/next.config.mjs            standalone output, no headers config
docker-compose.yml                  backend 8090:8000, frontend 3200:3000
```

Stack versions: Next 15.5.4, React 19.1.1, Tailwind 4.1.14, TypeScript 5.7.3, Node 24 locally (22 in Docker).

There is **no authentication, no database, and no test suite**. All state is in process memory.

---

## 5. Automated scan results

### 5.1 npm audit (frontend): 1 critical, 2 high

| Package | Severity | Fix |
| --- | --- | --- |
| `next` 15.5.4 (direct) | Critical. Includes GHSA-9qr9-h5gf-34mp (RCE in the React flight protocol) plus about 35 more advisories: Server Components DoS, request smuggling in rewrites, middleware bypass, image-optimizer DoS, source exposure | Upgrade to **next 15.5.27** (not a major bump) |
| `postcss` (transitive) | High | Fixed by the same Next upgrade |
| `sharp` (transitive) | High | Fixed by the same Next upgrade |

Full JSON: `/tmp/claude-1000/-home-makhataei-Projects-Mine-Tehran-Smart-Parking/9edf099e-1518-421e-bab4-20754df85c9a/scratchpad/npm-audit.json`
(temporary, re-run `npm audit` if it is gone).

### 5.2 pip-audit (backend): 14 advisories, all in starlette 0.41.3

Starlette comes in through FastAPI 0.115.6. Advisories cover multipart form DoS, quadratic Range-header
parsing, unvalidated Host and path headers used to rebuild `request.url`, and form-limit bypass.
The highest fix version listed is **starlette 1.3.1**.

Action: upgrade FastAPI to the newest release whose starlette pin allows 1.3.1 or later, pin both
explicitly, then re-run `pip-audit -r requirements.txt` until it is clean. Check the FastAPI changelog
for breaking changes rather than assuming.

### 5.3 bandit (backend): 4 low

All four are `B311` (non-crypto `random`) in `engine.py`, used only for the occupancy simulation.
They are not security issues. Mark them `# nosec B311` with a short reason.

---

## 6. Manual review findings

Severity is a first estimate. The red team phase should confirm each one live and adjust.

### 6.1 Backend

| ID | Sev | Where | Finding | Fix direction |
| --- | --- | --- | --- | --- |
| B1 | Critical | `backend/app/main.py:157` | Wallet top-up has no payment and no auth. Anyone can add up to 5,000,000 per call, unlimited times. | Remove or gate behind a payment provider callback with signature check. For the demo, keep it behind an admin or demo flag. |
| B2 | Critical | `backend/app/engine.py:182` | One global wallet is shared by every visitor. | Per-user identity (at minimum an anonymous signed device token, ideally real auth) and per-user wallets. |
| B3 | High | `backend/app/main.py:136` | `GET /api/sessions` returns every session with licence plates to anyone. Plates are personal data. | Scope to the caller. Mask plates in any public output. |
| B4 | High | `backend/app/main.py:141` | Anyone can stop anyone's session by ID. IDs are only 8 hex chars, about 32 bits (`engine.py:278`). | Bind sessions to an owner. Use `secrets.token_urlsafe(16)` for IDs. |
| B5 | High | `backend/app/main.py:48` | CORS allows every origin, method and header. Any website can drive state-changing calls from a visitor's browser. | Allow-list the frontend origin(s) from config. Restrict methods and headers. Better: serve the API same-origin through a reverse proxy. |
| B6 | High | whole API + `/ws/live` | No rate limiting anywhere, no connection cap on the WebSocket, no inbound message size limit (`main.py:185`). | Token-bucket limits per IP and per identity (in-memory now, Redis later). Cap WS connections per IP and globally. Set `ws_max_size` small, reject or ignore inbound frames. Check the `Origin` header on WS upgrade. |
| B7 | High | `engine.py:291-292` | Business logic abuse: each fake session adds one to zone occupancy. Mass session creation fills a zone and pushes the demand-responsive price up, which is price manipulation. Combined with B1 it costs nothing. | Fix B1/B2/B6 first. Do not let paid sessions drive the sensor-measured occupancy used for pricing, or cap per-identity active sessions. |
| B8 | Medium | `main.py:130` vs `engine.py:291` | Race between the balance check and the deduction. Sync endpoints run in a thread pool, so concurrent requests can both pass and drive the balance negative. Same for the "zone full" check. Engine globals are mutated from threads and the event loop with no lock. | Do check-and-deduct atomically under one lock (or make endpoints async and keep all mutation on the event loop). Add a concurrency test. |
| B9 | Medium | `engine.py:181` | `SESSIONS` grows without bound. With free top-ups this is a memory DoS. | Expire finished sessions, cap per identity, move to a database later. |
| B10 | Medium | `main.py:17-28` | Broadcaster re-serialises the same JSON for each client and awaits each send in turn, so one slow client stalls everyone. | Serialise once per tick. Send with a per-client timeout (or per-client bounded queue) and drop slow clients. |
| B11 | Low | `main.py:54-56` | `plate` accepts any 2-20 chars, `zone_id` and `q` have no length limit. | Validate plate against a strict charset or Iranian plate pattern. Add `max_length` to `zone_id` and `q`. |
| B12 | Low | `main.py:61` | Health check computes the full overview just to read uptime. | Return uptime directly. |
| B13 | Low | `engine.py:213-217` | Event times are re-parsed from ISO strings on every tick. | Store datetimes, format only on output. |
| B14 | Low | app-wide | No `TrustedHostMiddleware`, no security headers on API responses, `/docs` and `/openapi.json` always public. | Add trusted hosts from config, basic headers (`X-Content-Type-Options`, `Cache-Control` on private data). Decide deliberately whether docs stay public (they fit the open-data story). |
| B15 | Low | `main.py:123` / `ZoneSheet.tsx:33` | Backend floors the cost, frontend rounds it, so the shown amount can differ from the charged amount. Stopping a session never refunds unused time. | One rounding rule shared by both sides. Decide refund policy. |

### 6.2 Frontend, PWA and infrastructure

| ID | Sev | Where | Finding | Fix direction |
| --- | --- | --- | --- | --- |
| F1 | Critical | `frontend/package.json` | Next 15.5.4 is vulnerable (section 5.1). | `next@15.5.27`, rebuild, re-run `npm audit`. |
| F2 | High | `frontend/next.config.mjs` | No security headers: no CSP, no `frame-ancestors` (the pay button can be clickjacked), no HSTS, Referrer-Policy, Permissions-Policy, nosniff. `X-Powered-By` is on. | Add `headers()` and `poweredByHeader: false`. The two inline scripts in `layout.tsx` need a CSP nonce or hash, or move them to static files. |
| F3 | Medium | `frontend/app/layout.tsx:30-33` | Fonts load from Google Fonts at runtime. This is a third-party request, render-blocking, and Google services are often slow or blocked in Iran. | Self-host Vazirmatn and Inter (for example `next/font/local` with files in the repo). This also simplifies the CSP. |
| F4 | Medium | `frontend/public/sw.js` | Caches every GET including error responses and opaque cross-origin ones, cache name never changes so old shells survive deploys, cache grows without bound. The `ws:` check on line 16 does nothing. | Cache only same-origin `res.ok` responses for an explicit allow-list. Version the cache name per build. Network-first for HTML, cache-first for hashed `/_next/static`. |
| F5 | Medium | `frontend/lib/api.ts:2` | API base URL can be overridden by a global `window.__API__`. | Remove the override. |
| F6 | Medium | `docker-compose.yml`, `.env.example` | API URL is `http://` and baked at build time, so production over HTTPS gets mixed-content and `ws://` failures. | Put both services behind one origin (reverse proxy or Next rewrites for `/api` and `/ws`). Then CORS can be locked down and CSP `connect-src 'self'` works. |
| F7 | Medium | `backend/Dockerfile` | Backend container runs as root. Compose publishes on all interfaces, sets no resource limits, no read-only filesystem. Frontend Dockerfile falls back from `npm ci` to `npm install`, which defeats the lockfile. | Non-root user, `read_only`, `cap_drop: [ALL]`, `no-new-privileges`, memory/CPU limits, bind to 127.0.0.1 unless a proxy fronts it, strict `npm ci`. |
| F8 | Low | `frontend/lib/app.tsx:71` | `JSON.parse` of WS frames has no try/catch or shape check. | Guard and validate. |
| F9 | Low | `frontend/components/OpenData.tsx:23` | External link uses `rel="noreferrer"` only. | Fine in modern browsers. Add `noopener` for clarity. |

### 6.3 Performance

| ID | Where | Finding | Fix direction |
| --- | --- | --- | --- |
| P1 | `frontend/lib/app.tsx:82` | One context holds both preferences and live zone data. Every 5-second WebSocket frame re-renders every consumer, including Header and Hero. | Split into a prefs context and a live-data store (`useSyncExternalStore` with selectors). |
| P2 | `frontend/lib/app.tsx:98-99` | `useReveal` has no dependency array, so it builds a new IntersectionObserver and re-observes every `.reveal` element on every render, which is every 5 seconds. | Run once, and unobserve elements after they reveal. |
| P3 | `app/page.tsx`, `app/dashboard/page.tsx` | Whole pages are client components, so there is no server-rendered content and LCP suffers. | Make static sections server components. Keep live widgets as client islands. |
| P4 | `ZoneSheet.tsx:20`, `app.tsx:62` | Polling on top of the WebSocket: zone detail every 8 s, overview every 15 s. | Push overview deltas over the socket, or at least pause polling when the tab is hidden. |
| P5 | backend | Rate limiting, auth and validation will add per-request cost. | Keep limiter state O(1) per key with lazy expiry. Benchmark before and after with a Python load tool (for example `locust` or a small `httpx` async script) and report p50/p95 and requests per second. |

### 6.4 UI/UX against the apple-design guidance

| ID | Where | Finding | Fix direction |
| --- | --- | --- | --- |
| U1 | `ZoneSheet.tsx:51,54` | Sheet opens with a CSS keyframe, so it cannot be interrupted, has no drag-to-dismiss, and has no exit animation. | Spring-driven sheet (critically damped, about 0.3-0.4 s response) with pointer-captured drag, velocity hand-off, momentum projection to snap points, and rubber-banding at the top edge. Exit along the same path it entered. |
| U2 | `ZoneSheet.tsx:54` | Dialog has no focus trap, no initial focus, no focus restore, no `aria-labelledby`. | Add all four. |
| U3 | `ZoneSheet.tsx:39,44` | Empty plate silently becomes `IR-0000`. Unknown errors show the English word "error" even in Persian. No confirmation before spending money. | Inline plate validation, translated errors, a clear review step before payment. |
| U4 | `Header.tsx:68,84,60` | `aria-label="language"`, `aria-label="menu"`, `title="wallet"` are English-only. | Move to the i18n dictionary. |
| U5 | `Header.tsx:35,37` | `transition-all` animates padding (layout). | Animate only `transform`, `opacity`, `box-shadow`. Use a scroll-edge fade instead of a hard border under the sticky header. |
| U6 | `globals.css:79-96` | Full-viewport aurora drifts forever. Apple guidance says avoid large moving backgrounds and slow loops. | Make it static or nearly static. It is also a GPU cost on low-end phones. |
| U7 | `globals.css:161-162` | Reduced motion is handled, but `prefers-reduced-transparency` and `prefers-contrast: more` are not. | Solid surfaces without blur, and stronger borders, under those queries. |
| U8 | `globals.css` | Letter-spacing is not size-specific for display text. | Negative tracking on large headings, near zero on body. Keep Persian at 0. |
| U9 | Persian copy | The vocabulary guide prefers «جستجو». The UI and README use «جست‌وجو». | Align with the guide across `i18n.ts`. Review all other fa strings against it too. |

---

## 7. Recommended plan for the next model

Keep each step small enough to verify. Run one heavy process at a time because of memory.

1. **Baseline.** Start the unmodified backend on 8090 (or reuse the running one). Write a short pentest
   test file that asserts the current insecure behaviour for B1-B8 and B10. These tests should fail
   after the fixes. This is the "before" evidence.
2. **Dependency fixes.** Upgrade Next (F1) and FastAPI/starlette (5.2). Rebuild the frontend once. Re-run
   both audits until clean.
3. **Backend hardening.** Identity and per-user wallet (B1-B4), CORS allow-list (B5), rate limiting and WS
   limits (B6), atomic money and occupancy updates (B7, B8), bounded state (B9), broadcaster rewrite (B10),
   validation (B11), small fixes (B12-B15). Add `pytest` coverage for each.
4. **Frontend and infra hardening.** Headers and CSP (F2), self-hosted fonts (F3), service worker rewrite
   (F4), remove the URL override (F5), same-origin proxy (F6), container hardening (F7), WS parsing (F8).
5. **Performance.** P1-P5, then benchmark the hardened backend against the baseline numbers.
6. **Apple-design pass.** U1-U9. Persian strings must follow the vocabulary guide.
7. **Re-test.** Re-run the pentest tests (they should now pass in the secure direction), both audits,
   bandit, `next build`, and type-check. Write the final report with before/after results.

A good orchestration shape: parallel red-team finders by area (auth and business logic, input and API
surface, WebSocket and DoS, frontend and headers, supply chain and containers), each finding checked by
an independent skeptic before it is fixed. Then one blue-team agent per area applying fixes, then a final
verifier.

---

## 8. Checks to run when done

```bash
# backend
cd backend
.venv/bin/python -m pip_audit -r requirements.txt
.venv/bin/python -m bandit -r app -q
.venv/bin/python -m pytest -q

# frontend
cd ../frontend
npm audit
npx tsc --noEmit
npm run build
```

Also check by hand: response headers on the frontend and API, CORS preflight from a foreign origin is
refused, WS connection cap holds, two concurrent payments cannot overdraw, and the sheet works with
keyboard only, with reduced motion, and in both RTL and LTR.

---

## 9. Prompt to paste into the next model

> Read `SESSION_HANDOFF.md` in the repo root. It holds the original request, the environment constraints,
> scan results and a reviewed list of findings for this project. Continue from section 7, step 1. Verify
> each finding against a running instance before fixing it, keep changes test-backed, do not touch the
> services on ports 8000 and 3000, and do not commit until I ask. Persian copy must follow
> `~/references/persian-ux-vocab/README.md`.
