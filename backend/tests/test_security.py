"""Security regression tests. Each one failed against the original MVP (see SECURITY_REPORT.md)."""
import threading

import pytest
from starlette.websockets import WebSocketDisconnect

from app import engine, main, security
from tests.conftest import new_account, open_zone


# --- identity and wallet (B1, B2) ---
def test_wallet_needs_a_token(client):
    assert client.get("/api/wallet").status_code == 401
    assert client.get("/api/wallet", headers={"Authorization": "Bearer nope"}).status_code == 401


def test_each_device_has_its_own_wallet(client):
    a, b = new_account(client), new_account(client)
    client.post("/api/sessions", json={"zone_id": open_zone(), "plate": "IR 12B345", "minutes": 60}, headers=a)
    assert client.get("/api/wallet", headers=a).json()["balance"] < engine.DEMO_BALANCE
    assert client.get("/api/wallet", headers=b).json()["balance"] == engine.DEMO_BALANCE


def test_free_topup_is_off_by_default(client, monkeypatch):
    h = new_account(client)
    assert client.post("/api/wallet/topup", json={"amount": 10000}, headers=h).status_code == 403
    monkeypatch.setattr(security, "DEMO_TOPUP", True)
    for _ in range(3):
        r = client.post("/api/wallet/topup", json={"amount": 5_000_000}, headers=h)
    assert r.json()["balance"] == engine.MAX_BALANCE  # demo mode is capped


# --- session privacy and ownership (B3, B4) ---
def test_sessions_are_private_and_owned(client):
    a, b = new_account(client), new_account(client)
    s = client.post("/api/sessions", json={"zone_id": open_zone(), "plate": "۱۲ب۳۴۵", "minutes": 30}, headers=a).json()
    assert len(s["id"]) == 19  # "PK-" + 16 url-safe chars, about 96 bits
    assert client.get("/api/sessions").status_code == 401
    assert client.get("/api/sessions", headers=b).json()["items"] == []
    assert client.post(f"/api/sessions/{s['id']}/stop", headers=b).status_code == 404
    assert client.get("/api/sessions", headers=a).json()["items"][0]["status"] == "active"


def test_stop_refunds_unused_time_once(client):
    h = new_account(client)
    s = client.post("/api/sessions", json={"zone_id": open_zone(), "plate": "AB-123", "minutes": 120}, headers=h).json()
    stopped = client.post(f"/api/sessions/{s['id']}/stop", headers=h).json()
    assert 0 < stopped["refund"] <= s["cost"]
    again = client.post(f"/api/sessions/{s['id']}/stop", headers=h).json()
    assert again["refund"] == stopped["refund"]
    balance = client.get("/api/wallet", headers=h).json()["balance"]
    assert balance == engine.DEMO_BALANCE - s["cost"] + stopped["refund"]


# --- business logic (B7, B8, B9) ---
def test_sessions_do_not_move_sensor_occupancy(client):
    zid = open_zone()
    before = engine.ZONES[zid].occupied
    client.post("/api/sessions", json={"zone_id": zid, "plate": "AB-123", "minutes": 15}, headers=new_account(client))
    assert engine.ZONES[zid].occupied == before


def test_active_session_cap(client):
    h = new_account(client)
    body = {"zone_id": open_zone(), "plate": "AB-123", "minutes": 15}
    codes = [client.post("/api/sessions", json=body, headers=h).status_code for _ in range(engine.MAX_ACTIVE_SESSIONS + 1)]
    assert codes[-1] == 409 and codes[:-1] == [200] * engine.MAX_ACTIVE_SESSIONS


def test_concurrent_payments_cannot_overdraw(client):
    h = new_account(client)
    zid = open_zone()
    cost = engine.session_cost(engine.ZONES[zid].effective_rate(), 480)
    token = h["Authorization"].split()[1]
    engine.ACCOUNTS[token]["balance"] = cost + cost // 2  # enough for exactly one
    codes = []

    def pay():
        codes.append(client.post("/api/sessions", json={"zone_id": zid, "plate": "AB-123", "minutes": 480}, headers=h).status_code)

    threads = [threading.Thread(target=pay) for _ in range(8)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()
    assert codes.count(200) == 1
    assert engine.ACCOUNTS[token]["balance"] >= 0


def test_account_store_is_bounded(client, monkeypatch):
    monkeypatch.setattr(engine, "MAX_ACCOUNTS", 5)
    for _ in range(12):
        engine.create_account()
    assert len(engine.ACCOUNTS) == 5


# --- input validation (B11) ---
@pytest.mark.parametrize("plate", ["<b>x</b>", "a", "x" * 17, "'; --", "‮RTL"])
def test_bad_plates_are_rejected(client, plate):
    r = client.post("/api/sessions", json={"zone_id": open_zone(), "plate": plate, "minutes": 30}, headers=new_account(client))
    assert r.status_code == 422


def test_unknown_fields_and_long_ids_are_rejected(client):
    h = new_account(client)
    assert client.post("/api/sessions", json={"zone_id": "NRM", "plate": "AB-123", "minutes": 30, "cost": 0}, headers=h).status_code == 422
    assert client.get("/api/zones/" + "A" * 5000).status_code == 422
    assert client.get("/api/zones", params={"q": "x" * 41}).status_code == 422


# --- CORS (B5) ---
def test_cors_allows_only_the_app_origin(client):
    pre = {"Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "authorization"}
    bad = client.options("/api/sessions", headers={"Origin": "https://other.example", **pre})
    assert "access-control-allow-origin" not in bad.headers
    good = client.options("/api/sessions", headers={"Origin": security.ALLOWED_ORIGINS[0], **pre})
    assert good.headers["access-control-allow-origin"] == security.ALLOWED_ORIGINS[0]


def test_open_data_is_readable_from_any_origin(client):
    r = client.get("/api/open-data/zones.geojson", headers={"Origin": "https://other.example"})
    assert r.headers["access-control-allow-origin"] == "*"


# --- rate limits and size limits (B6) ---
def test_general_rate_limit_returns_429_with_retry_after(client, monkeypatch):
    monkeypatch.setattr(security, "GENERAL", security.RateLimiter(per_min=60, burst=5))
    codes = [client.get("/api/zones").status_code for _ in range(7)]
    assert codes[:5] == [200] * 5 and codes[-1] == 429
    assert int(client.get("/api/zones").headers["retry-after"]) >= 1


def test_identity_creation_is_limited(client):
    codes = [client.post("/api/identity").status_code for _ in range(8)]
    assert 429 in codes


def test_large_or_chunked_bodies_are_refused(client):
    h = new_account(client)
    big = client.post("/api/sessions", content=b"{" + b" " * 5000 + b"}", headers={**h, "Content-Type": "application/json"})
    assert big.status_code == 413

    def gen():
        yield b"{}"

    assert client.post("/api/sessions", content=gen(), headers=h).status_code == 411


def test_limiter_memory_is_bounded():
    lim = security.RateLimiter(per_min=60, burst=1, max_keys=100)
    for i in range(1000):
        lim.hit(f"10.0.{i // 250}.{i % 250}")
    assert len(lim.buckets) <= 100


def test_ipv6_clients_are_grouped_by_64():
    a = security.client_key({"client": ("2001:db8:1:2::1", 1)})
    b = security.client_key({"client": ("2001:db8:1:2:ffff::9", 1)})
    assert a == b == "2001:db8:1:2::/64"
    assert security.client_key({"client": ("::ffff:10.0.0.1", 1)}) == "10.0.0.1"


# --- websocket (B6, B10) ---
def test_websocket_sends_a_frame_and_closes_on_client_messages(client):
    with client.websocket_connect("ws://localhost/ws/live") as ws:
        assert "zones" in ws.receive_json()
        ws.send_text("hello")
        with pytest.raises(WebSocketDisconnect):
            ws.receive_text()
    assert not main.clients


def test_websocket_connections_per_client_are_capped(client, monkeypatch):
    monkeypatch.setattr(security, "MAX_WS_PER_CLIENT", 2)
    with client.websocket_connect("ws://localhost/ws/live") as a, client.websocket_connect("ws://localhost/ws/live") as b:
        a.receive_json(), b.receive_json()
        with pytest.raises(WebSocketDisconnect):
            with client.websocket_connect("ws://localhost/ws/live") as c:
                c.receive_json()
    assert main._ws_per_client == {}


# --- headers and hosts (B14) ---
def test_security_headers_on_api(client):
    h = client.get("/api/zones").headers
    assert h["x-content-type-options"] == "nosniff"
    assert h["cache-control"] == "no-store"
    assert "frame-ancestors 'none'" in h["content-security-policy"]


def test_unknown_host_is_refused(client):
    assert client.get("/api/health", headers={"Host": "evil.example"}).status_code == 400


def test_health_is_cheap(client):
    assert set(client.get("/api/health").json()) == {"status", "zones", "uptime_s"}
