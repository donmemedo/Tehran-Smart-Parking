import pytest
from fastapi.testclient import TestClient

from app import engine, main, security


@pytest.fixture()
def client():
    for lim in (security.GENERAL, security.IDENTITY, security.WRITES):
        lim.reset()
    engine.ACCOUNTS.clear()
    engine.SESSIONS.clear()
    with TestClient(main.app, base_url="http://localhost") as c:
        yield c


def new_account(client) -> dict:
    r = client.post("/api/identity")
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def open_zone() -> str:
    return next(z.id for z in engine.ZONES.values() if z.free > 0)
