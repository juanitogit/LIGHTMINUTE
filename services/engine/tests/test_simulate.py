import json
import tempfile

from tether_engine.simulate.scenarios import (
    INDICATORS,
    SCENARIOS,
    generate,
    labels_for,
    write_scenario,
)


def _hash(payload) -> str:
    import hashlib
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def test_generation_is_deterministic_by_seed():
    for name in SCENARIOS:
        for variant in ("strong", "mild"):
            a = generate(name, variant=variant, seed=3, days=16)
            b = generate(name, variant=variant, seed=3, days=16)
            assert _hash(a) == _hash(b), f"{name}/{variant} not deterministic"
            assert _hash(a) != _hash(generate(name, variant=variant, seed=4, days=16))


def test_same_seed_survives_a_fresh_process_seed():
    # A string-seeded Random is process-independent; guard against a stray
    # use of the global random module inside the generator.
    import random
    random.seed(999)
    a = generate("cmo_fever", seed=1, days=10)
    random.seed(1)
    b = generate("cmo_fever", seed=1, days=10)
    assert _hash(a) == _hash(b)


def test_scenario_shape_rate_and_labelling():
    for name in SCENARIOS:
        sc = generate(name, seed=0, days=12)
        assert sc["synthetic"] is True
        assert [d["day"] for d in sc["days"]] == list(range(1, 13))
        for day in sc["days"]:
            assert set(day["hazards"]) == {"solar_flux_pfu", "s_scale", "cabin_co2_ppm"}
            assert 0 <= day["hazards"]["s_scale"] <= 5
            for cid, cday in day["crew"].items():
                assert cid in sc["crew"]
                assert set(cday["indicators"]) == set(INDICATORS)
                assert cday["context"] in {"rest", "eva", "sleep_disrupted"}
                for v in cday["indicators"].values():
                    assert v is None or isinstance(v, (int, float))


def test_sep_scenario_raises_a_real_s_scale_and_dropouts():
    sc = generate("sep_sleep_loss", variant="strong", seed=0, days=16)
    assert max(d["hazards"]["s_scale"] for d in sc["days"]) >= 1
    missing = sum(v is None for d in sc["days"] for c in d["crew"].values()
                  for v in c["indicators"].values())
    assert missing > 0, "sensor dropouts should exist somewhere"


def test_labels_are_a_separate_sidecar_and_never_in_the_readings():
    sc = generate("cmo_fever", seed=0, days=12)
    labels = labels_for("cmo_fever", "strong", 0, 12)
    assert "labels" not in sc and "labels" not in json.dumps(sc)
    assert labels["onset_day"] == SCENARIOS["cmo_fever"]["onset_day"]
    assert labels["affected"] == ["A"]
    assert labels["expected_level"] == "act"

    with tempfile.TemporaryDirectory() as tmp:
        out = write_scenario("co2_creep", "mild", seed=2, days=10, root=tmp)
        readings = json.loads((out / "readings.json").read_text())
        on_disk = json.loads((out / "labels.json").read_text())
        assert on_disk["synthetic"] is True and on_disk["variant"] == "mild"
        assert "labels" not in readings
        assert (out / "events.json").exists()
