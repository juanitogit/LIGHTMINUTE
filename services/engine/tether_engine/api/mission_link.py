"""Local, persistent synthetic mission messaging. Demo identity is not production auth.

Consent policy (enforced before anything is written):
- A report section is stored only if its consent flag is true.
- When consent.behavioral is false, every consented section (vitals, symptoms) is
  reduced to numeric values under simple keys, and crew free text is withheld, so
  narrative cannot travel under a consented category. When it is true, section
  content is kept as supplied.

Idempotency: POST /messages honors an optional Idempotency-Key header, scoped to the
sender (role + session crew). Same key + same payload returns the stored message;
same key + different payload is HTTP 409. Without the header nothing changes.
"""
from __future__ import annotations

import hashlib
import json
import math
import os
import re
import secrets
import sqlite3
import tempfile
import time
from collections.abc import Callable
from contextlib import contextmanager
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from ..ground.delay import PROFILES


class Login(BaseModel):
    role: Literal["crew", "medical_officer", "flight_surgeon"] = "crew"
    crew: Literal["A", "B", "C", "D"] = "A"
    pin: str = Field(max_length=100)


class Consent(BaseModel):
    vitals: bool = True
    symptoms: bool = False
    behavioral: bool = False


class Message(BaseModel):
    crew: Literal["A", "B", "C", "D"]
    text: str = Field(min_length=1, max_length=400)
    profile: Literal["iss", "moon", "mars"] = "mars"
    day: int = Field(default=1, ge=1, le=400)
    report: dict = Field(default_factory=dict)
    consent: Consent = Field(default_factory=Consent)


WITHHELD_TEXT = "[Message text withheld: behavioral-text consent is off]"
_VITAL_KEY = re.compile(r"^[a-z][a-z0-9_]{0,39}$")


def numeric_only(vitals) -> dict:
    """Vitals are numbers. Strings, nested objects and free-form keys could smuggle
    withheld narrative past the category filter, so they are dropped."""
    if not isinstance(vitals, dict):
        return {}
    return {k: v for k, v in vitals.items()
            if isinstance(k, str) and _VITAL_KEY.match(k)
            and isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)}


class ProtocolRun(BaseModel):
    crew: Literal["A", "B", "C", "D"]
    protocol_id: str = Field(min_length=1, max_length=100)
    steps: list[dict] = Field(default_factory=list, max_length=100)
    completed: bool = False


def create_router(path: Path | None = None, *, clock: Callable[[], float] = time.time) -> APIRouter:
    database = path or Path(os.environ.get("LIGHTMINUTE_MISSION_DB", str(Path(tempfile.gettempdir()) / "lightminute-mission.sqlite")))
    database.parent.mkdir(parents=True, exist_ok=True)
    router = APIRouter(prefix="/api/mission", tags=["Synthetic mission workspace"])

    @contextmanager
    def connect():
        conn = sqlite3.connect(database, timeout=10)
        conn.row_factory = sqlite3.Row
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,role TEXT,crew TEXT,expires REAL);
            CREATE TABLE IF NOT EXISTS messages(id TEXT PRIMARY KEY,crew TEXT,direction TEXT,text TEXT,report TEXT,consent TEXT,profile TEXT,sent REAL,arrival REAL,idem_scope TEXT,idem_hash TEXT);
            CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,crew TEXT,protocol TEXT,steps TEXT,completed INTEGER,created REAL);
        """)
        # Databases created before idempotency support lack these columns.
        existing = {row["name"] for row in conn.execute("PRAGMA table_info(messages)")}
        for column in ("idem_scope", "idem_hash"):
            if column not in existing:
                try:
                    conn.execute(f"ALTER TABLE messages ADD COLUMN {column} TEXT")
                except sqlite3.OperationalError:  # another connection migrated first
                    pass
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS messages_idem ON messages(idem_scope) WHERE idem_scope IS NOT NULL")
        try:
            with conn:
                yield conn
        finally:
            conn.close()

    def identity(authorization: str | None):
        token = authorization.removeprefix("Bearer ") if authorization and authorization.startswith("Bearer ") else ""
        with connect() as conn:
            session = conn.execute("SELECT role,crew FROM sessions WHERE token=? AND expires>?", (token, clock())).fetchone()
        if session is None:
            raise HTTPException(401, "Start a demo session first")
        return dict(session)

    def can_edit(session, crew):
        if session["role"] == "crew" and session["crew"] != crew:
            raise HTTPException(403, "Crew members can access only their own records")

    @router.post("/session")
    def login(body: Login):
        if not secrets.compare_digest(body.pin, os.environ.get("LIGHTMINUTE_DEMO_PIN", "2026")):
            raise HTTPException(401, "Incorrect demo PIN")
        token = secrets.token_urlsafe(32)
        with connect() as conn:
            conn.execute("INSERT INTO sessions VALUES(?,?,?,?)", (token, body.role, body.crew, clock() + 28800))
        return {"token": token, "role": body.role, "crew": body.crew, "synthetic": True, "demo_only": True,
                "notice": "Shared demo PIN; role selection is not a real identity check."}

    @router.delete("/session")
    def logout(authorization: str | None = Header(default=None)):
        identity(authorization)
        with connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token=?", (authorization.removeprefix("Bearer "),))
        return {"ok": True}

    @router.get("/state")
    def state(authorization: str | None = Header(default=None)):
        session = identity(authorization)
        now = clock()
        with connect() as conn:
            raw = conn.execute("SELECT * FROM messages ORDER BY sent DESC").fetchall()
            runs = conn.execute("SELECT * FROM runs ORDER BY created DESC").fetchall()
        visible = []
        for row in raw:
            r = dict(row)
            if session["role"] == "crew" and r["crew"] != session["crew"]:
                continue
            own_direction = "earth" if session["role"] == "flight_surgeon" else "ground"
            if r["direction"] != own_direction and r["arrival"] > now:
                continue
            r["report"] = json.loads(r["report"])
            r["consent"] = json.loads(r["consent"])
            r["remaining_s"] = max(0, r["arrival"] - now)
            r["delivered"] = r["arrival"] <= now
            visible.append(r)
        visible_runs = []
        if session["role"] != "flight_surgeon":
            for row in runs:
                r = dict(row)
                if session["role"] == "crew" and r["crew"] != session["crew"]:
                    continue
                r["steps"] = json.loads(r["steps"])
                visible_runs.append(r)
        return {"session": session, "server_time": now, "messages": visible, "protocol_runs": visible_runs,
                "synthetic": True, "demo_only": True, "delay_policy": "One-way delay from existing mission profiles. Mars position interpolated by demo mission day."}

    @router.post("/messages")
    def send(body: Message, authorization: str | None = Header(default=None),
             idempotency_key: str | None = Header(default=None)):
        session = identity(authorization)
        can_edit(session, body.crew)
        key = (idempotency_key or "").strip()
        if len(key) > 200:
            raise HTTPException(422, "Idempotency-Key is too long")
        scope = payload_hash = None
        if key:
            # Scope = sender identity + key, so one sender's key cannot collide with another's.
            scope = hashlib.sha256(json.dumps([session["role"], session["crew"], key]).encode()).hexdigest()
            payload_hash = hashlib.sha256(json.dumps(body.model_dump(), sort_keys=True, default=str).encode()).hexdigest()

        def replay():
            with connect() as conn:
                row = conn.execute("SELECT id,sent,arrival,idem_hash FROM messages WHERE idem_scope=?", (scope,)).fetchone()
            if row is None:
                return None
            if row["idem_hash"] != payload_hash:
                raise HTTPException(409, "Idempotency-Key was already used with a different message")
            return {"id": row["id"], "arrival": row["arrival"], "one_way_s": row["arrival"] - row["sent"], "synthetic": True}

        if scope and (stored := replay()) is not None:
            return stored
        consent = body.consent.model_dump()
        # Do not persist withheld fields: consent is enforced before writing, not merely in the UI.
        report = {name: body.report[name] for name in ("vitals", "symptoms", "behavioral") if consent[name] and name in body.report}
        if not consent["behavioral"]:
            # Free-text notes must not travel under a consented category.
            report = {name: numeric_only(section) for name, section in report.items()}
        if len(json.dumps(report)) > 64000:
            raise HTTPException(422, "Synthetic report is too large")
        lo, hi = PROFILES[body.profile]
        delay = lo + (hi - lo) * min(1.0, (body.day - 1) / 23)
        now, identifier = clock(), secrets.token_hex(16)
        direction = "earth" if session["role"] == "flight_surgeon" else "ground"
        text = body.text.strip()
        # Crew free text can carry behavioral content the server cannot classify, so it
        # travels under the behavioral tier. Ground replies are not crew health data.
        if direction == "ground" and not consent["behavioral"]:
            text = WITHHELD_TEXT
        try:
            with connect() as conn:
                conn.execute("INSERT INTO messages(id,crew,direction,text,report,consent,profile,sent,arrival,idem_scope,idem_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
                             (identifier, body.crew, direction, text, json.dumps(report), json.dumps(consent), body.profile, now, now + delay, scope, payload_hash))
        except sqlite3.IntegrityError:
            # A concurrent request with the same key won the unique index; return its record.
            if scope and (stored := replay()) is not None:
                return stored
            raise
        return {"id": identifier, "arrival": now + delay, "one_way_s": delay, "synthetic": True}

    @router.post("/protocol-runs")
    def save_run(body: ProtocolRun, authorization: str | None = Header(default=None)):
        session = identity(authorization)
        if session["role"] == "flight_surgeon":
            raise HTTPException(403, "Ground cannot create onboard runs")
        can_edit(session, body.crew)
        if len(json.dumps(body.steps)) > 64000:
            raise HTTPException(422, "Run is too large")
        identifier = secrets.token_hex(16)
        with connect() as conn:
            conn.execute("INSERT INTO runs VALUES(?,?,?,?,?,?)", (identifier, body.crew, body.protocol_id, json.dumps(body.steps), body.completed, clock()))
        return {"id": identifier, "synthetic": True}

    return router


router = create_router()
