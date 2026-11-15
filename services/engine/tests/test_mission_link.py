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


def _consent_sentinel_state(payload):
    client, now, directory = _client()
    try:
        crew, ground = _login(client), _login(client, "flight_surgeon")
        assert client.post("/api/mission/messages", headers=crew, json=payload).status_code == 200
        now[0] += 2000
        return client.get("/api/mission/state", headers=ground).json()
    finally:
        directory.cleanup()


def test_withheld_behavioral_consent_blocks_free_text_and_nested_vitals_text():
    base = {"crew": "A", "profile": "iss", "consent": {"vitals": True, "behavioral": False}}
    state = _consent_sentinel_state({**base, "text": "SENTINEL-FREE-TEXT",
                                     "report": {"vitals": {"rest_hr": 70, "note": "SENTINEL-NESTED", "SENTINEL-KEY": 1}}})
    assert "SENTINEL" not in str(state["messages"])
    assert state["messages"][0]["report"] == {"vitals": {"rest_hr": 70}}


def test_free_text_is_delivered_when_behavioral_consent_is_given():
    state = _consent_sentinel_state({"crew": "A", "profile": "iss", "text": "SENTINEL-FREE-TEXT",
                                     "consent": {"vitals": True, "behavioral": True}})
    assert state["messages"][0]["text"] == "SENTINEL-FREE-TEXT"


def test_ground_replies_are_not_subject_to_crew_consent():
    client, now, directory = _client()
    try:
        crew, ground = _login(client), _login(client, "flight_surgeon")
        assert client.post("/api/mission/messages", headers=ground, json={"crew": "A", "text": "Reply text", "profile": "iss"}).status_code == 200
        now[0] += 2000
        assert client.get("/api/mission/state", headers=crew).json()["messages"][0]["text"] == "Reply text"
    finally:
        directory.cleanup()


def _idem_post(client, headers, key, **overrides):
    payload = {"crew": "A", "text": "Synthetic retry", "profile": "iss", **overrides}
    return client.post("/api/mission/messages", headers={**headers, "Idempotency-Key": key}, json=payload)


def test_idempotent_retry_returns_same_message_and_inserts_no_second_row():
    client, now, directory = _client()
    try:
        crew, ground = _login(client), _login(client, "flight_surgeon")
        first = _idem_post(client, crew, "k1")
        now[0] += 5
        second = _idem_post(client, crew, "k1")
        assert first.status_code == second.status_code == 200
        assert first.json() == second.json()
        now[0] += 2000
        assert len(client.get("/api/mission/state", headers=ground).json()["messages"]) == 1
        # Without the header every post is a new message.
        plain = {"crew": "A", "text": "Synthetic retry", "profile": "iss"}
        assert client.post("/api/mission/messages", headers=crew, json=plain).json()["id"] != \
            client.post("/api/mission/messages", headers=crew, json=plain).json()["id"]
    finally:
        directory.cleanup()


def test_idempotency_key_reused_with_different_payload_conflicts_and_is_sender_scoped():
    client, _, directory = _client()
    try:
        a, b = _login(client), _login(client, "crew", "B")
        first = _idem_post(client, a, "k1")
        assert _idem_post(client, a, "k1", text="Different synthetic text").status_code == 409
        # Another sender may use the same key value independently.
        other = _idem_post(client, b, "k1", crew="B")
        assert other.status_code == 200 and other.json()["id"] != first.json()["id"]
    finally:
        directory.cleanup()


def test_database_created_before_idempotency_column_is_migrated():
    import sqlite3

    from tether_engine.api.mission_link import create_router
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "old.sqlite"
        old = sqlite3.connect(path)
        old.execute("CREATE TABLE messages(id TEXT PRIMARY KEY,crew TEXT,direction TEXT,text TEXT,report TEXT,consent TEXT,profile TEXT,sent REAL,arrival REAL)")
        old.commit(); old.close()
        app = FastAPI()
        app.include_router(create_router(path, clock=lambda: 1000.0))
        client = TestClient(app)
        crew = _login(client)
        assert _idem_post(client, crew, "k1").json()["id"] == _idem_post(client, crew, "k1").json()["id"]


def test_symptom_note_is_withheld_when_behavioral_consent_is_off():
    report = {"vitals": {"rest_hr": 70}, "symptoms": {"cough": 2, "note": "SENTINEL-SYMPTOM-NOTE"}}
    off = _consent_sentinel_state({"crew": "A", "profile": "iss", "text": "x", "report": report,
                                   "consent": {"vitals": True, "symptoms": True, "behavioral": False}})
    assert "SENTINEL" not in str(off["messages"])
    assert off["messages"][0]["report"] == {"vitals": {"rest_hr": 70}, "symptoms": {"cough": 2}}
    on = _consent_sentinel_state({"crew": "A", "profile": "iss", "text": "x", "report": report,
                                  "consent": {"vitals": True, "symptoms": True, "behavioral": True}})
    assert on["messages"][0]["report"]["symptoms"]["note"] == "SENTINEL-SYMPTOM-NOTE"
