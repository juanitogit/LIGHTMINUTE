import random
from tether_engine.bayes import BaselineModel, SyndromeScore
from tether_engine.simulate.mini import INDICATORS, make_series, pop_stats


def _run(seed, effect, onset=14, days=24):
    """Return per-day (max single-indicator |z|, syndrome z_dir)."""
    data = make_series(seed, n_days=days, onset=onset, effect=effect)
    names = list(INDICATORS)
    models = {n: BaselineModel(pop_stats(n)[0], pop_stats(n)[1]) for n in names}
    syn = SyndromeScore([INDICATORS[n]["sign"] for n in names])
    rows = []
    for d in range(days):
        zs = []
        for n in names:
            zs.append(models[n].surprise(data[n][d])["z"])
            models[n].robust_update(data[n][d])
        rows.append((max(abs(z) for z in zs), syn.score(zs)["z_dir"]))
        syn.observe(zs)
    return rows


def test_syndrome_beats_single_indicator_on_coordinated_small_shift():
    hits_syn = hits_single = 0
    for s in range(200):
        rows = _run(s, effect=1.6)[16:19]          # days 2-4 after onset, mild
        hits_syn += any(r[1] > 2.33 for r in rows)  # one-sided p<0.01
        hits_single += any(r[0] > 3.0 for r in rows)
    assert hits_syn > hits_single + 20              # clearly more sensitive


def test_syndrome_false_alarm_rate_is_controlled():
    fa = n = 0
    for s in range(300, 500):
        for r in _run(s, effect=0.0)[8:]:
            n += 1; fa += r[1] > 2.33
    assert fa / n < 0.03                            # nominal 1% (+slack)


def test_robust_update_resists_contamination():
    m = BaselineModel(60, 6)
    rnd = random.Random(3)
    for _ in range(14): m.update(rnd.gauss(60, 2))
    base = m.predictive()[0]
    for _ in range(3): m.robust_update(90.0)        # absurd outliers
    assert abs(m.predictive()[0] - base) < 4        # plain update would jump far more
