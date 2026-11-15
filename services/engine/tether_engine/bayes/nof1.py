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

import math
from dataclasses import dataclass

from scipy import stats


@dataclass
class NIG:
    mu0: float
    kappa: float
    alpha: float
    beta: float


# Unresolved-change guard. DEMO POLICY PARAMETERS, not validated statistics:
# chosen so a +10 shift (~15 predictive sd) trips it while ordinary noise
# (|z| > 3 happens ~0.3% of the time) almost never does.
UNRESOLVED_Z = 3.0     # |z| above this counts as a departure from the level
UNRESOLVED_RUN = 3     # consecutive departures before the change is declared unresolved
UNRESOLVED_DURATION_S = 2 * 24 * 60 * 60  # demo policy: three daily samples span two days
MAX_OBSERVATION_GAP_S = 24 * 60 * 60  # larger gaps cannot establish continuity


class BaselineModel:
    def __init__(self, prior_mean: float, prior_sd: float,
                 prior_n: float = 3.0, prior_var_n: float = 0.5,
                 lam: float = 0.98, min_sd: float = 1e-6):
        # prior_n: pseudo-observations backing the prior MEAN.
        # prior_var_n: pseudo-observations backing the prior VARIANCE; kept
        # small on purpose so a wide population sd does not make the model lazy.
        self.lam, self.min_sd, self.n_seen = lam, min_sd, 0
        # Unresolved-change state: once set, the baseline stops learning so a
        # prolonged illness or sensor offset cannot silently become "normal".
        # Only an explicit rebaseline() (an operator decision) clears it.
        self.unresolved_change = False
        self.held_n = 0          # readings not absorbed while unresolved
        self._run = 0            # consecutive departures from the level
        self._run_direction = 0  # opposite excursions are not a sustained shift
        self._last_observed_at = None
        self._candidate = None
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
        pending_z = pending_p = None
        if self._candidate is not None and not self.unresolved_change:
            anchor = self._candidate[0]
            anchor_scale = max(math.sqrt(anchor.beta * (anchor.kappa + 1.0) / (anchor.alpha * anchor.kappa)), self.min_sd)
            pending_z = (x - anchor.mu0) / anchor_scale
            pending_p = 2.0 * stats.t.sf(abs(pending_z), 2.0 * anchor.alpha)
        return {"z": z, "p_two_sided": 2.0 * stats.t.sf(abs(z), df),
                "ci95": (lo, hi), "baseline": loc, "df": df, "n_seen": self.n_seen,
                "unresolved_change": self.unresolved_change,
                "change_pending": self._candidate is not None and not self.unresolved_change,
                "pending_z": pending_z, "pending_p_two_sided": pending_p}

    def update(self, x: float) -> None:
        if self.unresolved_change:
            # Frozen: absorbing readings here would let the change become normal.
            self.held_n += 1
            return
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


def _robust_update(self, x: float, clip: float = 3.0, *, observed_at: float | None = None) -> None:
    """Winsorized update: an anomalous point may not drag the baseline toward
    itself (otherwise the model 'learns' the illness within a few days).

    A run of UNRESOLVED_RUN consecutive departures (|z| > UNRESOLVED_Z) is a
    sustained change, not an outlier: winsorizing alone would still absorb it
    (~3 sd per day), so the state is set and the baseline stops moving.
    """
    if observed_at is not None:
        if not math.isfinite(observed_at) or (self._last_observed_at is not None and observed_at <= self._last_observed_at):
            raise ValueError("observation timestamps must be finite and strictly increasing")
        if self._last_observed_at is not None and observed_at - self._last_observed_at > MAX_OBSERVATION_GAP_S:
            self._candidate = None
        self._last_observed_at = observed_at
    elif self._last_observed_at is not None:
        raise ValueError("timestamps are required after timestamped observations")
    loc, scale, _ = self.predictive()
    z = (x - loc) / scale
    if self.unresolved_change:
        self.held_n += 1
        return
    if observed_at is not None:
        candidate = self._candidate
        if candidate is not None:
            anchor, start, direction = candidate
            anchor_scale = max(math.sqrt(anchor.beta * (anchor.kappa + 1.0) / (anchor.alpha * anchor.kappa)), self.min_sd)
            anchor_z = (x - anchor.mu0) / anchor_scale
            if anchor_z * direction <= UNRESOLVED_Z:
                self._candidate = None
            elif observed_at - start >= UNRESOLVED_DURATION_S:
                self.post = anchor
                self.unresolved_change = True
                self.held_n += 1
                return
        if self._candidate is None and abs(z) > UNRESOLVED_Z:
            p = self.post
            self._candidate = (NIG(p.mu0, p.kappa, p.alpha, p.beta), observed_at, 1 if z > 0 else -1)
        self.update(loc + max(-clip, min(clip, z)) * scale)
        return
    direction = (1 if z > 0 else -1) if abs(z) > UNRESOLVED_Z else 0
    self._run = (self._run + 1 if direction == self._run_direction else 1) if direction else 0
    self._run_direction = direction
    if self._run >= UNRESOLVED_RUN:
        self.unresolved_change = True
        self.held_n += 1
        return
    self.update(loc + max(-clip, min(clip, z)) * scale)


def _rebaseline(self, x: float | None = None) -> None:
    """Operator decision that a new level is the normal. Clears the unresolved
    state; nothing does this automatically. If x is given, the level is reset
    to x (spread and evidence count are kept)."""
    self.unresolved_change, self._run, self.held_n = False, 0, 0
    self._run_direction = 0
    self._candidate = None
    if x is not None:
        p = self.post
        self.post = NIG(mu0=float(x), kappa=p.kappa, alpha=p.alpha, beta=p.beta)


BaselineModel.robust_update = _robust_update
BaselineModel.rebaseline = _rebaseline


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
