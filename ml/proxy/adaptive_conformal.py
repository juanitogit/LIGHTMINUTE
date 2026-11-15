"""Exploratory online interval, not a clinical decision rule.

Clipping alpha and finite quantile ranks are practical modifications; the
original adaptive conformal theorem is not asserted for this implementation.
"""
from collections import deque
import math


class AdaptiveConformal:
    def __init__(self, *, alpha=0.05, learning_rate=0.01, window=100, adaptive=True):
        if not 0 < alpha < 1 or learning_rate < 0 or window < 2:
            raise ValueError("invalid conformal parameters")
        self.target = alpha
        self.current = alpha
        self.learning_rate = learning_rate
        self.window = window
        self.adaptive = adaptive
        self.scores = deque(maxlen=window)

    def interval(self, prediction):
        if not math.isfinite(prediction):
            raise ValueError("prediction must be finite")
        if len(self.scores) < self.window:
            return None
        scores = sorted(self.scores)
        rank = min(len(scores), max(1, math.ceil((len(scores) + 1) * (1 - self.current))))
        radius = scores[rank - 1]
        return prediction - radius, prediction + radius

    def observe(self, prediction, value):
        if not math.isfinite(value) or not math.isfinite(prediction):
            raise ValueError("observations must be finite")
        band = self.interval(prediction)
        error = None if band is None else int(not band[0] <= value <= band[1])
        if self.adaptive and error is not None:
            self.current = max(0.001, min(0.5, self.current + self.learning_rate * (self.target - error)))
        self.scores.append(abs(value - prediction))
        return error
