import json
import os
import tempfile

from tether_engine.lenses import three_lens
from tether_engine.protocols.thresholds import load_thresholds

KB = os.path.join(os.path.dirname(__file__), "..", "..", "..", "kb", "thresholds.json")


def _s(z, p, n=14):
    return {"z": z, "p_two_sided": p, "n_seen": n}


def test_kb_thresholds_load_and_are_labelled():
    th = load_thresholds(KB)
    assert th["rest_hr"].earth.status == "earth-standard" and th["pvt_ms"].earth is None


def test_unlabelled_or_unsourced_thresholds_are_rejected():
    bad = [{"indicator": "x", "unit": "u", "hrp_risk": "r", "hazard": "h",
            "earth": {"low": 1, "high": 2, "status": "verified", "source": "trust me"}}]
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(bad, f)
    try:
        load_thresholds(f.name); raise AssertionError("should fail")
    except ValueError:
        pass
    finally:
        os.unlink(f.name)


def test_pattern_hidden_in_range_and_expected_for_you():
    th = load_thresholds(KB)["rest_hr"]
    assert three_lens(th, 75, _s(4.0, 0.001))["pattern"] == "hidden_in_range"   # normal for population, not for YOU
    assert three_lens(th, 52, _s(0.2, 0.8))["pattern"] == "expected_for_you"    # athlete: Earth range misfires
    assert three_lens(th, 130, _s(6, 1e-5))["pattern"] == "concordant_alert"
    assert three_lens(th, 75, _s(4.0, 0.001, n=3))["pattern"] == "learning_baseline"
