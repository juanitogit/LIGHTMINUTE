"""Persistence and privacy tests for the synthetic mission link."""
import tempfile
from pathlib import Path

from fastapi import FastAPI
from fastapi.testclient import TestClient


def _client():
    from tether_engine.api.mission_link import create_router
    directory = tempfile.TemporaryDirectory()
    now = [1000.0]
    app = FastAPI()
    app.include_router(create_router(Path(directory.name) / "link.sqlite", clock=lambda: now[0]))
    return TestClient(app), now, directory


def _login(client, role="crew", crew="A"):
    r = client.post("/api/mission/session", json={"role": role, "crew": crew, "pin": "2026"})
    assert r.status_code == 200
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_mission_link_requires_session_and_enforces_crew_ownership():
    client, _, directory = _client()
    try:
        assert client.get("/api/mission/state").status_code == 401
        headers = _login(client)
        r = client.post("/api/mission/messages", headers=headers, json={"crew": "B", "text": "synthetic update", "profile": "moon"})
        assert r.status_code == 403
        assert client.post("/api/mission/session", json={"role":"crew","crew":"A","pin":"wrong"}).status_code == 401
    finally:
        directory.cleanup()


def test_ground_sees_only_delivered_consented_content_and_reply_is_delayed():
    client, now, directory = _client()
    try:
        crew, ground = _login(client), _login(client, "flight_surgeon")
        payload = {"crew":"A","text":"Synthetic check-in","profile":"moon","day":16,"report":{"vitals":{"rest_hr":68.5},"behavioral":"private synthetic text","symptoms":"synthetic symptom"},"consent":{"vitals":True,"symptoms":False,"behavioral":False}}
        sent = client.post("/api/mission/messages", headers=crew, json=payload)
        assert sent.status_code == 200
        assert client.get("/api/mission/state",headers=ground).json()["messages"] == []
        now[0] += 2
        rows = client.get("/api/mission/state",headers=ground).json()["messages"]
        assert len(rows) == 1
        assert rows[0]["report"] == {"vitals":{"rest_hr":68.5}}
        reply = client.post("/api/mission/messages",headers=ground,json={"crew":"A","text":"Synthetic acknowledgement","profile":"moon","day":16})
        assert reply.status_code == 200
        before = client.get("/api/mission/state",headers=crew).json()["messages"]
        assert len(before) == 1
        now[0] += 2
        assert len(client.get("/api/mission/state",headers=crew).json()["messages"]) == 2
        assert client.get("/api/mission/state",headers=_login(client,"crew","B")).json()["messages"] == []
    finally:
        directory.cleanup()


def test_protocol_runs_are_durable_and_do_not_leak_to_other_crew():
    client, _, directory = _client()
    try:
        a, b = _login(client), _login(client,"crew","B")
        r = client.post("/api/mission/protocol-runs",headers=a,json={"crew":"A","protocol_id":"fever_like_syndrome","steps":[{"step":1,"status":"done"}],"completed":False})
        assert r.status_code == 200
        assert len(client.get("/api/mission/state",headers=a).json()["protocol_runs"]) == 1
        assert client.get("/api/mission/state",headers=b).json()["protocol_runs"] == []
        assert client.get("/api/mission/state",headers=_login(client,"flight_surgeon")).json()["protocol_runs"] == []
        assert len(client.get("/api/mission/state",headers=_login(client,"medical_officer")).json()["protocol_runs"]) == 1
    finally:
        directory.cleanup()

def test_sessions_and_messages_survive_router_recreation_and_logout_revokes():
    from tether_engine.api.mission_link import create_router
    client, now, directory = _client()
    try:
        headers = _login(client)
        assert client.post("/api/mission/messages", headers=headers, json={"crew":"A","text":"Synthetic persisted report","profile":"iss"}).status_code == 200
        restarted_app = FastAPI()
        restarted_app.include_router(create_router(Path(directory.name)/"link.sqlite",clock=lambda:now[0]))
        restarted = TestClient(restarted_app)
        assert len(restarted.get("/api/mission/state",headers=headers).json()["messages"]) == 1
        assert restarted.delete("/api/mission/session",headers=headers).status_code == 200
        assert client.get("/api/mission/state",headers=headers).status_code == 401
    finally:
        directory.cleanup()
