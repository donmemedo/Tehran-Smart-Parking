"""ParkHooshmand API — SFpark-inspired smart curbside parking for Iranian cities."""
from __future__ import annotations

import asyncio
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from . import engine

clients: set[WebSocket] = set()


async def broadcaster():
    while True:
        payload = engine.tick()
        dead = []
        for ws in list(clients):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.append(ws)
        for ws in dead:
            clients.discard(ws)
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
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class SessionIn(BaseModel):
    zone_id: str
    plate: str = Field(min_length=2, max_length=20)
    minutes: int = Field(ge=15, le=480)


@app.get("/api/health")
def health():
    return {"status": "ok", "zones": len(engine.ZONES), "uptime_s": engine.overview()["uptime_s"]}


@app.get("/api/zones")
def zones(
    q: str | None = None,
    kind: str | None = None,
    available: bool = False,
    sort: str = Query("occupancy", pattern="^(occupancy|rate|free|name)$"),
):
    items = [z.brief() for z in engine.ZONES.values()]
    if q:
        ql = q.strip().lower()
        items = [z for z in items if ql in z["name"]["fa"] or ql in z["name"]["en"].lower() or ql in z["id"].lower()]
    if kind in ("street", "garage"):
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
def zone(zone_id: str):
    z = engine.ZONES.get(zone_id.upper())
    if not z:
        raise HTTPException(404, "zone not found")
    return z.detail()


@app.get("/api/stats/overview")
def overview():
    return engine.overview()


@app.get("/api/events")
def events():
    engine.refresh_events()
    return {"items": engine.EVENTS}


@app.get("/api/pricing/policy")
def policy():
    from .data import POLICY

    return {
        "policy": POLICY,
        "explainer": {
            "fa": "نرخ هر بلوک بر پایه اشغال واقعی تنظیم می‌شود؛ هدف ما همیشه یک تا دو جای خالی در هر بلوک است.",
            "en": "Each block's rate follows measured occupancy; the goal is always one or two open spaces per block.",
        },
    }


@app.post("/api/sessions")
def create_session(body: SessionIn):
    if body.zone_id.upper() not in engine.ZONES:
        raise HTTPException(404, "zone not found")
    z = engine.ZONES[body.zone_id.upper()]
    if z.free <= 0:
        raise HTTPException(409, "zone is full")
    cost = int(z.effective_rate() * body.minutes / 60)
    if cost > engine.WALLET["balance"]:
        raise HTTPException(402, "insufficient wallet balance")
    return engine.start_session(body.zone_id.upper(), body.plate, body.minutes)


@app.get("/api/sessions")
def list_sessions():
    return {"items": sorted(engine.SESSIONS.values(), key=lambda s: s["start"], reverse=True)}


@app.post("/api/sessions/{sid}/stop")
def stop(sid: str):
    if sid not in engine.SESSIONS:
        raise HTTPException(404, "session not found")
    return engine.stop_session(sid)


@app.get("/api/wallet")
def wallet():
    return engine.WALLET


class TopUp(BaseModel):
    amount: int = Field(ge=10000, le=5000000)


@app.post("/api/wallet/topup")
def topup(body: TopUp):
    engine.WALLET["balance"] += body.amount
    return engine.WALLET


@app.get("/api/open-data/zones.geojson")
def geojson():
    """Open data endpoint, in the spirit of SFpark's public API."""
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


@app.websocket("/ws/live")
async def ws_live(ws: WebSocket):
    await ws.accept()
    clients.add(ws)
    try:
        await ws.send_text(json.dumps({"t": engine.now().isoformat(), "zones": [z.brief() for z in engine.ZONES.values()], "rate_changes": []}))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        clients.discard(ws)
