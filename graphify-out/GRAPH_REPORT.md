# Graph Report - Tehran-Smart-Parking  (2026-10-08)

## Corpus Check
- Corpus is ~14,485 words - fits in a single context window. You may not need a graph.

## Summary
- 246 nodes · 453 edges · 13 communities (11 shown, 2 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 41 edges (avg confidence: 0.85)
- Token cost: 205,133 input · 0 output

## Community Hubs (Navigation)
- Frontend Pages and Charts
- Simulation Engine and Seed Data
- API Routes and Broadcaster
- Frontend Dependencies
- Product Concepts and Infra Config
- TypeScript Config
- Sessions and Wallet Payments
- App Shell and Next Config
- Live Feed and Rate Limits
- PWA Service Worker
- App Icon
- Next Type Stubs

## God Nodes (most connected - your core abstractions)
1. `useApp()` - 21 edges
2. `fmt()` - 16 edges
3. `compilerOptions` - 16 edges
4. `Zone` - 14 edges
5. `pct()` - 14 edges
6. `ZoneSheet()` - 13 edges
7. `now()` - 12 edges
8. `Header()` - 8 edges
9. `react` - 8 edges
10. `create_session()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `City Operations Dashboard` --references--> `Dashboard()`  [INFERRED]
  README.md → frontend/components/Dashboard.tsx
- `B13: Event Times Re-parsed Every Tick` --references--> `refresh_events()`  [INFERRED]
  SESSION_HANDOFF.md → backend/app/engine.py
- `B12: Health Check Computes Full Overview` --references--> `overview()`  [INFERRED]
  SESSION_HANDOFF.md → backend/app/engine.py
- `B7: Price Manipulation via Mass Fake Sessions` --references--> `start_session()`  [INFERRED]
  SESSION_HANDOFF.md → backend/app/engine.py
- `B8: Balance Check/Deduct Race (no lock)` --references--> `start_session()`  [INFERRED]
  SESSION_HANDOFF.md → backend/app/engine.py

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **SFpark Loop: Availability -> Pricing -> Open Data** — readme_sfpark_model, readme_live_availability_websocket, readme_demand_responsive_pricing, readme_open_data_api [EXTRACTED 1.00]
- **Wallet and Session Business-Logic Abuse Chain** — session_handoff_b1_unauthenticated_wallet_topup, session_handoff_b2_global_shared_wallet, session_handoff_b7_price_manipulation, session_handoff_b8_balance_race_condition, session_handoff_b9_unbounded_sessions [INFERRED 0.85]
- **Apple-Design UI/UX Findings (U1-U9)** — session_handoff_apple_design_guidance, session_handoff_u1_sheet_not_interruptible, session_handoff_u2_dialog_focus_management, session_handoff_u3_plate_default_no_confirm, session_handoff_u4_english_aria_labels, session_handoff_u5_transition_all_layout, session_handoff_u6_aurora_infinite_motion, session_handoff_u7_transparency_contrast_prefs, session_handoff_u8_display_letter_spacing, session_handoff_u9_search_wording [EXTRACTED 1.00]

## Communities (13 total, 2 thin omitted)

### Community 0 - "Frontend Pages and Charts"
Cohesion: 0.12
Nodes (37): DashboardPage(), Home(), Bars(), Ring(), Spark(), Dashboard(), Footer(), Header() (+29 more)

### Community 1 - "Simulation Engine and Seed Data"
Cohesion: 0.10
Nodes (21): Seed data for the Tehran smart-curbside-parking pilot (SFpark-inspired)., boot(), demand_curve(), _init_events(), now(), In-memory simulation of sensors, occupancy and demand-responsive pricing., Base demand factor 0..1 for a given hour of day., refresh_events() (+13 more)

### Community 2 - "API Routes and Broadcaster"
Cohesion: 0.08
Nodes (30): asyncio, overview(), broadcaster(), events(), geojson(), health(), lifespan(), list_sessions() (+22 more)

### Community 3 - "Frontend Dependencies"
Cohesion: 0.07
Nodes (27): dependencies, next, react, react-dom, devDependencies, tailwindcss, @tailwindcss/postcss, @types/node (+19 more)

### Community 4 - "Product Concepts and Infra Config"
Cohesion: 0.10
Nodes (26): fastapi==0.115.6, backend service (sfpark-backend, 8090:8000), frontend service (sfpark-frontend, 3200:3000), NEXT_PUBLIC_API_URL (build-time arg), Dict, FA_DIGITS, Bilingual fa/en with RTL, Design System (tokens, glass, aurora, spring easing) (+18 more)

### Community 5 - "TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 6 - "Sessions and Wallet Payments"
Cohesion: 0.16
Nodes (18): start_session(), stop_session(), create_session(), SessionIn, stop(), TopUp, wallet(), pydantic==2.10.4 (+10 more)

### Community 7 - "App Shell and Next Config"
Cohesion: 0.15
Nodes (11): frontend_app_globals, metadata, RootLayout(), viewport, Overview, Providers(), nextConfig, next (+3 more)

### Community 8 - "Live Feed and Rate Limits"
Cohesion: 0.25
Nodes (9): ws_live(), Live Availability over WebSocket (5s frames), Open Data API (JSON + GeoJSON + live socket), SFpark Model, B6: No Rate Limiting or WebSocket Connection/Size Caps, P4: Polling on Top of WebSocket, P5: Security Layer Per-Request Overhead (benchmark), Token-Bucket Rate Limiting (per IP / identity) (+1 more)

### Community 9 - "PWA Service Worker"
Cohesion: 0.50
Nodes (4): SHELL, Capacitor Store Builds (APK/IPA), PWA (manifest + app-shell service worker), F4: Service Worker Caches Errors/Opaque, Unversioned Cache

### Community 10 - "App Icon"
Cohesion: 0.67
Nodes (3): Smart Parking PWA App Icon, Brand Gradient (mint #2ee6a8 to violet #6b5bff), Parking 'P' Glyph

## Knowledge Gaps
- **64 isolated node(s):** `metadata`, `viewport`, `ENDPOINTS`, `C`, `name` (+59 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 90 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ZoneSheet()` connect `Frontend Pages and Charts` to `Live Feed and Rate Limits`, `API Routes and Broadcaster`, `Product Concepts and Infra Config`, `Sessions and Wallet Payments`?**
  _High betweenness centrality (0.201) - this node is a cross-community bridge._
- **Why does `react` connect `Frontend Pages and Charts` to `Frontend Dependencies`?**
  _High betweenness centrality (0.154) - this node is a cross-community bridge._
- **Why does `Parking Session + Wallet Payment` connect `Sessions and Wallet Payments` to `Frontend Pages and Charts`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `ENDPOINTS` to the rest of the system?**
  _64 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend Pages and Charts` be split into smaller, more focused modules?**
  _Cohesion score 0.11600279524807827 - nodes in this community are weakly interconnected._
- **Should `Simulation Engine and Seed Data` be split into smaller, more focused modules?**
  _Cohesion score 0.09747899159663866 - nodes in this community are weakly interconnected._
- **Should `API Routes and Broadcaster` be split into smaller, more focused modules?**
  _Cohesion score 0.0846774193548387 - nodes in this community are weakly interconnected._