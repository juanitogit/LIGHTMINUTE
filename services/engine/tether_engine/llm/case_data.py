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


def _try_engine(name: str, seed: int, days: int) -> dict | None:
    """A1's pipeline, if it is importable and actually returns a scenario."""
    try:  # local import: the module may not exist yet while A1 is building it
        from ..pipeline import run_scenario  # type: ignore[attr-defined]
    except Exception:
        return None
    try:
        try:
            doc = run_scenario(name, seed=seed, days=days)
        except TypeError:  # older signature without kwargs
            doc = run_scenario(name)
    except Exception:
        return None
    return doc if isinstance(doc, dict) and doc.get("days") else None


@lru_cache(maxsize=32)
def _load(name: str, seed: int, days: int) -> dict:
    doc = _try_engine(name, seed, days)
    source = "engine"
    if doc is None:
        doc, source = _read_json(data_dir() / f"scenario-{name}.json"), "scenario-file"
    if doc is None:
        if name not in SCENARIO_NAMES:
            raise ScenarioNotFound(f"unknown scenario: {name}")
        doc, source = _read_json(public_dir() / "demo-data.json"), "demo-data"
    if doc is None:
        raise ScenarioNotFound(f"no data source available for {name}")
    out = dict(doc)
    out.setdefault("synthetic", True)
    out["name"] = name
    out["source"] = source
    out["degraded"] = source == "demo-data"
    out.setdefault("indicators", list(INDICATORS))
    return out


def load_scenario(name: str, seed: int = 0, days: int = 24) -> dict:
    """Normalised scenario document: {name, source, synthetic, indicators, days[]}."""
    if not isinstance(name, str) or not name.strip():
        raise ScenarioNotFound("missing scenario name")
    return _load(name.strip(), int(seed), int(days))


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
    for name in INDICATORS:  # tolerate scenario files without rest_hr
        cand = ind.get(name) or {}
        if cand.get("value") is not None and cand.get("ci95"):
            return cand
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
    n_seen = band.get("n_seen")
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
        "confidence_inputs": {"n_seen": n_seen, "df": max(n_seen - 1, 0)},
    }
