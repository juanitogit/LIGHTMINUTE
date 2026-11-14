"""Scenario data access for the LLM layer and the API.

Three sources, in this order (first that works wins):
 1. `tether_engine.pipeline.run_scenario(name, seed=0, days=24)`  (A1, real engine)
 2. `apps/crew-tablet/public/data/scenario-<name>.json`           (A1, static export)
 3. `apps/crew-tablet/public/demo-data.json`                      (scaffold, degraded)

Everything here is read-only and side-effect free so the API and the card
service see exactly the same numbers. Data is SYNTHETIC by contract.
"""
from __future__ import annotations

import json
import logging
from functools import lru_cache
from pathlib import Path

SCENARIO_NAMES = ("cmo_fever", "sep_sleep_loss", "co2_creep")
INDICATORS = ("rest_hr", "temp_c", "sleep_h", "pvt_ms")
LEVELS = ("info", "watch", "act", "escalate")


def repo_root() -> Path:
    """project/ root, derived from this file (services/engine/tether_engine/llm/)."""
    return Path(__file__).resolve().parents[4]


def public_dir() -> Path:
    return repo_root() / "apps" / "crew-tablet" / "public"


def data_dir() -> Path:
    return public_dir() / "data"


class ScenarioNotFound(LookupError):
    """Unknown scenario / crew / day. The API maps this to 404."""


def _read_json(path: Path) -> dict | None:
    try:
        with open(path, encoding="utf-8") as fh:
            return json.load(fh)
    except (OSError, ValueError):
        return None


@lru_cache(maxsize=32)
def _try_engine(name: str, seed: int, days: int) -> dict:
    """Cache successful engine output only; raised errors are never cached."""
    from ..pipeline import run_scenario
    doc = run_scenario(name, seed=seed, days=days)
    if not isinstance(doc, dict) or not doc.get("days"):
        raise ValueError("empty engine scenario")
    return doc


def _load(name: str, seed: int, days: int) -> dict:
    engine_error = None
    try:
        doc = _try_engine(name, seed, days)
        if doc is None:
            raise ValueError("empty engine scenario")
    except Exception as exc:
        # Do not include exception messages: providers or filesystem failures can
        # contain secrets. The class and source are enough to diagnose degradation.
        engine_error = type(exc).__name__
        logging.getLogger(__name__).warning("Scenario engine unavailable (%s)", engine_error)
        doc = None
    source = "engine"
    if doc is None:
        for path, candidate_source in (
            (data_dir() / f"scenario-{name}.json", "scenario-file"),
            (public_dir() / "demo-data.json", "demo-data"),
        ):
            candidate = _read_json(path)
            if _matching_scenario(candidate, name):
                doc, source = candidate, candidate_source
                break
    if not _matching_scenario(doc, name):
        raise ScenarioNotFound(f"no matching data source available for {name}")
    out = dict(doc)
    out.setdefault("synthetic", True)
    out["name"] = name
    out["source"] = source
    out["degraded"] = source != "engine"
    out["engine_error"] = engine_error
    out["requested_parameters"] = {"seed": seed, "days": days}
    out["effective_parameters"] = {
        "seed": doc.get("seed"), "days": len(doc.get("days") or []),
        "variant": doc.get("variant")}
    out.setdefault("indicators", list(INDICATORS))
    return out


def _matching_scenario(doc, name: str) -> bool:
    """A syntactically valid JSON file is not necessarily a scenario bundle."""
    return (isinstance(doc, dict) and doc.get("scenario", doc.get("name")) == name
            and isinstance(doc.get("days"), list) and bool(doc["days"])
            and all(isinstance(day, dict) for day in doc["days"]))


def load_scenario(name: str, seed: int = 0, days: int = 24) -> dict:
    """Normalised scenario document: {name, source, synthetic, indicators, days[]}."""
    if not isinstance(name, str) or not name.strip():
        raise ScenarioNotFound("missing scenario name")
    name = name.strip()
    if name not in SCENARIO_NAMES:
        raise ScenarioNotFound(f"unknown scenario: {name}")
    return _load(name, int(seed), int(days))


def find_day(doc: dict, day: int) -> dict:
    for d in doc.get("days") or []:
        if d.get("day") == day:
            return d
    raise ScenarioNotFound(f"day {day} not in scenario")


def find_crew(doc: dict, crew: str, day: int) -> dict:
    entry = (find_day(doc, day).get("crew") or {}).get(crew)
    if not isinstance(entry, dict):
        raise ScenarioNotFound(f"crew member {crew} not found on day {day}")
    return entry


def list_scenarios() -> list[dict]:
    """Index for `GET /api/scenarios`; works before A1's files exist."""
    index = _read_json(data_dir() / "scenario-index.json")
    if isinstance(index, dict) and isinstance(index.get("scenarios"), list):
        return index["scenarios"]
    if isinstance(index, list):
        return index
    out = []
    for name in SCENARIO_NAMES:
        doc = _read_json(data_dir() / f"scenario-{name}.json")
        meta = (doc or {}).get("meta") or {}
        out.append({"name": name, "title": meta.get("title", name),
                    "available": doc is not None,
                    "source": "scenario-file" if doc is not None else "demo-data"})
    return out


def _band(entry: dict) -> dict:
    """Resting-HR band, the number the deterministic template always quotes."""
    ind = entry.get("indicators") or {}
    hr = ind.get("rest_hr") or {}
    if hr.get("value") is not None:
        return hr
    return {}


def engine_facts(entry: dict, crew: str, day: int) -> dict:
    """EngineFacts for the card layer: ONLY numbers the engine already produced."""
    ind = entry.get("indicators") or {}
    numbers: dict[str, float] = {}

    def put(key: str, value) -> None:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            numbers[key] = round(float(value), 2)

    band = _band(entry)
    ci = band.get("ci95") or [None, None]
    put("hr_now", band.get("value"))
    put("hr_lo", ci[0] if len(ci) > 0 else None)
    put("hr_hi", ci[1] if len(ci) > 1 else None)
    put("hr_base", band.get("baseline"))
    put("z_hr", band.get("z"))
    for short, name in (("temp", "temp_c"), ("sleep", "sleep_h"), ("pvt", "pvt_ms")):
        cur = ind.get(name) or {}
        put(f"{short}_now", cur.get("value"))
        put(f"{short}_base", cur.get("baseline"))
        put(f"z_{short}", cur.get("z"))
    z_dir = entry.get("syndrome_z")
    put("z_dir", z_dir)
    put("syndrome_z", z_dir)

    level = entry.get("level")
    if level not in LEVELS:
        level = "info"
    confidence_inputs = entry.get("confidence_inputs") or {}
    n_seen = confidence_inputs.get("n_seen", band.get("n_seen"))
    n_seen = int(n_seen) if isinstance(n_seen, (int, float)) else 0
    confidence = entry.get("confidence") or ("low" if n_seen < 7 else "moderate")

    return {
        "crew": crew,
        "day": day,
        "level": level,
        "confidence": confidence,
        "numbers": numbers,
        "indicators": {
            name: {"value": (spec or {}).get("value"), "baseline": (spec or {}).get("baseline"),
                   "ci95": (spec or {}).get("ci95"), "z": (spec or {}).get("z"),
                   "n_seen": (spec or {}).get("n_seen"), "unit": (spec or {}).get("unit"),
                   "hrp_risk": (spec or {}).get("hrp_risk"), "hazard": (spec or {}).get("hazard"),
                   "lens": (spec or {}).get("lens")}
            for name, spec in ind.items()
        },
        "syndrome_z": entry.get("syndrome_z"),
        "learning": bool(entry.get("learning", n_seen < 7)),
        # Old static exports have no df. Unknown is preferable to fabricating
        # n-1: this model's predictive df is 2*alpha with forgetting.
        "confidence_inputs": {"n_seen": n_seen, "df": confidence_inputs.get("df")},
        "attribution": entry.get("attribution") or {},
    }
