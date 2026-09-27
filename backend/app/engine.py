"""In-memory simulation of sensors, occupancy and demand-responsive pricing."""
from __future__ import annotations

import math
import random
import time
import uuid
from datetime import datetime, timedelta, timezone

from .data import EVENT_SEED, POLICY, ZONE_SEED

TZ = timezone(timedelta(hours=3, minutes=30))  # Asia/Tehran


def now() -> datetime:
    return datetime.now(TZ)


def demand_curve(hour: float, weekday: int, kind: str) -> float:
    """Base demand factor 0..1 for a given hour of day."""
    morning = math.exp(-((hour - 10.0) ** 2) / 6.0)
    evening = math.exp(-((hour - 18.5) ** 2) / 7.0)
    night = math.exp(-((hour - 22.0) ** 2) / 10.0) * 0.45
    base = 0.30 + 0.62 * max(morning, evening) + 0.2 * night
    if weekday == 4:  # Friday, Iranian weekend
        base *= 0.62
    if kind == "garage":
        base *= 0.92
    return max(0.05, min(1.0, base))


class Zone:
    def __init__(self, seed):
        zid, fa, en, district, kind, capacity, rate, x, y = seed
        self.id = zid
        self.name_fa, self.name_en = fa, en
        self.district, self.kind = district, kind
        self.capacity = capacity
        self.base_rate = rate
        self.rate = rate
        self.x, self.y = x, y
        self.sensors = capacity
        self.sensors_online = capacity - random.randint(0, max(1, capacity // 90))
        self.appeal = random.uniform(0.82, 1.18)
        self.occupied = int(capacity * 0.5)
        self.history: list[dict] = []
        self.rate_changes: list[dict] = []
        self.revenue_today = 0.0
        self._seed_history()

    # ---------- occupancy ----------
    def target_occupancy(self, at: datetime) -> float:
        h = at.hour + at.minute / 60
        d = demand_curve(h, at.weekday(), self.kind) * self.appeal
        # price elasticity: pricier than base pushes demand down
        elasticity = (self.base_rate / max(self.rate, 1)) ** 0.35
        for ev in EVENTS:
            if ev["zone_id"] == self.id and ev["active"]:
                d *= 1.35
        return max(0.03, min(0.995, d * elasticity))

    def _seed_history(self):
        t = now() - timedelta(hours=23)
        for _ in range(24):
            occ = self.target_occupancy(t) * random.uniform(0.94, 1.06)
            occ = max(0.02, min(0.99, occ))
            self.history.append(
                {
                    "t": t.isoformat(),
                    "hour": t.hour,
                    "occupancy": round(occ, 3),
                    "rate": self.rate,
                    "revenue": round(occ * self.capacity * self.rate / 1000, 1),
                }
            )
            t += timedelta(hours=1)
        self.occupied = int(self.capacity * self.history[-1]["occupancy"])
        self.revenue_today = sum(h["revenue"] for h in self.history)

    def tick(self, at: datetime):
        target = self.target_occupancy(at)
        cur = self.occupied / self.capacity
        cur += (target - cur) * 0.18 + random.uniform(-0.012, 0.012)
        self.occupied = int(max(0, min(self.capacity, round(cur * self.capacity))))
        self.revenue_today += self.occupied * self.rate / 3600 * 5 / 1000

    # ---------- demand-responsive pricing ----------
    def reprice(self, at: datetime) -> dict | None:
        occ = self.occupancy
        step = POLICY["step"]
        new = self.rate
        if occ > POLICY["target_high"]:
            new = min(POLICY["max_rate"], self.rate + step)
        elif occ < POLICY["target_low"]:
            new = max(POLICY["min_rate"], self.rate - step)
        if new == self.rate:
            return None
        change = {
            "t": at.isoformat(),
            "from": self.rate,
            "to": new,
            "occupancy": round(occ, 3),
            "reason": "high_demand" if new > self.rate else "low_demand",
        }
        self.rate = new
        self.rate_changes.insert(0, change)
        del self.rate_changes[12:]
        return change

    # ---------- views ----------
    @property
    def occupancy(self) -> float:
        return self.occupied / self.capacity

    @property
    def free(self) -> int:
        return self.capacity - self.occupied

    @property
    def status(self) -> str:
        o = self.occupancy
        if o >= 0.95:
            return "full"
        if o >= 0.85:
            return "busy"
        if o >= 0.60:
            return "moderate"
        return "open"

    def event(self) -> dict | None:
        for ev in EVENTS:
            if ev["zone_id"] == self.id and ev["active"]:
                return ev
        return None

    def effective_rate(self) -> int:
        ev = self.event()
        return int(self.rate * ev["multiplier"]) if ev else self.rate

    def brief(self) -> dict:
        return {
            "id": self.id,
            "name": {"fa": self.name_fa, "en": self.name_en},
            "district": self.district,
            "kind": self.kind,
            "capacity": self.capacity,
            "occupied": self.occupied,
            "free": self.free,
            "occupancy": round(self.occupancy, 3),
            "status": self.status,
            "rate": self.rate,
            "effective_rate": self.effective_rate(),
            "base_rate": self.base_rate,
            "x": self.x,
            "y": self.y,
            "event": self.event(),
            "sensor_health": round(self.sensors_online / self.sensors, 3),
        }

    def detail(self) -> dict:
        d = self.brief()
        at = now()
        d["history"] = self.history[-24:]
        d["rate_changes"] = self.rate_changes
        d["forecast"] = [
            {
                "hour": (at + timedelta(hours=i)).hour,
                "occupancy": round(
                    min(0.99, demand_curve((at.hour + i) % 24, at.weekday(), self.kind) * self.appeal), 3
                ),
            }
            for i in range(1, 9)
        ]
        d["revenue_today"] = round(self.revenue_today, 1)
        d["sensors"] = {"total": self.sensors, "online": self.sensors_online}
        return d


EVENTS: list[dict] = []
ZONES: dict[str, Zone] = {}
SESSIONS: dict[str, dict] = {}
WALLET = {"balance": 480000, "currency": "IRT"}
_started = time.time()


def _init_events():
    base = now()
    for e in EVENT_SEED:
        start = base + timedelta(minutes=e["starts_in_min"])
        end = start + timedelta(minutes=e["duration_min"])
        EVENTS.append(
            {
                "id": e["id"],
                "zone_id": e["zone_id"],
                "title": {"fa": e["title_fa"], "en": e["title_en"]},
                "start": start.isoformat(),
                "end": end.isoformat(),
                "multiplier": e["multiplier"],
                "active": False,
            }
        )


def boot():
    random.seed(1387)
    _init_events()
    for s in ZONE_SEED:
        z = Zone(s)
        ZONES[z.id] = z
    refresh_events()


def refresh_events():
    t = now()
    for ev in EVENTS:
        ev["active"] = datetime.fromisoformat(ev["start"]) <= t <= datetime.fromisoformat(ev["end"])
        ev["starts_in_min"] = int((datetime.fromisoformat(ev["start"]) - t).total_seconds() // 60)


_last_reprice = 0.0


def tick() -> dict:
    global _last_reprice
    at = now()
    refresh_events()
    changes = []
    for z in ZONES.values():
        z.tick(at)
    if time.time() - _last_reprice > 45:  # demo cadence for monthly SFpark adjustments
        _last_reprice = time.time()
        for z in ZONES.values():
            c = z.reprice(at)
            if c:
                changes.append({"zone": z.id, **c})
    return {"t": at.isoformat(), "zones": [z.brief() for z in ZONES.values()], "rate_changes": changes}


def overview() -> dict:
    caps = sum(z.capacity for z in ZONES.values())
    occ = sum(z.occupied for z in ZONES.values())
    hours = [0.0] * 24
    counts = [0] * 24
    for z in ZONES.values():
        for h in z.history:
            hours[h["hour"]] += h["occupancy"]
            counts[h["hour"]] += 1
    curve = [
        {"hour": i, "occupancy": round(hours[i] / counts[i], 3) if counts[i] else 0.0} for i in range(24)
    ]
    avg_rate = sum(z.rate for z in ZONES.values()) / len(ZONES)
    sensors = sum(z.sensors for z in ZONES.values())
    online = sum(z.sensors_online for z in ZONES.values())
    return {
        "capacity": caps,
        "occupied": occ,
        "free": caps - occ,
        "occupancy": round(occ / caps, 3),
        "zones": len(ZONES),
        "avg_rate": int(avg_rate),
        "revenue_today": round(sum(z.revenue_today for z in ZONES.values()), 1),
        "sensor_health": round(online / sensors, 3),
        "sensors": {"total": sensors, "online": online},
        "search_time_saved_min": round(6.4 * (1 - occ / caps) + 3.1, 1),
        "co2_saved_kg": round(caps * 0.021 * (1.05 - occ / caps), 1),
        "curve": curve,
        "active_events": [e for e in EVENTS if e["active"]],
        "uptime_s": int(time.time() - _started),
        "updated_at": now().isoformat(),
    }


def start_session(zone_id: str, plate: str, minutes: int) -> dict:
    z = ZONES[zone_id]
    at = now()
    rate = z.effective_rate()
    cost = int(rate * minutes / 60)
    sid = "PK-" + uuid.uuid4().hex[:8].upper()
    s = {
        "id": sid,
        "zone_id": z.id,
        "zone_name": {"fa": z.name_fa, "en": z.name_en},
        "plate": plate,
        "minutes": minutes,
        "rate": rate,
        "cost": cost,
        "start": at.isoformat(),
        "end": (at + timedelta(minutes=minutes)).isoformat(),
        "status": "active",
    }
    WALLET["balance"] -= cost
    z.occupied = min(z.capacity, z.occupied + 1)
    SESSIONS[sid] = s
    return s


def stop_session(sid: str) -> dict:
    s = SESSIONS[sid]
    if s["status"] == "active":
        s["status"] = "finished"
        s["end"] = now().isoformat()
        z = ZONES.get(s["zone_id"])
        if z:
            z.occupied = max(0, z.occupied - 1)
    return s
