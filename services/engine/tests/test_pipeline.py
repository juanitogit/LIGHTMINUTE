import hashlib
import json
from pathlib import Path

from tether_engine.pipeline import run_scenario
from tether_engine.simulate.scenarios import SCENARIOS

DATA = Path(__file__).resolve().parents[3] / "apps" / "crew-tablet" / "public" / "data"

LEVELS = {"info", "watch", "act", "escalate"}
PATTERNS = {"hidden_in_range", "expected_for_you", "space_adapted_normal",
            "concordant_alert", "concordant_normal", "learning_baseline", "mixed"}
CARD_KEYS = {"level", "headline", "what_changed", "why_it_matters", "confidence",
             "do_now", "monitor", "escalate_if", "ground_message", "citations"}
IND_KEYS = {"value", "baseline", "ci95", "z", "p", "n_seen", "unit",
            "hrp_risk", "hazard", "lens", "change_pending", "unresolved_change", "pending_z", "pending_p"}


def _hash(payload) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def _acts(d, cid):
    return [day["day"] for day in d["days"]
            if day["crew"][cid]["level"] in ("act", "escalate")]


def test_output_matches_the_demo_data_contract():
    d = run_scenario("cmo_fever", seed=0, days=14)
    assert d["synthetic"] is True and d["note"]
    seen = set().union(*(set(day["crew"]["A"]["indicators"]) for day in d["days"]))
    assert seen == set(d["indicators"])
    assert set(d["days"][0]["crew"]["A"]["indicators"]) <= seen
    assert [day["day"] for day in d["days"]] == list(range(1, 15))
    for day in d["days"]:
        assert {"day", "attribution", "crew", "hazards"} <= set(day)
        assert day["attribution"]["mode"] in {"none", "individual", "shared"}
        for cid, crew_day in day["crew"].items():
            assert crew_day["level"] in LEVELS
            assert isinstance(crew_day["learning"], bool)
            assert set(crew_day["card"]) == CARD_KEYS
            assert crew_day["card"]["level"] == crew_day["level"]
            assert crew_day["card_source"] == "template"
            assert set(crew_day["routing"]) >= {"expected_reply_s", "act_onboard_first",
                                                "send_now", "priority"}
            for name, ind in crew_day["indicators"].items():
                assert set(ind) == IND_KEYS, (cid, name, set(ind))
                assert ind["lens"]["pattern"] in PATTERNS
                assert ind["ci95"][0] <= ind["ci95"][1]
                assert ind["hrp_risk"] and ind["hazard"] and ind["unit"]
    assert "labels" not in json.dumps(d)


def test_learning_state_is_visible_at_the_start():
    d = run_scenario("cmo_fever", seed=0, days=10)
    first = d["days"][0]["crew"]["A"]
    assert first["learning"] is True and first["level"] == "info"
    assert d["days"][-1]["crew"]["A"]["learning"] is False


def test_pipeline_updates_use_mission_day_timestamps():
    from unittest.mock import patch

    from tether_engine.bayes import BaselineModel
    original = BaselineModel.robust_update
    observed = []

    def capture(model, value, *args, **kwargs):
        observed.append(kwargs.get("observed_at"))
        return original(model, value, *args, **kwargs)

    with patch.object(BaselineModel, "robust_update", capture):
        result = run_scenario("cmo_fever", seed=0, days=10)
    assert observed and all(isinstance(t, (int, float)) for t in observed)
    assert all(t % 86400 == 0 for t in observed)
    readings = [r for d in result["days"] for c in d["crew"].values() for r in c["indicators"].values()]
    assert readings and all("change_pending" in r and "unresolved_change" in r for r in readings)


def test_pending_shift_does_not_silently_reduce_decision_surprise():
    from tether_engine.pipeline import _decision_surprise
    sample = {"z": 0.2, "p_two_sided": 0.8, "n_seen": 14, "change_pending": True,
              "pending_z": 4.0, "pending_p_two_sided": 0.0001}
    chosen = _decision_surprise(sample)
    assert chosen["z"] == 4.0 and chosen["p_two_sided"] == 0.0001
    assert sample["z"] == 0.2


def test_strong_variants_reach_act_within_five_days_of_onset():
    for name, spec in SCENARIOS.items():
        d = run_scenario(name, seed=0, days=24, variant="strong")
        onset = spec["onset_day"]
        early = [c for c in spec["affected"] if any(day <= onset + 5 for day in _acts(d, c))]
        needed = 2 if name == "co2_creep" else 1
        assert len(early) >= needed, f"{name}: only {early} reached act near onset"


def test_false_act_alarm_rate_before_onset_is_low():
    for name, spec in SCENARIOS.items():
        d = run_scenario(name, seed=0, days=24, variant="strong")
        onset = spec["onset_day"]
        healthy = [c for c in d["crew"] if c not in spec["affected"]]
        false_acts = sum(len([day for day in _acts(d, c) if day < onset]) for c in healthy)
        crew_weeks = max(1.0, len(healthy) * onset / 7.0)
        assert false_acts / crew_weeks <= 1.0, f"{name}: {false_acts} false act-days"


def test_co2_creep_confirms_a_shared_exposure():
    d = run_scenario("co2_creep", seed=0, days=24, variant="strong")
    shared = [day for day in d["days"] if day["attribution"]["mode"] == "shared"]
    assert shared, "co2_creep must exercise the shared attribution path"
    assert len(shared[0]["attribution"]["affected"]) >= 2
    assert shared[0]["attribution"]["persistence"]["confirmed_days"] >= 2


def test_cmo_fever_is_attributed_to_the_individual():
    d = run_scenario("cmo_fever", seed=0, days=24, variant="strong")
    modes = {day["attribution"]["mode"] for day in d["days"]}
    assert "individual" in modes and "shared" not in modes


def test_attribution_never_reports_an_unconfirmed_crew_pattern():
    for name in SCENARIOS:
        d = run_scenario(name, seed=0, days=24)
        for day in d["days"]:
            p = day["attribution"]["persistence"]
            assert p["required_days"] == 2
            if day["attribution"]["mode"] != "none":
                assert p["confirmed_days"] >= 2, (name, day["day"])


def test_export_is_deterministic_by_seed():
    assert _hash(run_scenario("sep_sleep_loss", seed=2, days=16)) == \
           _hash(run_scenario("sep_sleep_loss", seed=2, days=16))
    assert _hash(run_scenario("sep_sleep_loss", seed=2, days=16)) != \
           _hash(run_scenario("sep_sleep_loss", seed=3, days=16))


def test_exported_scenario_files_exist_and_match_the_contract():
    index = json.loads((DATA / "scenario-index.json").read_text())
    assert index["synthetic"] is True
    names = {s["name"] for s in index["scenarios"]}
    assert names == set(SCENARIOS)
    for entry in index["scenarios"]:
        for key in ("file", "mild_file"):
            payload = json.loads((DATA / entry[key]).read_text())
            assert payload["scenario"] == entry["name"] and payload["synthetic"] is True
            assert len(payload["days"]) == entry["days"]
            assert payload["days"][0]["crew"]["A"]["card_source"] == "template"
