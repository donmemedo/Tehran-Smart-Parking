# Attack tree: abuse of the parking payment and pricing system

Root goal of the attacker: **get free parking or distort prices at scale**.
`OR` means any branch is enough. `AND` means every branch is needed.
Status is the state after this branch. "Original" is the unmodified MVP.

```
GOAL: free parking / manipulated prices
|
+-- OR 1. Create money from nothing
|    +-- 1.1 Call wallet top-up without paying ........ original: OPEN (B1)   now: 401 without token, 403 with token (demo flag off)
|    +-- 1.2 Overdraw with parallel payments .......... original: OPEN (B8)   now: CLOSED (atomic on event loop, tested with 8 threads)
|    +-- 1.3 Stop a session twice to be refunded twice  original: n/a        now: CLOSED (refund set once, test)
|
+-- OR 2. Use someone else's money or sessions
|    +-- 2.1 Spend the shared wallet .................. original: OPEN (B2)   now: CLOSED (per-device wallet, 256-bit token)
|    +-- 2.2 Guess a session id and stop it ........... original: OPEN (B4)   now: CLOSED (96-bit ids, owner check, 404 for others)
|    +-- 2.3 Read all plates from the session list .... original: OPEN (B3)   now: CLOSED (own sessions only)
|    +-- 2.4 Steal a token from the browser
|         +-- AND 2.4.1 run script on the page ........ now: needs XSS; React escapes plates, server refuses markup in plates, CSP set (script-src keeps 'unsafe-inline', so CSP alone will not stop it)
|         +-- AND 2.4.2 read localStorage ............. residual: token is the only credential (anonymous demo account)
|
+-- OR 3. Distort demand-responsive prices
|    +-- 3.1 Mass-create sessions to fill a zone ...... original: OPEN (B7)   now: CLOSED (sessions do not move sensor occupancy; 3 active per account)
|    +-- 3.2 Mint many accounts to bypass the cap ..... now: LIMITED (identity: 10/min per client, burst 5; 10,000-account LRU)
|    +-- 3.2b Forge the client address to get fresh limits
|         +-- original design (Next rewrite hop only): OPEN. Next forwards a client-sent X-Forwarded-For untouched,
|         |   and the backend trusts that hop. Found by independent review, confirmed in Next's proxy code.
|         +-- now: CLOSED by design. Caddy is the only public entry, replaces X-Forwarded-For with the real peer,
|             and the backend trusts only the proxy's fixed address. Parsing logic verified with uvicorn directly;
|             the container stack itself was not run (Docker was not available).
|    +-- 3.3 Tamper with sensor data .................. out of scope here (no sensor ingestion API exists)
|
+-- OR 4. Take the service down
|    +-- 4.1 Request flood ............................ original: OPEN (B6)   now: 429 after burst (verified: 251 of 400 refused)
|    +-- 4.2 Open thousands of WebSockets ............. original: OPEN (B6)   now: 8 per client, 1000 total
|    +-- 4.3 Slow WebSocket reader stalls the feed .... original: OPEN (B10)  now: CLOSED (2 s send timeout, dropped)
|    +-- 4.4 Huge or chunked request bodies ........... now: 413 / 411 (4 KiB cap)
|    +-- 4.5 Memory growth from stored state .......... original: OPEN (B9)   now: CLOSED (bounded accounts, 20 sessions per account)
|    +-- 4.6 Known framework DoS (Starlette, Next) .... original: OPEN (F1)   now: patched versions (Starlette 1.8.0, Next 15.5.28)
|
+-- OR 5. Attack the visitor's browser
|    +-- 5.1 Call the API from a hostile site ......... original: OPEN (B5)   now: CLOSED (origin allow-list)
|    +-- 5.2 Clickjack the pay button ................. CLOSED (frame-ancestors 'none' + X-Frame-Options DENY, verified in response headers)
|    +-- 5.3 Poison the service-worker cache .......... CLOSED by design (200, same-origin, non-redirected responses only; never /api, /ws or Authorization), not tested in a browser
|
+-- OR 6. Supply chain and runtime
     +-- 6.1 Exploit a known CVE in a dependency ....... CI runs pip-audit, npm audit and trivy weekly and on every PR
     +-- 6.2 Escape the container ...................... non-root user, read-only fs, no capabilities, resource limits
```

## Residual risks (accepted or open)

| Risk | Why it remains | Next step |
| --- | --- | --- |
| Anonymous token is the only credential | No real payments or user accounts exist yet | Real authentication and a payment provider before any real money |
| State is in memory, one process | MVP simulation | Database, and transactions instead of the event-loop guarantee, before running more than one worker |
| Rate limits are per process | Same | Shared store such as Redis when scaling out |
| WebSocket does not check Origin | Feed is public open data with no credentials | Add an Origin check if the feed ever carries private data |
| Swagger docs are public on the backend | Open-data goal | `PH_DOCS=0` turns them off. The proxy does not expose `/docs`. |
| CSP keeps `script-src 'unsafe-inline'` | Static pages and Next's inline scripts; a nonce would force per-request rendering | Nonce-based CSP via middleware if XSS risk grows |
| Token lives in `localStorage` | Anonymous demo account, no cookies | HttpOnly cookie session with real accounts |
| Proxy and containers were not run in this session | Docker Desktop was not available | Run `docker compose up --build` and the checks in `LAST_Report.md` section 10 |
