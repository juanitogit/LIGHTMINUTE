import math
import random

from tether_engine.bayes import CUSUM, BaselineModel


def _baseline(seed=1, n=14, mean=58.0, sd=2.0):
    rnd = random.Random(seed)
    m = BaselineModel(prior_mean=65.0, prior_sd=8.0)   # weak, off-center prior
    for _ in range(n):
        m.update(rnd.gauss(mean, sd))
    return m


def test_prior_is_overridden_by_own_data():
    loc, _, _ = _baseline().predictive()
    assert abs(loc - 58.0) < 1.5            # moved from 65 toward this person's 58


def test_healthy_days_rarely_flagged():
    rnd, flags = random.Random(7), 0
    for s in range(300):
        if _baseline(seed=s).surprise(rnd.gauss(58.0, 2.0))["p_two_sided"] < 0.01:
            flags += 1
    assert flags / 300 < 0.03


def test_real_shift_is_flagged_and_explained():
    s = _baseline().surprise(70.0)           # +12 bpm vs this person's normal
    # Student-t tails are honestly heavier with only 14 observations.
    assert s["p_two_sided"] < 0.01 and s["z"] > 3
    assert s["ci95"][0] < 58.0 < s["ci95"][1]


def test_few_observations_means_wider_interval():
    wide = _baseline(n=3).surprise(58.0)["ci95"]
    narrow = _baseline(n=30).surprise(58.0)["ci95"]
    assert (wide[1] - wide[0]) > (narrow[1] - narrow[0])


def test_cusum_catches_small_sustained_shift():
    m, c, alarm = _baseline(), CUSUM(), None
    single = m.surprise(62.5)                  # +3.6 bpm: one reading is unremarkable
    assert single["p_two_sided"] > 0.1
    for _ in range(10):                        # ...but ten in a row are not
        alarm = c.step(m.surprise(62.5)["z"])["alarm"] or alarm
    assert alarm == "up"


def test_interval_stays_honest_after_many_updates():
    """Regression for the undiscounted-alpha defect: coverage must not collapse.

    Before the fix df grew without bound and the 95% interval covered ~16% of a
    flat healthy stream after 2000 updates (and 21.6% of real MMASH minutes).
    See ml/diagnostics/forgetting_drift.py.
    """
    rnd = random.Random(11)
    m = BaselineModel(prior_mean=70.0, prior_sd=14.0)
    covered = n = 0
    for i in range(1200):
        x = rnd.gauss(60.0, 2.0)
        lo, hi = m.surprise(x)["ci95"]
        if i >= 20:
            covered += int(lo <= x <= hi)
            n += 1
        m.robust_update(x)
    assert covered / n >= 0.88            # nominal 95%; the defect gave ~0.20
    assert m.predictive()[2] < 80         # df must stop growing


def test_sustained_shift_is_not_absorbed_into_baseline():
    """FI-13: a prolonged +10 shift must stay flagged, not become normal."""
    m = BaselineModel(70, 5)
    for _ in range(20):
        m.update(70)
    assert m.surprise(80)["p_two_sided"] < 1e-6
    for _ in range(60):
        m.robust_update(80)
    s = m.surprise(80)
    assert s["p_two_sided"] < 0.05
    assert s["unresolved_change"] is True
    assert m.unresolved_change is True


def test_healthy_noise_does_not_set_unresolved_change():
    rnd = random.Random(5)
    m = BaselineModel(prior_mean=58.0, prior_sd=2.0)
    for _ in range(500):
        m.robust_update(rnd.gauss(58.0, 2.0))
    assert m.unresolved_change is False
    assert m.held_n == 0


def test_alternating_departures_do_not_count_as_sustained_shift():
    """Opposite-direction excursions are not a persistent change in level."""
    model = BaselineModel(prior_mean=70.0, prior_sd=5.0)
    for _ in range(20):
        model.update(70.0)
    for value in (90.0, 50.0, 90.0):
        model.robust_update(value)
    assert model.unresolved_change is False


def test_sustained_downward_shift_remains_unresolved():
    model = BaselineModel(prior_mean=70.0, prior_sd=5.0)
    for _ in range(20):
        model.update(70.0)
    for _ in range(60):
        model.robust_update(60.0)
    assert model.unresolved_change is True
    assert model.surprise(60.0)["p_two_sided"] < 0.05


def test_timestamped_persistent_shift_keeps_anchor_and_requires_elapsed_time():
    model = BaselineModel(70, 5)
    for _ in range(20):
        model.update(70)
    for minute in range(24 * 60):
        model.robust_update(80, observed_at=float(minute * 60))
    assert not model.unresolved_change
    assert model.surprise(80)["change_pending"]
    assert model.surprise(80)["pending_p_two_sided"] < .05
    for minute in range(24 * 60, 2 * 24 * 60 + 1):
        model.robust_update(80, observed_at=float(minute * 60))
    assert model.unresolved_change
    assert model.surprise(80)["p_two_sided"] < .05


def test_timestamp_rejects_invalid_and_unordered_without_mutating_model():
    model = BaselineModel(70, 5)
    model.robust_update(70, observed_at=100.0)
    before = model.predictive(), model.n_seen
    for time in (100.0, 99.0, math.nan, math.inf):
        try:
            model.robust_update(70, observed_at=time)
        except ValueError:
            pass
        else:
            raise AssertionError("Invalid or unordered timestamp accepted")
        assert (model.predictive(), model.n_seen) == before


def test_timestamped_change_with_long_gap_is_not_assumed_continuous():
    model = BaselineModel(70, 5)
    for _ in range(20):
        model.update(70)
    model.robust_update(80, observed_at=0.0)
    model.robust_update(80, observed_at=3 * 86400.0)
    assert not model.unresolved_change


def test_timestamped_candidate_clears_when_values_return_to_reference():
    model = BaselineModel(70, 5)
    for _ in range(20):
        model.update(70)
    model.robust_update(80, observed_at=0.0)
    assert model.surprise(80)["change_pending"] is True
    model.robust_update(70, observed_at=60.0)
    assert model.surprise(70)["change_pending"] is False


def test_rebaseline_clears_state_and_healthy_readings_update_again():
    m = BaselineModel(70, 5)
    for _ in range(20):
        m.update(70)
    for _ in range(60):
        m.robust_update(80)
    assert m.unresolved_change is True
    m.rebaseline()
    assert m.unresolved_change is False
    before, seen = m.predictive()[0], m.n_seen
    m.robust_update(70.0)
    assert m.unresolved_change is False
    assert m.n_seen == seen + 1           # the healthy reading was absorbed
    assert m.predictive()[0] != before
