"""ParkHooshmand API — SFpark-inspired smart curbside parking for Iranian cities."""
from __future__ import annotations

import asyncio
import contextlib
import json
import re
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, HTTPException, Path, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator

from . import engine, security
from .data import POLICY

# All handlers are async and never await between reading and changing engine state, so every
# request runs atomically on the event loop: no thread pool hop and no lock needed.

clients: set[WebSocket] = set()
_ws_per_client: dict[str, int] = {}
_last_frame: dict[str, str] = {}

WS_SEND_TIMEOUT = 2.0


def _dumps(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


async def _send(ws: WebSocket, text: str) -> WebSocket | None:
    try:
        await asyncio.wait_for(ws.send_text(text), WS_SEND_TIMEOUT)
        return None
    except Exception:  # slow or gone: drop it so it cannot stall the others
        return ws


async def broadcast_once() -> None:
    text = _dumps(engine.tick())  # serialise once per tick, not once per client
    _last_frame["text"] = text
    if clients:
        for ws in await asyncio.gather(*(_send(ws, text) for ws in list(clients))):
            if ws is not None:
                clients.discard(ws)
                with contextlib.suppress(Exception):
                    await ws.close(code=1011)


async def broadcaster():
    while True:
        await broadcast_once()
        await asyncio.sleep(5)


@asynccontextmanager
async def lifespan(app: FastAPI):
    engine.boot()
    task = asyncio.create_task(broadcaster())
    yield
    task.cancel()


app = FastAPI(
    title="ParkHooshmand API",
    description="Real-time availability, demand-responsive pricing and open data for curbside parking.",
    version="1.1.0",
    lifespan=lifespan,
    docs_url="/docs" if security.PUBLIC_DOCS else None,
    redoc_url=None,
    openapi_url="/openapi.json" if security.PUBLIC_DOCS else None,
)

# Last added runs first: trusted host -> CORS -> guard -> routes.
app.add_middleware(security.GuardMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=security.ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=security.ALLOWED_HOSTS)


# ---------- identity ----------
_bearer = HTTPBearer(auto_error=False)


async def account(cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)]) -> dict:
    acct = engine.get_account(cred.credentials) if cred else None
    if acct is None:
        raise HTTPException(401, "missing or unknown token", headers={"WWW-Authenticate": "Bearer"})
    return acct


async def writer(
    cred: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
    acct: Annotated[dict, Depends(account)],
) -> dict:
    wait = security.WRITES.hit(cred.credentials)
    if wait:
        raise HTTPException(429, "rate limited", headers={"Retry-After": str(int(wait) + 1)})
    return acct


Account = Annotated[dict, Depends(account)]
Writer = Annotated[dict, Depends(writer)]
ZoneId = Annotated[str, Path(pattern=r"^[A-Za-z]{3}$")]
SessionId = Annotated[str, Path(pattern=r"^PK-[A-Za-z0-9_-]{16}$")]

PLATE_RE = re.compile(r"^[0-9A-Za-z؀-ۿ‌ -]{2,16}$")


class SessionIn(BaseModel):
    model_config = ConfigDict(extra="forbid")
    zone_id: str = Field(pattern=r"^[A-Za-z]{3}$")
    plate: str = Field(max_length=40)
    minutes: int = Field(ge=15, le=480)

    @field_validator("plate")
    @classmethod
    def _plate(cls, v: str) -> str:
        v = " ".join(v.split())
        if not PLATE_RE.fullmatch(v):
            raise ValueError("plate must be 2-16 Persian or Latin letters, digits, spaces or hyphens")
        return v


class TopUp(BaseModel):
    model_config = ConfigDict(extra="forbid")
    amount: int = Field(ge=10000, le=5000000)


def _rejected(e: engine.Rejected) -> HTTPException:
    return HTTPException(e.status, e.detail)


# ---------- public data ----------
@app.get("/api/health")
async def health():
    return {"status": "ok", "zones": len(engine.ZONES), "uptime_s": engine.uptime()}


@app.get("/api/zones")
async def zones(
    q: Annotated[str | None, Query(max_length=40)] = None,
    kind: Annotated[str | None, Query(pattern="^(street|garage)$")] = None,
    available: bool = False,
    sort: Annotated[str, Query(pattern="^(occupancy|rate|free|name)$")] = "occupancy",
):
    items = [z.brief() for z in engine.ZONES.values()]
    if q:
        ql = q.strip().lower()
        items = [z for z in items if ql in z["name"]["fa"] or ql in z["name"]["en"].lower() or ql in z["id"].lower()]
    if kind:
        items = [z for z in items if z["kind"] == kind]
    if available:
        items = [z for z in items if z["occupancy"] < 0.9]
    keys = {
        "occupancy": lambda z: z["occupancy"],
        "rate": lambda z: z["effective_rate"],
        "free": lambda z: -z["free"],
        "name": lambda z: z["name"]["en"],
    }
    items.sort(key=keys[sort])
    return {"count": len(items), "items": items, "updated_at": engine.now().isoformat()}


@app.get("/api/zones/{zone_id}")
async def zone(zone_id: ZoneId):
    z = engine.ZONES.get(zone_id.upper())
    if not z:
        raise HTTPException(404, "zone not found")
    return z.detail()


@app.get("/api/stats/overview")
async def overview():
    return engine.overview()


@app.get("/api/events")
async def events():
    engine.refresh_events()
    return {"items": engine.EVENTS}


@app.get("/api/pricing/policy")
async def policy():
    return {
        "policy": POLICY,
        "explainer": {
            "fa": "نرخ هر بلوک بر پایه اشغال واقعی تنظیم می‌شود؛ هدف ما همیشه یک تا دو جای خالی در هر بلوک است.",
            "en": "Each block's rate follows measured occupancy; the goal is always one or two open spaces per block.",
        },
    }


@app.get("/api/open-data/zones.geojson")
async def geojson():
    """Open data endpoint, in the spirit of SFpark's public API. Readable from any origin."""
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "properties": z.brief(),
                "geometry": {"type": "Point", "coordinates": [51.30 + z.x / 100, 35.60 + (100 - z.y) / 180]},
            }
            for z in engine.ZONES.values()
        ],
    }


# ---------- account, wallet and sessions ----------
@app.post("/api/identity")
async def identity(request: Request):
    """Issue an anonymous device account. The token is the only credential: keep it private."""
    wait = security.IDENTITY.hit(security.client_key(request.scope))
    if wait:
        raise HTTPException(429, "rate limited", headers={"Retry-After": str(int(wait) + 1)})
    token, acct = engine.create_account()
    return {"token": token, **engine.wallet_view(acct)}


@app.get("/api/wallet")
async def wallet(acct: Account):
    return engine.wallet_view(acct)


@app.post("/api/wallet/topup")
async def topup(body: TopUp, acct: Writer):
    # No payment provider is wired in yet, so free top-ups exist only in explicit demo mode.
    if not security.DEMO_TOPUP:
        raise HTTPException(403, "top-up requires a payment provider")
    return engine.topup(acct, body.amount)


@app.get("/api/sessions")
async def list_sessions(acct: Account):
    return {"items": engine.list_sessions(acct)}


@app.post("/api/sessions")
async def create_session(body: SessionIn, acct: Writer):
    try:
        return engine.start_session(acct, body.zone_id.upper(), body.plate, body.minutes)
    except engine.Rejected as e:
        raise _rejected(e) from None


@app.post("/api/sessions/{sid}/stop")
async def stop(sid: SessionId, acct: Writer):
    try:
        return engine.stop_session(acct, sid)
    except engine.Rejected as e:
        raise _rejected(e) from None


# ---------- live feed ----------
@app.websocket("/ws/live")
async def ws_live(ws: WebSocket):
    """Server-push only. Public data, no credentials, so any origin may subscribe (open data)."""
    key = security.client_key(ws.scope)
    if len(clients) >= security.MAX_WS_TOTAL or _ws_per_client.get(key, 0) >= security.MAX_WS_PER_CLIENT:
        await ws.close(code=1013)  # try again later
        return
    _ws_per_client[key] = _ws_per_client.get(key, 0) + 1
    try:
        await ws.accept()
        clients.add(ws)
        first = _last_frame.get("text") or _dumps(
            {"t": engine.now().isoformat(), "zones": [z.brief() for z in engine.ZONES.values()], "rate_changes": []}
        )
        await ws.send_text(first)
        await ws.receive()  # the protocol is one-way: any client message or disconnect ends it
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(ws)
        left = _ws_per_client.get(key, 1) - 1
        if left > 0:
            _ws_per_client[key] = left
        else:
            _ws_per_client.pop(key, None)
        with contextlib.suppress(Exception):
            await ws.close(code=1008)
