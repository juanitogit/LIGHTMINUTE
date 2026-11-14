"""In-memory LLM statistics for `GET /api/llm-stats` (the validation page shows it).

Counters only: no card text, no crew data, no keys. Process-local by design;
a restart resets them, which is honest for a demo.
"""
from __future__ import annotations

import threading
import time

_LOCK = threading.Lock()
_STATE: dict = {
    "calls": 0,
    "llm_cards": 0,
    "template_cards": 0,
    "verifier_rejections": 0,
    "fallbacks": 0,
    "errors": 0,
    "prompt_tokens": 0,
    "completion_tokens": 0,
    "cache_hit_tokens": 0,
    "started_at": time.time(),
}


def record(*, source: str | None = None, usage: dict | None = None, rejection: bool = False,
           fallback: bool = False, error: str | None = None, calls: int = 0) -> None:
    """Record one event. `source` counts a rendered card; omit it for raw API calls."""
    with _LOCK:
        _STATE["calls"] += int(calls)
        if source == "llm":
            _STATE["llm_cards"] += 1
        elif source == "template":
            _STATE["template_cards"] += 1
        if rejection:
            _STATE["verifier_rejections"] += 1
        if fallback:
            _STATE["fallbacks"] += 1
        if error:
            _STATE["errors"] += 1
        for key in ("prompt_tokens", "completion_tokens", "cache_hit_tokens"):
            _STATE[key] += int((usage or {}).get(key) or 0)


def snapshot() -> dict:
    with _LOCK:
        state = dict(_STATE)
    prompt = state["prompt_tokens"]
    state["cache_hit_ratio"] = round(state["cache_hit_tokens"] / prompt, 3) if prompt else 0.0
    state["uptime_s"] = round(time.time() - state["started_at"], 1)
    return state


def reset() -> None:
    """Tests only."""
    with _LOCK:
        for key in _STATE:
            _STATE[key] = 0
        _STATE["started_at"] = time.time()
