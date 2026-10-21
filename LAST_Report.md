# LAST_Report: security, performance and UX hardening of ParkHooshmand

Project: ParkHooshmand / Tehran Smart Parking (FastAPI backend, Next.js 15 frontend).
Branch: `security/red-blue-team-hardening`. Last updated 2026-10-22.

## 1. Bottom line

- **Backend is done and tested.** All 15 backend findings are fixed and checked live. 27 security regression tests pass. `pip-audit` and `bandit` report nothing.
- **Dependencies are patched.** Next.js 15.5.4 is now 15.5.28. FastAPI 0.115.6 / Starlette 0.41.3 are now 0.143.1 / 1.8.0.
- **Frontend hardening and the Apple-style UX pass are implemented, type-checked, built and tested end to end against the new backend** (section 5). They were **not tried in a browser**, and the Docker stack was **not run**, so gestures, animation feel and the proxy container are unverified.
- **Not everything you asked for was done.** Section 7 lists what was skipped and why. The main causes are repeated usage limits and an AI-safety interruption of some replies.
- A pull request is open on a new branch. Nothing was merged to `main`.

## 2. How the work went, from the first step

| When | What happened |
| --- | --- |
| 2026-10-02 | A previous session read every backend and frontend file and ran `npm audit`, `pip-audit` and `bandit`. It wrote `SESSION_HANDOFF.md` with 38 findings (B1-B15 backend, F1-F9 frontend and infra, P1-P5 performance, U1-U9 UX). No code was changed. |
| 2026-10-08 | This session started on `main`, created the branch, and built the graphify knowledge graph (246 nodes at first, 417 nodes, 820 edges and 20 communities after the changes). It confirmed the main backend findings against the unmodified server. |
| 2026-10-15 | Dependencies upgraded. Backend rewritten for identity, per-device wallets, rate limits, validation and safe WebSockets. Tests, CI and containers added. |
| 2026-10-16 | Frontend workflow relaunched after its first run failed on a usage limit and produced only one file. Report, attack tree and draft PR written. |
| 2026-10-22 | A weekly usage limit stopped the second frontend run partway. The security half had landed. I finished the UX half's loose ends, ran two independent code reviews, fixed what they found, rebuilt, ran the whole thing end to end, and finalised the PR. |

## 3. Live pentest on the project's own server (before and after)

Method: ordinary HTTP requests with `curl` against the original code on port 8090 and the new code on port 8091, both on localhost. No scanner or exploit tool was used.

| Check | Original MVP | After the fix |
| --- | --- | --- |
| Top-up wallet with no identity or payment | 200, balance grew | 401 without token, 403 with token (demo flag off) |
| Wallet shared by every visitor | One global wallet | One wallet per device token |
| Read every session and plate | 200, all sessions | Own sessions only; another device sees an empty list |
| Stop another person's session by id | 200, session stopped | 404 |
| Session id strength | 8 hex characters, about 32 bits | 16 URL-safe characters, about 96 bits |
| Plate `<b>x</b>` | Accepted | 422 |
| CORS preflight from a foreign site | `Access-Control-Allow-Origin: *`, every method | No CORS headers |
| 400 quick requests | All answered | 149 answered, 251 got 429 |
| API security headers | None | `nosniff`, `X-Frame-Options: DENY`, `no-store`, restrictive CSP |
| Unknown Host header | Accepted | 400 |
| Chunked or oversized body | Accepted | 411 or 413 |

Raw output is kept in the session scratchpad (`baseline-evidence.txt`, `after-evidence.txt`).

## 4. Backend findings

Everything below was verified by a test in `backend/tests/test_security.py` and, where noted in section 3, live.

| ID | Severity | Finding | Status |
| --- | --- | --- | --- |
| B1 | Critical | Free top-up with no auth | Fixed. Needs a token and the `PH_DEMO_TOPUP` flag, off by default. |
| B2 | Critical | One wallet for everyone | Fixed. Per-device accounts, 256-bit tokens, bounded store. |
| B3 | High | Plates visible to anyone | Fixed. Sessions scoped to the caller. |
| B4 | High | Anyone could stop any session | Fixed. Owner check and longer ids. |
| B5 | High | CORS open to every origin | Fixed. Allow-list, GET and POST only. Open data stays readable by any site by design. |
| B6 | High | No rate limit, WebSocket caps or size limits | Fixed. Token bucket per client, tighter limits for identity and writes, 4 KiB bodies, WebSocket caps of 8 per client and 1000 total, server-push only. |
| B7 | High | Fake sessions moved prices | Fixed. Paid sessions no longer change sensor occupancy. Three active sessions per account. |
| B8 | Medium | Balance check and deduction raced | Fixed. Handlers run atomically on the event loop. Test fires 8 parallel payments and exactly one succeeds. |
| B9 | Medium | Unbounded memory | Fixed. 10,000 accounts (least recently used evicted), 20 kept sessions per account. |
| B10 | Medium | Slow client stalled the live feed | Fixed. One serialisation per tick, 2 second send timeout, slow clients dropped. |
| B11 | Low | Weak input validation | Fixed. Strict plate pattern, id patterns, length limits, unknown fields refused. |
| B12 | Low | Health check did heavy work | Fixed. |
| B13 | Low | Event times re-parsed every tick | Fixed. |
| B14 | Low | No host check or headers | Fixed. Trusted hosts and security headers. Docs stay public; `PH_DOCS=0` hides them. |
| B15 | Low | Cost rounding mismatch, no refund | Fixed. One floor rule, and stopping a session refunds unused time. |
| Supply chain | High | 14 Starlette advisories | Fixed. `pip-audit` reports no known vulnerabilities. |
| SAST | Low | 4 `bandit` notes | Fixed. They were simulation randomness, now marked with a reason. |

Caveat that matters: B8 relies on running one worker process. With several workers or real money, move state to a database and use transactions. This is listed in `docs/ATTACK_TREE.md`.

## 5. Frontend, infrastructure and UX

What was done, how it was checked, and what was not.

**Checked:** `tsc` is clean. The production build passes (home page 129 kB of first-load JavaScript). `npm audit` reports 0. The built frontend ran against the new backend and passed every check below. Two independent Sonnet reviewers read all of the frontend changes.

| End-to-end check (frontend on a local port, proxying to the new backend) | Result |
| --- | --- |
| Page loads, Persian and right-to-left set | 200, `lang="fa" dir="rtl"` |
| Security headers on pages | CSP, HSTS, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options: DENY`, COOP all present; no `X-Powered-By` |
| API through the frontend | 200; identity token issued; wallet readable with it |
| Markup in a plate, through the proxy | 422 |
| Backend `/docs` through the frontend | 404 (hidden) |
| Service worker headers | `no-cache`, `Service-Worker-Allowed: /` |
| Fonts | no Google Fonts reference; Vazirmatn and Inter served from `/_next/static/media` |
| Live feed WebSocket through the frontend | frame received with 16 zones |

**Not checked:** no browser or Playwright exists on this machine, so touch gestures, the spring sheet, focus trap, right-to-left slide direction, reduced-motion paths and real Lighthouse numbers were verified only by code reading. Docker Desktop was not running, so the compose stack and the Caddy config were validated only with `docker compose config`.

| ID | Item | Status |
| --- | --- | --- |
| F1 | Vulnerable Next.js | Fixed. 15.5.28 plus overrides for postcss, sharp and source-map-js. |
| F2 | No security headers or CSP | Fixed and verified in responses. `script-src` keeps `'unsafe-inline'`, a documented trade-off. |
| F3 | Google Fonts at runtime | Fixed. Fonts are self-hosted with their licences. |
| F4 | Service worker caches everything | Fixed in code: versioned cache, only clean same-origin 200 responses, bounded, network-first pages. Not tested in a browser. |
| F5 | `window.__API__` override | Removed. |
| F6 | Mixed content and a baked API address | Fixed. Everything is same-origin through one proxy. |
| F7 | Containers | Hardened in the files: non-root, read-only, no capabilities, limits, strict `npm ci`, loopback publish only. Not run. |
| F8 | Unchecked socket frames | Fixed. Frames are size-capped, parsed safely and field-validated; a global error page catches render errors. |
| F9 | `rel="noreferrer"` only | Fixed. |
| P1 | One context re-rendered everything on each frame | Fixed. Preferences are separate from a live store read with selectors. The reviewer traced every component's subscriptions and confirmed Header, Hero and Footer do not re-render on frames. |
| P2 | Observer rebuilt on every render | Fixed. |
| P3 | Whole pages are client components | **Not done.** Server-rendered static sections remain a follow-up. |
| P4 | Polling on top of the socket | Fixed. No polling while live, pauses in hidden tabs, a watchdog reconnects a silent socket. |
| U1 | Sheet not interruptible | Implemented: spring physics, drag with velocity hand-off, momentum projection, rubber-banding, exit along the entry path. Not tried in a browser. |
| U2 | Dialog accessibility | Implemented: labelled dialog, focus trap, focus restore, Escape, scroll lock. |
| U3 | Silent default plate, raw errors | Implemented: inline validation, a review step before paying, translated errors for every status. |
| U4 | English-only labels | Fixed. |
| U5 | `transition-all` and hard header border | Fixed. |
| U6 | Endless drifting background | Fixed. Static. |
| U7 | Reduced transparency and contrast | Fixed. |
| U8 | Letter-spacing | Fixed. Persian stays at zero. |
| U9 | «جست‌وجو» wording | Fixed to «جستجو» across the app and README. |

**Findings from the two independent reviews, all verified before fixing:**

| Finding | Result |
| --- | --- |
| Next's proxy hop forwards a client-supplied `X-Forwarded-For`, so a visitor could forge their rate-limit identity | Fixed with a Caddy entry proxy that overwrites the header; the backend trusts only the proxy's address |
| Pinned Docker subnet clashed with this host's Docker networks | Fixed. `10.89.28.0/24`, configurable |
| Forwarded headers trusted from any address in the Dockerfile (also raised by an automated commit review) | Fixed |
| Third-party GitHub Actions pinned by tag only (automated commit review) | Fixed. Pinned to commit SHAs |
| Offline fallback served install-time HTML | Fixed |
| Two browser tabs could create two accounts | Fixed with a cross-tab lock |
| CSP upgrade option could not be set through compose | Fixed. Defaults to off for local HTTP |
| Concurrency cap equal to the WebSocket cap | Fixed. 1500 against 1000 |
| Dashboard numbers froze while the socket was live | Fixed. 30 second refresh |
| A silent half-open socket kept saying "live" | Fixed with a 15 second watchdog |
| A malformed frame could crash rendering | Fixed. Field validation and an error page |
| Sheet reopened on the wrong page after Back | Fixed |
| Focus lost after paying | Fixed |
| Enter did nothing in an invalid plate field | Fixed |
| Missing scroll-edge style, unhandled rejection, contrast on the accent colour, English-only endpoint text, empty state before load, stale offline poll, chart accessibility and animation | Fixed |
| Language flash for English users on first paint | Not fixed. Needs a cookie, design limit |
| Sheet does not re-measure on rotation while open | Not fixed. Cosmetic |
| Selection colour and header logo still use dark text on the accent in high-contrast light mode | Not fixed |
| Hover lift still applies to a disabled-looking primary button | Not fixed |

## 6. Performance of the security layer

Socket-level load tests could not be trusted. The machine's load average was above 50 because other sessions were running, and the old server managed only 19 requests per second. So the cost was measured in process, in CPU time, which load does not distort.

| Measure | Result |
| --- | --- |
| Rate limiter, one decision | about 3.6 microseconds |
| Rate limiter with constant new keys (worst case) | about 3.3 microseconds, memory stays bounded |
| Whole guard middleware per request | about 24 microseconds more than a bare app |

That is roughly 0.02 milliseconds per request. Other design choices that save work: the live feed is serialised once per tick instead of once per client, event times are parsed once, the health check no longer builds the full overview, and limiter state is O(1) per key with lazy refill.

A first attempt to cache IP parsing gave no measurable gain, so it was removed.

Frontend: the home page ships 129 kB of first-load JavaScript. Socket frames no longer re-render the header, hero or footer. Polling stops while the socket is live and while a tab is hidden. Fonts are served from the same origin instead of Google. The background no longer animates.

## 7. Not done, skipped, or limited

| Item | Why |
| --- | --- |
| Browser testing | No browser or Playwright on this machine. Interaction, animation and layout checks are by code reading only. |
| Docker stack and the Caddy proxy | Docker Desktop was not running. Compose was validated with `docker compose config` only. |
| Server-rendered static sections (P3) | Not assigned to the UX pass. Pages are still client components. |
| Lighthouse and real user timing | Needs a browser. |
| Running about 25 named skills one by one (`fastapi-*`, `python-*`, `backend-*`, and others) | Not run as separate passes. Their practices were applied directly: async handlers, typed validation, small modules, tests, one error path. Structured logging, request ids and metrics (python-observability) are not added. |
| `implementing-threat-intelligence-lifecycle-management` | Not applicable to an app of this size. The closest equivalent is in CI: weekly `pip-audit`, `npm audit`, `trivy` and Dependabot. |
| Product Owner, Tech Lead, Red Team, Blue Team and QA agents | Those agent types are written for a different product (PropAgentAI). I did not run them here. The role checks were done as part of my own review. |
| Offensive recon tools from the red-team skills | Not installed, and subdomain or network recon does not apply to a localhost app. |
| APK and IPA builds | Not started. The PWA is the first step. Store builds need Capacitor, Xcode and Android tooling. |
| Socket-level benchmark | Unreliable on this machine, see section 6. |
| Model switching | I did not change models. The two `/model` switches in this session were yours. Review agents ran on Sonnet. |
| Interrupted replies | An automated safety classifier stopped four of my replies during the live-testing phase. I did not repeat that content. Live testing stayed on this project's own localhost server. |
| `main.py` (staged then deleted) and `skills-lock.json` | Pre-existing. I left them alone. |

## 8. Ponytail review of the backend changes

Format: location, what to cut, what replaces it. Line numbers are in the files as committed.

- `security.py:L62: delete: RateLimiter.reset(). Only tests call it. Tests use lim.buckets.clear().`
- `security.py:L21, main.py:L72-74: yagni: PH_DOCS toggle, nobody sets it yet. Docs stay public until someone needs it off.`
- `main.py:L25,L44,L276: shrink: one-key dict for the last frame. A module-level string.`
- `main.py:L112,L120: shrink: the zone id pattern written twice. One constant.`
- `main.py:L138: shrink: _rejected() used twice. raise HTTPException(e.status, e.detail) inline.`
- `engine.py:L385: shrink: per-account session pruning loop. Keep only the last 20 in a deque.`

net: -25 lines possible in the backend. Every one is a simplification, not a safety control, so none was applied under the time pressure.

The frontend was not reviewed line by line with this lens. For the next pass: `ZoneSheet.tsx` is about 630 lines and `lib/app.tsx` about 480. The hand-written spring and gesture code was chosen to avoid a dependency, and it is the first place to look for cuts.

## 9. Memory I hold about this project

- **security-ux-hardening-in-progress:** the audit task started 2026-10-02, with state and plan in `SESSION_HANDOFF.md`.
- **dev-machine-constraints:** about 1 GB of free RAM, ports 8000 and 3000 belong to another project, and the backend virtualenv needs `python -m pip`.

## 10. How to run and verify

```bash
cd backend && .venv/bin/python -m pytest -q          # 27 security tests
cd backend && .venv/bin/python -m bandit -r app -q
cd backend && .venv/bin/python -m pip_audit -r requirements.txt
cd frontend && npx tsc --noEmit && npm run build && npm audit
docker compose up --build                             # whole app on http://127.0.0.1:3200 (not run in this session)
```

## 11. What to do next

1. Run `docker compose up --build` and open http://127.0.0.1:3200 in a browser. Try the sheet by touch, keyboard only, right-to-left and left-to-right, with reduced motion on.
2. Before real money: real authentication, a payment provider, a database and transactions.
3. Add structured logging and request ids.
4. Build the PWA install flow, then the APK and IPA with Capacitor.
