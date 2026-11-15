import math
import random

from tether_engine.bayes import BaselineModel, SyndromeScore
from tether_engine.qc.basic import (
    STUCK_MIN_RUN,
    clean_readings,
    clean_value,
    is_stuck,
    trailing_run,
)
from tether_engine.simulate.scenarios import INDICATORS, generate, prior_stats


def test_stuck_rule_needs_a_sustained_identical_run():
    assert trailing_run([]) == 0
    assert not is_stuck([60.0] * (STUCK_MIN_RUN - 1))
    assert is_stuck([60.0] * STUCK_MIN_RUN)


def test_stuck_rule_compares_at_sensor_resolution():
    # 60.001 and 60.004 round to the same 0.01 reading; 60.02 does not.
    assert trailing_run([58.0, 60.001, 60.004, 60.003, 60.0]) == 4
    assert trailing_run([60.0, 60.0, 60.0, 60.0, 60.02]) == 1


def test_missing_day_breaks_the_stuck_run_and_is_never_equal_to_a_value():
    assert trailing_run([60.0] * 6 + [None]) == 0
    assert trailing_run([60.0] * 4 + [None] + [60.0] * 4) == 4
    assert not is_stuck([60.0] * 4 + [None] + [60.0] * 4)


def test_clean_readings_drops_missing_nan_and_impossible():
    cleaned, issues = clean_readings({
        "rest_hr": None, "temp_c": float("nan"), "sleep_h": 400.0,
        "pvt_ms": 280.0, "co2_ppm": "n/a",
    })
    assert cleaned == {"pvt_ms": 280.0}
    reasons = {i["indicator"]: i["reason"] for i in issues}
    assert reasons == {"rest_hr": "missing", "temp_c": "not_finite",
                       "sleep_h": "impossible", "co2_ppm": "not_a_number"}


def test_clean_value_never_raises():
    for value in (None, "", "abc", float("inf"), -1e9, 1e9, [], {}):
        x, reason = clean_value("rest_hr", value)
        assert x is None and reason


def test_clean_readings_tolerates_none_and_unknown_indicators():
    assert clean_readings(None) == ({}, [])
    cleaned, issues = clean_readings({"novel_indicator": 5})
    assert cleaned == {"novel_indicator": 5} and issues == []


def test_qc_handles_40pct_dropouts_without_exceptions():
    """Worst case before launch: four in ten readings never arrive."""
    sc = generate("co2_creep", seed=0, days=24)
    rnd = random.Random(7)
    signs = [1, 1, -1, 1]
    models = {n: BaselineModel(*prior_stats(n)) for n in INDICATORS}
    syndrome = SyndromeScore(signs)

    dropped = kept = 0
    for day in sc["days"]:
        for cday in day["crew"].values():
            raw = {n: (None if rnd.random() < 0.4 else v)
                   for n, v in cday["indicators"].items()}
            cleaned, issues = clean_readings(raw)
            dropped += len(issues)
            kept += len(cleaned)
            zs = []
            for n in ("rest_hr", "temp_c", "sleep_h", "pvt_ms"):
                if n in cleaned:
                    sur = models[n].surprise(cleaned[n])
                    assert math.isfinite(sur["z"])
                    models[n].robust_update(cleaned[n])
                    zs.append(sur["z"])
                else:
                    zs.append(0.0)
            score = syndrome.score(zs)
            assert math.isfinite(score["z_dir"])
            syndrome.observe(zs)
    assert dropped > 0 and kept > 0
    assert dropped / (dropped + kept) > 0.3
