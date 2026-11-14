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
