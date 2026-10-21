# Graph Report - Tehran-Smart-Parking  (2026-10-22)

## Corpus Check
- 36 files · ~29,578 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 7, .woff2 4, .example 1)

## Summary
- 417 nodes · 820 edges · 20 communities (16 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `e4ec3bc7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend Pages and Charts
- Zone
- main.py
- Frontend Dependencies
- ZoneSheet.tsx
- TypeScript Config
- account
- app.tsx
- test_security.py
- sw.js
- App Icon
- LAST_Report: security, performance and UX hardening of ParkHooshmand
- engine.py
- security.py
- Session handoff: security, performance and UI/UX hardening
- get
- next.config.mjs
- SessionIn

## God Nodes (most connected - your core abstractions)
1. `usePrefs()` - 31 edges
2. `useLive()` - 22 edges
3. `SheetPanel()` - 19 edges
4. `fmt()` - 18 edges
5. `compilerOptions` - 16 edges
6. `pct()` - 15 edges
7. `Zone` - 14 edges
8. `now()` - 13 edges
9. `useLiveActions()` - 13 edges
10. `new_account()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `NEXT_PUBLIC_API_URL (build-time arg)` --shares_data_with--> `api`  [INFERRED]
  docker-compose.yml → frontend/lib/api.ts
- `6.3 Performance` --references--> `useReveal()`  [INFERRED]
  SESSION_HANDOFF.md → frontend/lib/app.tsx
- `pydantic==2.10.4` --conceptually_related_to--> `SessionIn`  [INFERRED]
  backend/requirements.txt → backend/app/main.py
- `Backend healthcheck (/api/health)` --references--> `health()`  [EXTRACTED]
  docker-compose.yml → backend/app/main.py
- `ws_live()` --calls--> `now()`  [EXTRACTED]
  backend/app/main.py → backend/app/engine.py

## Import Cycles
- None detected.

## Communities (20 total, 4 thin omitted)

### Community 0 - "Frontend Pages and Charts"
Cohesion: 0.10
Nodes (51): DashboardPage(), RouteError(), Home(), Bars(), Ring(), Spark(), Dashboard(), FeedRow (+43 more)

### Community 2 - "main.py"
Cohesion: 0.15
Nodes (8): broadcast_once(), broadcaster(), _dumps(), lifespan(), _send(), ws_live(), fastapi==0.115.6, uvicorn[standard]==0.34.0

### Community 3 - "Frontend Dependencies"
Cohesion: 0.06
Nodes (30): dependencies, next, react, react-dom, devDependencies, tailwindcss, @tailwindcss/postcss, @types/node (+22 more)

### Community 4 - "ZoneSheet.tsx"
Cohesion: 0.10
Nodes (34): backend service (sfpark-backend, 8090:8000), frontend service (sfpark-frontend, 3200:3000), NEXT_PUBLIC_API_URL (build-time arg), classify(), Dim, ErrKey, reducedMotion(), Result (+26 more)

### Community 5 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "account"
Cohesion: 0.15
Nodes (11): get_account(), topup(), wallet_view(), account(), create_session(), identity(), _rejected(), stop() (+3 more)

### Community 7 - "app.tsx"
Cohesion: 0.08
Nodes (36): fontVars, interLatin, interLatinExt, metadata, RootLayout(), vazirArabic, vazirLatin, viewport (+28 more)

### Community 8 - "test_security.py"
Cohesion: 0.09
Nodes (15): create_account(), client(), new_account(), open_zone(), test_account_store_is_bounded(), test_active_session_cap(), test_bad_plates_are_rejected(), test_concurrent_payments_cannot_overdraw() (+7 more)

### Community 9 - "sw.js"
Cohesion: 0.50
Nodes (7): cacheable(), cacheFirst(), match(), networkFirst(), SHELL_URLS, store(), trim()

### Community 10 - "App Icon"
Cohesion: 0.67
Nodes (3): Smart Parking PWA App Icon, Brand Gradient (mint #2ee6a8 to violet #6b5bff), Parking 'P' Glyph

### Community 13 - "LAST_Report: security, performance and UX hardening of ParkHooshmand"
Cohesion: 0.08
Nodes (22): Attack tree: abuse of the parking payment and pricing system, Residual risks (accepted or open), 10. How to run and verify, 11. What to do next, 1. Bottom line, 2. How the work went, from the first step, 3. Live pentest on the project's own server (before and after), 4. Backend findings (+14 more)

### Community 14 - "engine.py"
Cohesion: 0.14
Nodes (11): boot(), _expire(), _init_events(), now(), refresh_events(), Rejected, session_cost(), start_session() (+3 more)

### Community 15 - "security.py"
Cohesion: 0.11
Nodes (8): client_key(), _env_list(), GuardMiddleware, RateLimiter, _reply(), test_general_rate_limit_returns_429_with_retry_after(), test_ipv6_clients_are_grouped_by_64(), test_limiter_memory_is_bounded()

### Community 16 - "Session handoff: security, performance and UI/UX hardening"
Cohesion: 0.11
Nodes (18): useReveal(), 1. The original request, 2. Where things stand, 3. Environment notes (read these first), 4. Project map, 5.1 npm audit (frontend): 1 critical, 2 high, 5.2 pip-audit (backend): 14 advisories, all in starlette 0.41.3, 5.3 bandit (backend): 4 low (+10 more)

### Community 17 - "get"
Cohesion: 0.12
Nodes (11): list_sessions(), overview(), uptime(), geojson(), health(), list_sessions(), overview(), policy() (+3 more)

### Community 18 - "next.config.mjs"
Cohesion: 0.29
Nodes (4): BACKEND_URL, csp, nextConfig, securityHeaders

## Knowledge Gaps
- **12 isolated node(s):** `react-dom`, `@tailwindcss/postcss`, `@types/node`, `@types/react`, `@types/react-dom` (+7 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 175 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `health()` connect `get` to `main.py`?**
  _High betweenness centrality (0.410) - this node is a cross-community bridge._
- **What connects `react-dom`, `@tailwindcss/postcss`, `@types/node` to the rest of the system?**
  _12 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Pages and Charts` be split into smaller, more focused modules?**
  _Cohesion score 0.10445468509984639 - nodes in this community are weakly interconnected._
- **Why does `api` connect `ZoneSheet.tsx` to `app.tsx`?**
  _High betweenness centrality (0.409) - this node is a cross-community bridge._
- **Should `Frontend Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06451612903225806 - nodes in this community are weakly interconnected._
- **Should `ZoneSheet.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10241820768136557 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._