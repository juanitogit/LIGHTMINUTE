"""Scripted synthetic crews for the three demo scenarios.

Everything produced here is SYNTHETIC and must be labelled as such. Ground truth
(onset day, affected crew, expected level) lives in a separate `labels.json`
sidecar: the engine must never read it. Validation compares the output with the
labels, so leaking labels into the pipeline would invalidate every number.

Determinism: `generate(name, variant, seed)` draws only from a local
`random.Random` seeded with a string, so the same arguments always give the same
bytes -- in this process or another one.
"""
from __future__ import annotations

import json
import math
import random
from pathlib import Path

from ..hazards.space_weather import noaa_s_scale

# between-person (mean, sd), within-person sd, syndrome sign.
# A sign of 0 means the indicator is context, not part of the syndrome vector.
INDICATORS = {
    "rest_hr": {"between": (62.0, 6.0), "within": 2.2, "sign": +1,
                "dropout": 0.03, "bounds": (35.0, 190.0)},
    "temp_c": {"between": (36.6, 0.20), "within": 0.13, "sign": +1,
               "dropout": 0.03, "bounds": (35.0, 39.5)},
    "sleep_h": {"between": (6.9, 0.6), "within": 0.5, "sign": -1,
                "dropout": 0.02, "bounds": (2.0, 11.0)},
    "pvt_ms": {"between": (285.0, 25.0), "within": 14.0, "sign": +1,
               "dropout": 0.04, "bounds": (150.0, 900.0)},
    "co2_ppm": {"between": (850.0, 80.0), "within": 40.0, "sign": 0,
                "dropout": 0.02, "bounds": (300.0, 12000.0)},
    "headache_score": {"between": (0.4, 0.30), "within": 0.35, "sign": 0,
                       "dropout": 0.05, "bounds": (0.0, 10.0)},
}

CREW = {
    "A": {"role": "CMO", "label": "A - Crew Medical Officer"},
    "B": {"role": "CDR", "label": "B - Commander"},
    "C": {"role": "MS1", "label": "C - Mission Specialist 1"},
    "D": {"role": "MS2", "label": "D - Mission Specialist 2"},
}

DEFAULT_DAYS = 24
DEFAULT_VARIANT = "strong"

# Effects are expressed in within-person sd, per indicator, in the syndrome
# direction (sign already applied). They are DEMO parameters: modest on purpose,
# and never copied into the engine thresholds.
SCENARIOS = {
    "cmo_fever": {
        "title": "Crew medical officer: fever-like syndrome",
        "description": ("The crew medical officer drifts in heart rate, temperature, "
                        "sleep and reaction time from day 15. The crew must run the "
                        "protocol without its medical officer, with a Mars-like delay."),
        "onset_day": 15,
        "affected": ["A"],
        "delay_profile": "mars",
        "hazard_kind": "nominal",
        "effects": {
            "strong": {"effect_sd": 1.9, "ramp_days": 2, "duration_days": 10,
                       "weights": {"rest_hr": 1.0, "temp_c": 1.0,
                                   "sleep_h": 0.7, "pvt_ms": 0.75}},
            "mild": {"effect_sd": 0.80, "ramp_days": 3, "duration_days": 10,
                     "weights": {"rest_hr": 1.0, "temp_c": 1.0,
                                 "sleep_h": 0.7, "pvt_ms": 0.75}},
        },
    },
    "sep_sleep_loss": {
        "title": "Solar particle event with sleep loss",
        "description": ("A solar radiation storm (NOAA S-scale) disrupts the cabin and "
                        "the schedule from day 12: sleep drops and one crew member's "
                        "HR and reaction time drift."),
        "onset_day": 12,
        "affected": ["C"],
        "delay_profile": "moon",
        "hazard_kind": "sep",
        "sep": {"strong": 300.0, "mild": 80.0, "background_pfu": 4.0},
        "context_days": {11: "eva", 12: "eva", 13: "sleep_disrupted"},
        "effects": {
            "strong": {"effect_sd": 1.9, "ramp_days": 2, "duration_days": 8,
                       "weights": {"rest_hr": 1.0, "temp_c": 0.5,
                                   "sleep_h": 2.0, "pvt_ms": 1.2}},
            "mild": {"effect_sd": 0.85, "ramp_days": 3, "duration_days": 8,
                     "weights": {"rest_hr": 1.0, "temp_c": 0.5,
                                 "sleep_h": 2.0, "pvt_ms": 1.2}},
        },
    },
    "co2_creep": {
        "title": "Slow cabin CO2 rise",
        "description": ("Cabin CO2 climbs from day 8 and several crew report headaches "
                        "and slower reaction time. A shared exposure: check the habitat "
                        "before treating anybody."),
        "onset_day": 8,
        "affected": ["A", "B", "C", "D"],
        "delay_profile": "mars",
        "hazard_kind": "co2",
        "co2": {"baseline_ppm": 800.0, "strong": 4200.0, "mild": 2600.0},
        "effects": {
            "strong": {"effect_sd": 4.6, "ramp_days": 7, "duration_days": None,
                       "weights": {"rest_hr": 1.0, "temp_c": 0.4,
                                   "sleep_h": 0.5, "pvt_ms": 1.6},
                       "headache_gain": 5.0},
            "mild": {"effect_sd": 1.0, "ramp_days": 7, "duration_days": None,
                     "weights": {"rest_hr": 1.0, "temp_c": 0.4,
                                 "sleep_h": 0.5, "pvt_ms": 1.6},
                     "headache_gain": 3.0},
        },
    },
}


def prior_stats(name: str) -> tuple[float, float]:
    """(population mean, population sd) used to seed the weak N-of-1 priors."""
    mean, between_sd = INDICATORS[name]["between"]
    return mean, (between_sd ** 2 + INDICATORS[name]["within"] ** 2) ** 0.5


def _severity(eff: dict, day: int, onset: int) -> float:
    if day < onset:
        return 0.0
    frac = min(1.0, (day - onset + 1) / eff["ramp_days"])
    dur = eff["duration_days"]
    if dur is not None and day >= onset + dur:
        return 0.0
    return frac


def _clamp(x: float, bounds: tuple[float, float]) -> float:
    return max(bounds[0], min(bounds[1], x))


def _sep_flux(kind: dict, severity: float, rnd: random.Random) -> float:
    # A 3-day shaped event: rise, peak, decay. Shape is synthetic (demo only).
    if severity <= 0:
        return kind["background_pfu"] + rnd.uniform(0.0, 2.0)
    return kind["background_pfu"] + severity * (kind["peak_pfu"] - kind["background_pfu"])


def _cabin_co2(spec: dict, variant: str, severity: float) -> float:
    if spec["hazard_kind"] != "co2":
        return spec.get("co2", {}).get("baseline_ppm", 800.0)
    base = spec["co2"]["baseline_ppm"]
    return base + severity * (spec["co2"][variant] - base)


def generate(name: str, variant: str = DEFAULT_VARIANT, seed: int = 0,
             days: int = DEFAULT_DAYS) -> dict:
    """Build one deterministic synthetic scenario. Labels are NOT included."""
    if name not in SCENARIOS:
        raise KeyError(f"unknown scenario: {name} (have {sorted(SCENARIOS)})")
    spec = SCENARIOS[name]
    if variant not in spec["effects"]:
        raise ValueError(f"unknown variant: {variant} (have strong|mild)")
    eff = spec["effects"][variant]
    rnd = random.Random(f"tether:{name}:{variant}:{seed}:{days}")

    # Person-specific offsets from the population mean, drawn in a fixed order.
    people = {}
    for cid in sorted(CREW):
        people[cid] = {
            "offset": {n: rnd.gauss(0.0, INDICATORS[n]["between"][1]) for n in INDICATORS},
            "sensitivity": rnd.uniform(0.7, 1.3),
        }

    sev_by_day = {d: _severity(eff, d, spec["onset_day"]) for d in range(1, days + 1)}
    peak = max(sev_by_day.values(), default=0.0)
    sep = dict(spec.get("sep", {}))
    if sep:
        sep["peak_pfu"] = sep[variant]

    out_days = []
    for day in range(1, days + 1):
        sev = sev_by_day[day]
        flux = _sep_flux(sep, sev, rnd) if sep else spec.get("sep", {}).get(
            "background_pfu", 4.0) + rnd.uniform(0.0, 2.0)
        cabin_co2 = _cabin_co2(spec, variant, sev)
        hazards = {
            "solar_flux_pfu": round(flux, 2),
            "s_scale": noaa_s_scale(flux),
            "cabin_co2_ppm": round(cabin_co2, 0),
        }
        context = spec.get("context_days", {}).get(day, "rest")
        crew_day = {}
        for cid in sorted(CREW):
            p = people[cid]
            is_affected = cid in spec["affected"]
            # The cabin driver is the same for everyone (that is what makes a
            # shared exposure detectable); only self-reported headache scales
            # with each person's sensitivity.
            driver = sev if is_affected else 0.0
            hour = 7.0 + rnd.gauss(0.0, 0.6)          # morning rest measurement
            values = {}
            for ind, cfg in INDICATORS.items():
                base = cfg["between"][0] + p["offset"][ind]
                circadian = 0.0
                if ind == "rest_hr":
                    circadian = 4.0 * math.cos(2.0 * math.pi * (hour - 16.0) / 24.0)
                elif ind == "temp_c":
                    circadian = 0.15 * math.cos(2.0 * math.pi * (hour - 16.0) / 24.0)
                shift = 0.0
                if driver > 0.0 and ind in eff["weights"]:
                    shift = (eff["effect_sd"] * eff["weights"][ind]
                             * cfg["within"] * cfg["sign"] * driver)
                x = base + circadian + shift + rnd.gauss(0.0, cfg["within"])

                if ind == "co2_ppm":
                    x = cabin_co2 + rnd.gauss(0.0, cfg["within"])
                elif ind == "headache_score":
                    gain = eff.get("headache_gain", 0.0) if is_affected else 0.0
                    x = base + gain * driver * p["sensitivity"] + rnd.gauss(0.0, cfg["within"])
                elif ind == "sleep_h" and context == "sleep_disrupted" and is_affected:
                    x -= 1.0                          # cabin disruption, not illness

                x = _clamp(x, cfg["bounds"])
                dropout = cfg["dropout"]
                if (spec["hazard_kind"] == "sep" and ind == "pvt_ms"
                        and is_affected and sev > 0):
                    dropout += 0.35                   # sensor glitch during the event
                values[ind] = None if rnd.random() < dropout else round(x, 2)

            crew_day[cid] = {"context": context, "indicators": values}
        out_days.append({"day": day, "context": context, "hazards": hazards,
                         "crew": crew_day})

    return {
        "synthetic": True,
        "name": name,
        "title": spec["title"],
        "description": spec["description"],
        "variant": variant,
        "seed": seed,
        "days_requested": days,
        "onset_day": spec["onset_day"],
        "affected": list(spec["affected"]),
        "delay_profile": spec["delay_profile"],
        "peak_severity": round(peak, 3),
        "crew": {cid: {"role": CREW[cid]["role"], "label": CREW[cid]["label"]}
                 for cid in sorted(CREW)},
        "indicators": list(INDICATORS),
        "days": out_days,
    }


def labels_for(name: str, variant: str = DEFAULT_VARIANT, seed: int = 0,
               days: int = DEFAULT_DAYS) -> dict:
    """Ground truth sidecar. Written to disk, never read by the engine."""
    spec = SCENARIOS[name]
    expected = "act" if variant == "strong" else "watch"
    return {
        "synthetic": True,
        "note": "Synthetic demo labels. Ground truth for validation only; the engine must not read this file.",
        "scenario": name,
        "variant": variant,
        "seed": seed,
        "days": days,
        "onset_day": spec["onset_day"],
        "affected": list(spec["affected"]),
        "expected_level": expected,
        "expected_indicators": sorted(spec["effects"][variant]["weights"]),
    }


def write_scenario(name: str, variant: str = DEFAULT_VARIANT, seed: int = 0,
                   days: int = DEFAULT_DAYS, root: str | Path = "data/synthetic") -> Path:
    """Write `readings.json` + `labels.json` (+ `events.json`) for one scenario.

    Directory: `data/synthetic/<name>/<seed>/` for the strong variant and
    `data/synthetic/<name>/<seed>-mild/` for the mild one.
    """
    dirname = str(seed) if variant == DEFAULT_VARIANT else f"{seed}-{variant}"
    out = Path(root) / name / dirname
    out.mkdir(parents=True, exist_ok=True)
    sc = generate(name, variant=variant, seed=seed, days=days)
    (out / "readings.json").write_text(json.dumps(sc, indent=1, sort_keys=True))
    (out / "labels.json").write_text(json.dumps(
        labels_for(name, variant, seed, days), indent=1, sort_keys=True))
    events = [{"day": d["day"], **d["hazards"]} for d in sc["days"]
              if d["hazards"]["s_scale"] > 0 or d["hazards"]["cabin_co2_ppm"] > 1500]
    (out / "events.json").write_text(json.dumps(events, indent=1, sort_keys=True))
    return out
