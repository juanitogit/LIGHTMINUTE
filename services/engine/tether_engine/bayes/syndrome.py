"""Directional multi-indicator ('syndromic') early warning.

Idea: several weak shifts that move together in a clinically expected
direction (HR up, temperature up, sleep down, reaction time up) are strong
evidence even when no single indicator crosses its own alarm line.

    z_dir = s'z / sqrt(s' S s)      s = expected sign vector, S = shrunk
                                    covariance of recent *healthy* z-vectors

Under the null z_dir ~ N(0,1) (conservative while S is learned). The caller
supplies `signs` from a clinical prior (see kb/syndromes.json); this is a
strength (power) and a limitation (blind to other directions) -- report both.
"""
from __future__ import annotations
import numpy as np
from scipy import stats


class SyndromeScore:
    def __init__(self, signs, shrink: float = 0.5, window: int = 14, min_n: int = 5):
        self.s = np.asarray(signs, dtype=float)
        self.k = len(self.s)
        self.shrink, self.window, self.min_n = shrink, window, min_n
        self.buf: list[np.ndarray] = []

    def _sigma(self) -> np.ndarray:
        if len(self.buf) < self.min_n:
            return np.eye(self.k)
        S = np.cov(np.asarray(self.buf[-self.window:]), rowvar=False)
        return (1.0 - self.shrink) * S + self.shrink * np.eye(self.k)

    def score(self, z) -> dict:
        z = np.asarray(z, dtype=float)
        var = float(self.s @ self._sigma() @ self.s)
        zdir = float(self.s @ z) / np.sqrt(max(var, 1e-9))
        return {"z_dir": zdir, "p_one_sided": float(stats.norm.sf(zdir)),
                "contrib": (self.s * z).tolist()}

    def observe(self, z, learn_cutoff: float = 2.0) -> None:
        """Feed a day into the covariance estimate only if it looks healthy."""
        if self.score(z)["z_dir"] < learn_cutoff:
            self.buf.append(np.asarray(z, dtype=float))
