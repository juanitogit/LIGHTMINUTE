"""Tamper-evident hash-chained audit log (who saw/did what, when)."""
from __future__ import annotations

import hashlib
import json
import time


def _h(prev: str, body: dict) -> str:
    return hashlib.sha256((prev + json.dumps(body, sort_keys=True, separators=(",", ":"))).encode()).hexdigest()


class AuditLog:
    def __init__(self):
        self.entries: list[dict] = []

    def append(self, event: str, payload: dict, ts: float | None = None) -> dict:
        prev = self.entries[-1]["hash"] if self.entries else "0" * 64
        body = {"idx": len(self.entries), "ts": ts if ts is not None else time.time(),
                "event": event, "payload": payload}
        e = {**body, "prev": prev, "hash": _h(prev, body)}
        self.entries.append(e)
        return e

    def verify(self) -> int | None:
        """Return index of the first corrupted entry, or None if intact."""
        prev = "0" * 64
        for e in self.entries:
            body = {k: e[k] for k in ("idx", "ts", "event", "payload")}
            if e["prev"] != prev or e["hash"] != _h(prev, body):
                return e["idx"]
            prev = e["hash"]
        return None
