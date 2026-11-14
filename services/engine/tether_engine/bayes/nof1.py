"""Per-person (N-of-1) Bayesian baseline with a weak hierarchical prior.

For one indicator of one astronaut (e.g. resting HR):
    x_t ~ Normal(mu, sigma^2),   (mu, sigma^2) ~ Normal-Inverse-Gamma
Conjugate => O(1) updates and fully explainable. A forgetting factor (lam < 1)
discounts old data so slow, legitimate adaptation (fluid shift, circadian
drift) is tracked instead of flagged forever, while abrupt shifts still surprise.

The prior should come from population/proxy data (OSDR Inspiration4, MMASH...)
and is deliberately weak (prior_n small) so the person's own data dominates fast.

The predictive for the next value is Student-t: honest tails with few
observations -- the small-N setting NASA HRP posed in its Artemis II challenge.
"""
from __future__ import annotations
from dataclasses import dataclass
import math
from scipy import stats


@dataclass
class NIG:
    mu0: float
    kappa: float
    alpha: float
    beta: float


class BaselineModel:
    def __init__(self, prior_mean: float, prior_sd: float,
                 prior_n: float = 3.0, prior_var_n: float = 0.5,
                 lam: float = 0.98, min_sd: float = 1e-6):
        # prior_n: pseudo-observations backing the prior MEAN.
        # prior_var_n: pseudo-observations backing the prior VARIANCE; kept
        # small on purpose so a wide population sd does not make the model lazy.
        self.lam, self.min_sd, self.n_seen = lam, min_sd, 0
        alpha = 1.0 + prior_var_n / 2.0
        # alpha0 is the floor alpha is discounted back toward; see update().
        self.alpha0 = alpha
        self.post = NIG(mu0=prior_mean, kappa=prior_n, alpha=alpha,
                        beta=(alpha - 1.0) * max(prior_sd, min_sd) ** 2)

    def predictive(self):
        """(loc, scale, df) of the Student-t predictive for the next value."""
        p = self.post
        df = 2.0 * p.alpha
        scale = math.sqrt(p.beta * (p.kappa + 1.0) / (p.alpha * p.kappa))
        return p.mu0, max(scale, self.min_sd), df

    def surprise(self, x: float) -> dict:
        """How unusual is x FOR THIS PERSON. Call BEFORE update() so the point
        being judged does not contaminate its own baseline."""
        loc, scale, df = self.predictive()
        z = (x - loc) / scale
        lo, hi = stats.t.interval(0.95, df, loc=loc, scale=scale)
        return {"z": z, "p_two_sided": 2.0 * stats.t.sf(abs(z), df),
                "ci95": (lo, hi), "baseline": loc, "df": df, "n_seen": self.n_seen}

    def update(self, x: float) -> None:
        p, lam = self.post, self.lam
        k0, b0 = p.kappa * lam, p.beta * lam            # forget old evidence
        k1 = k0 + 1.0
        # alpha has to forget too. Undiscounted it grows by 0.5 per update, so
        # df = 2*alpha grows without bound while the scale keeps shrinking: the
        # Student-t collapses into a very narrow Gaussian and the 95% interval
        # stops covering (16% at 2000 updates, 21.6% on MMASH minute HR). See
        # ml/diagnostics/forgetting_drift.py. Discounting toward alpha0 keeps the
        # fixed point at alpha0 + 0.5/(1-lam) (df ~ 50 with the defaults), so the
        # honest tails the model is documented to have survive any stream length.
        a1 = self.alpha0 + (p.alpha - self.alpha0) * lam + 0.5
        self.post = NIG(mu0=(k0 * p.mu0 + x) / k1, kappa=k1,
                        alpha=a1,
                        beta=b0 + 0.5 * k0 * (x - p.mu0) ** 2 / k1)
        self.n_seen += 1


def _robust_update(self, x: float, clip: float = 3.0) -> None:
    """Winsorized update: an anomalous point may not drag the baseline toward
    itself (otherwise the model 'learns' the illness within a few days)."""
    loc, scale, _ = self.predictive()
    z = (x - loc) / scale
    self.update(loc + max(-clip, min(clip, z)) * scale)


BaselineModel.robust_update = _robust_update


class CUSUM:
    """Two-sided CUSUM on z-scores: catches sustained small shifts that no
    single reading would flag (e.g. +0.4 C resting temperature for 5 days)."""
    def __init__(self, k: float = 0.5, h: float = 4.0):
        self.k, self.h, self.hi, self.lo = k, h, 0.0, 0.0

    def step(self, z: float) -> dict:
        self.hi = max(0.0, self.hi + z - self.k)
        self.lo = max(0.0, self.lo - z - self.k)
        alarm = "up" if self.hi > self.h else "down" if self.lo > self.h else None
        return {"hi": self.hi, "lo": self.lo, "alarm": alarm}
