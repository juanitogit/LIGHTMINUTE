"""End-to-end scenario runner: synthetic readings -> engine -> demo JSON.

One stable entry point for every other agent:

    run_scenario(name, seed=0, days=24, variant="strong") -> dict

The returned dict is the shape frozen in `docs/DEMO_DATA_CONTRACT.md` (plus a
few additive keys announced in `handoff/a1.md`). Numbers and urgency come from
the deterministic engine here; an LLM may only rewrite the card text later.

The pipeline never reads `labels.json`: ground truth is written beside the
readings and is for validation only.
"""
from __future__ import annotations

import json
from pathlib import Path

from .bayes import BaselineModel, SyndromeScore
from .crew.attribution import PersistentAttribution
from .ground.delay import PROFILES, triage_routing
from .lenses import three_lens
from .protocols.templates import syndrome_level, template_card
from .protocols.thresholds import load_thresholds
from .qc.basic import clean_readings, is_stuck, log_drops
from .simulate.scenarios import (
    DEFAULT_DAYS,
    DEFAULT_VARIANT,
    INDICATORS,
    generate,
    prior_stats,
)

PROJECT_ROOT = Path(__file__).resolve().parents[3]
KB_DIR = PROJECT_ROOT / "kb"
SYNDROME_ID = "strain_infection_like"
MIN_DAYS_FOR_PERSONAL = 7      # same rule as lenses._personal


def syndrome_signs(kb_dir: Path = KB_DIR, syndrome_id: str = SYNDROME_ID) -> dict[str, int]:
    """Signed syndrome vector from the KB (demo-parameter, never hard-coded)."""
    spec = json.loads((kb_dir / "syndromes.json").read_text())
    return spec[syndrome_id]["signs"]


def _prior_hr_facts() -> dict:
    mean, sd = prior_stats("rest_hr")
    return {"value": round(mean, 2), "baseline": round(mean, 2),
            "ci95": [round(mean - 1.96 * sd, 2), round(mean + 1.96 * sd, 2)],
            "z": 0.0, "n_seen": 0, "prior": True}


def _decision_surprise(sur: dict) -> dict:
    """Retain pre-change evidence when adaptation would hide a pending shift."""
    if (sur.get("change_pending") and sur.get("pending_p_two_sided") is not None
            and sur["pending_p_two_sided"] < sur["p_two_sided"]):
        return {**sur, "z": sur["pending_z"], "p_two_sided": sur["pending_p_two_sided"]}
    return sur


def run_scenario(name: str, seed: int = 0, days: int = DEFAULT_DAYS,
                 variant: str = DEFAULT_VARIANT) -> dict:
    """Simulate a scenario and run it through the real engine, day by day."""
    th = load_thresholds(str(KB_DIR / "thresholds.json"))
    signs = syndrome_signs()
    sc = generate(name, variant=variant, seed=seed, days=days)
    one_way_s = PROFILES[sc["delay_profile"]][1]     # worst-case light-time

    models: dict[str, dict[str, BaselineModel]] = {
        cid: {n: BaselineModel(*prior_stats(n)) for n in INDICATORS} for cid in sc["crew"]
    }
    syndromes = {cid: SyndromeScore([signs[s] for s in signs]) for cid in sc["crew"]}
    last_hr: dict[str, dict] = {}
    last_hr_day: dict[str, int] = {}
    # Per-crew daily history (None = missing) for the stuck-value rule (FI-11).
    history: dict[str, dict[str, list[float | None]]] = {
        cid: {n: [] for n in INDICATORS} for cid in sc["crew"]
    }
    attribution = PersistentAttribution(required_days=2)

    out_days = []
    for day in sc["days"]:
        zdirs: dict[str, float] = {}
        crew_out: dict[str, dict] = {}
        stuck_today: dict[str, list[str]] = {}
        dropped = total = 0

        for cid, cday in day["crew"].items():
            cleaned, issues = clean_readings(cday.get("indicators"))
            if issues:
                log_drops(issues, day["day"], cid)
            dropped += len(issues)
            total += len(cday.get("indicators") or {})
            for n in INDICATORS:
                history[cid][n].append(cleaned.get(n))

            ind: dict[str, dict] = {}
            decision_zs: dict[str, float] = {}
            for n in INDICATORS:
                if n not in cleaned:
                    continue
                model = models[cid][n]
                sur = model.surprise(cleaned[n])          # judge before learning
                decision_sur = _decision_surprise(sur)
                decision_zs[n] = round(float(decision_sur["z"]), 2)
                ind[n] = {
                    "value": round(float(cleaned[n]), 2),
                    "baseline": round(float(sur["baseline"]), 2),
                    "ci95": [round(float(sur["ci95"][0]), 2),
                             round(float(sur["ci95"][1]), 2)],
                    "z": round(float(sur["z"]), 2),
                    "p": float(sur["p_two_sided"]),
                    "n_seen": sur["n_seen"],
                    "change_pending": sur["change_pending"],
                    "unresolved_change": sur["unresolved_change"],
                    "pending_z": sur["pending_z"],
                    "pending_p": sur["pending_p_two_sided"],
                    "lens": three_lens(th[n], cleaned[n], decision_sur),
                    "hrp_risk": th[n].hrp_risk,
                    "hazard": th[n].hazard,
                    "unit": th[n].unit,
                }
                model.robust_update(cleaned[n], observed_at=float(day["day"]) * 86400)

            # Stuck-value flag (FI-11): informational only. It is written to the
            # indicator and day QC so the console can show it; it does not touch
            # `level`, the syndrome score or the baseline update.
            stuck = [n for n in INDICATORS if is_stuck(history[cid][n])]
            if stuck:
                stuck_today[cid] = stuck

            # A missing indicator contributes no evidence (z = 0), it does not
            # crash the fusion or silently reuse yesterday's number.
            zvec = [decision_zs.get(s, 0.0) for s in signs]
            sy = syndromes[cid].score(zvec)
            syndromes[cid].observe(zvec)
            mature = ind.get("rest_hr", {}).get("n_seen", 0) >= MIN_DAYS_FOR_PERSONAL
            level = syndrome_level(sy["z_dir"]) if mature else "info"
            if mature:
                zdirs[cid] = sy["z_dir"]

            # FI-10: sample freshness. A dropout today must never be presented as
            # today's reading. We keep the last value only together with its age.
            today_hr = ind.get("rest_hr")
            if today_hr is not None:
                last_hr[cid], last_hr_day[cid] = today_hr, day["day"]
                hr_age: int | None = 0
                hr = today_hr
            elif cid in last_hr:
                hr_age = day["day"] - last_hr_day[cid]
                hr = last_hr[cid]
            else:
                hr_age = None                       # no reading yet in this scenario
                hr = _prior_hr_facts()
            numbers = {"hr_now": hr["value"], "hr_lo": hr["ci95"][0],
                       "hr_hi": hr["ci95"][1], "z_dir": round(float(sy["z_dir"]), 1)}
            if hr_age is not None:
                numbers["hr_age_days"] = hr_age
            facts = {
                "crew": cid, "level": level,
                "confidence": "low" if not mature else "moderate",
                "numbers": numbers,
            }
            crew_out[cid] = {
                "level": level,
                "syndrome_z": round(float(sy["z_dir"]), 2),
                "learning": not mature,
                "indicators": ind,
                "rest_hr_age_days": hr_age,
                "card": template_card(facts),
                "card_source": "template",
                "routing": triage_routing(level, one_way_s),
            }
            if hr_age != 0:
                # Stale or prior value, kept with its age; never copied into `indicators`.
                crew_out[cid]["last_rest_hr"] = hr

        qc = {"dropped": dropped, "total": total}
        if stuck_today:
            qc["stuck"] = stuck_today
        crew_attribution = attribution.step(zdirs)
        for cid, entry in crew_out.items():
            # Construct cards after attribution so shared patterns are available.
            facts = {"crew": cid, "level": entry["level"],
                     "confidence": "low" if entry["learning"] else "moderate",
                     "numbers": {"hr_now": 0, "hr_lo": 0, "hr_hi": 0, "z_dir": entry["syndrome_z"]},
                     "indicators": entry["indicators"], "attribution": crew_attribution}
            co2 = entry["indicators"].get("co2_ppm", {})
            if (crew_attribution["mode"] == "shared" and cid in crew_attribution["affected"]
                    and str(co2.get("lens", {}).get("personal", "")).startswith("unusual")):
                entry["card"] = template_card(facts)
        out_days.append({
            "day": day["day"],
            "context": day["context"],
            "hazards": day["hazards"],
            "qc": qc,
            "crew": crew_out,
            "attribution": crew_attribution,
        })

    return {
        "synthetic": True,
        "note": "Synthetic data. Not a medical device.",
        "scenario": name,
        "title": sc["title"],
        "description": sc["description"],
        "variant": variant,
        "seed": seed,
        "delay_profile": sc["delay_profile"],
        "onset_day": sc["onset_day"],
        "crew": sc["crew"],
        "indicators": list(INDICATORS),
        "days": out_days,
    }
